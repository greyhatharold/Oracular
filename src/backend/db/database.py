from contextlib import contextmanager
from typing import Generator, Optional
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError
import os
import logging
from urllib.parse import quote_plus
from datetime import datetime

from backend.monitoring.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Configuration class for database connection parameters."""
    def __init__(
        self,
        host: str = os.getenv('DB_HOST', 'localhost'),
        port: int = int(os.getenv('DB_PORT', 5432)),
        username: str = os.getenv('DB_USER', 'postgres'),
        password: str = os.getenv('DB_PASSWORD', ''),
        database: str = os.getenv('DB_NAME', 'oracular'),
        pool_size: int = int(os.getenv('DB_POOL_SIZE', 5)),
        max_overflow: int = int(os.getenv('DB_MAX_OVERFLOW', 10)),
        pool_timeout: int = int(os.getenv('DB_POOL_TIMEOUT', 30)),
        pool_recycle: int = int(os.getenv('DB_POOL_RECYCLE', 3600)),
        echo: bool = bool(os.getenv('SQL_ECHO', False))
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.database = database
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        self.pool_recycle = pool_recycle
        self.echo = echo

    @property
    def connection_url(self) -> str:
        """Generate database connection URL."""
        return (
            f"postgresql://{self.username}:{quote_plus(self.password)}@"
            f"{self.host}:{self.port}/{self.database}"
        )

class Database:
    """Database management class providing connection and session handling."""
    _instance = None
    _engine: Optional[Engine] = None
    _session_factory: Optional[sessionmaker] = None
    _monitor: Optional[MonitoringService] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance

    def initialize(self, config: DatabaseConfig, monitor: Optional[MonitoringService] = None) -> None:
        """Initialize database connection engine and session factory."""
        if not self._engine:
            self._monitor = monitor
            self._engine = create_engine(
                config.connection_url,
                poolclass=QueuePool,
                pool_size=config.pool_size,
                max_overflow=config.max_overflow,
                pool_timeout=config.pool_timeout,
                pool_recycle=config.pool_recycle,
                pool_pre_ping=True,  # Enable connection health checks
                echo=config.echo
            )

            # Set up event listeners for monitoring
            if self._monitor:
                event.listen(self._engine, 'before_cursor_execute', self._before_cursor_execute)
                event.listen(self._engine, 'after_cursor_execute', self._after_cursor_execute)
                event.listen(self._engine, 'handle_error', self._handle_error)

            self._session_factory = sessionmaker(
                bind=self._engine,
                autocommit=False,
                autoflush=False
            )

            if self._monitor:
                self._monitor.record_metric(
                    "database_initialized",
                    1,
                    {
                        "host": config.host,
                        "database": config.database,
                        "pool_size": config.pool_size
                    }
                )

    @property
    def engine(self) -> Engine:
        """Get the SQLAlchemy engine instance."""
        if not self._engine:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self._engine

    @property
    def session_factory(self) -> sessionmaker:
        """Get the SQLAlchemy session factory."""
        if not self._session_factory:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self._session_factory

    def create_session(self) -> Session:
        """Create a new database session."""
        if self._monitor:
            self._monitor.record_metric("database_session_created", 1)
        return self.session_factory()

    @contextmanager
    def session(self) -> Generator[Session, None, None]:
        """Context manager for database sessions with automatic cleanup."""
        session = self.create_session()
        start_time = datetime.utcnow()
        try:
            yield session
            session.commit()
            if self._monitor:
                duration = (datetime.utcnow() - start_time).total_seconds()
                self._monitor.record_metric(
                    "database_session_duration",
                    duration,
                    {"status": "success"}
                )
        except SQLAlchemyError as e:
            session.rollback()
            if self._monitor:
                self._monitor.record_metric(
                    "database_error",
                    1,
                    {"error_type": type(e).__name__}
                )
            logger.error(f"Database error: {str(e)}")
            raise
        except Exception as e:
            session.rollback()
            if self._monitor:
                self._monitor.record_metric(
                    "database_error",
                    1,
                    {"error_type": type(e).__name__}
                )
            logger.error(f"Unexpected error: {str(e)}")
            raise
        finally:
            session.close()
            if self._monitor:
                self._monitor.record_metric("database_session_closed", 1)

    def dispose(self) -> None:
        """Dispose of the current engine and all its database connections."""
        if self._engine:
            self._engine.dispose()
            self._engine = None
            self._session_factory = None
            if self._monitor:
                self._monitor.record_metric("database_disposed", 1)

    def _before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        """Event listener for query execution start."""
        context._query_start_time = datetime.utcnow()

    def _after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        """Event listener for query execution end."""
        if self._monitor and hasattr(context, '_query_start_time'):
            duration = (datetime.utcnow() - context._query_start_time).total_seconds()
            self._monitor.record_metric(
                "database_query_duration",
                duration,
                {
                    "query_type": statement.split()[0].lower(),
                    "executemany": executemany
                }
            )

    def _handle_error(self, context):
        """Event listener for database errors."""
        if self._monitor:
            self._monitor.record_metric(
                "database_error",
                1,
                {
                    "error_type": type(context.original_exception).__name__,
                    "connection_invalidated": context.is_disconnect
                }
            )

# Global database instance
db = Database()

def init_db(config: Optional[DatabaseConfig] = None, monitor: Optional[MonitoringService] = None) -> None:
    """Initialize the database with optional configuration and monitoring."""
    if config is None:
        config = DatabaseConfig()
    db.initialize(config, monitor)

def get_db() -> Database:
    """Get the global database instance."""
    return db 