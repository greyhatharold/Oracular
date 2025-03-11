from typing import Optional, Dict, Any, List
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from sqlalchemy import text
import logging
import json
from datetime import datetime
from backend.db.database import Database, DatabaseConfig, db
from backend.db.models import Base
import alembic.config
import os

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database manager for handling database operations and maintenance."""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self.db = db
        
    def initialize_database(self) -> bool:
        """Initialize the database and run migrations."""
        try:
            # Initialize the database connection
            self.db.initialize(self.config)
            
            # Run migrations
            self._run_migrations()
            
            # Verify database connection
            self.check_connection()
            
            return True
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            return False

    def _run_migrations(self) -> None:
        """Run database migrations using Alembic."""
        try:
            alembic_cfg = alembic.config.Config(
                os.path.join(os.path.dirname(__file__), "migrations/alembic.ini")
            )
            alembic_cfg.set_main_option("script_location", 
                os.path.join(os.path.dirname(__file__), "migrations"))
            alembic.command.upgrade(alembic_cfg, "head")
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            raise

    def check_connection(self) -> bool:
        """Check database connection health."""
        try:
            with self.db.session() as session:
                session.execute(text("SELECT 1"))
            return True
        except OperationalError as e:
            logger.error(f"Database connection check failed: {str(e)}")
            return False

    def get_table_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics about database tables."""
        stats = {}
        try:
            with self.db.session() as session:
                for table in Base.metadata.tables:
                    result = session.execute(
                        text(f"SELECT COUNT(*) FROM {table}")
                    ).scalar()
                    stats[table] = {
                        "row_count": result,
                        "last_updated": datetime.utcnow().isoformat()
                    }
        except SQLAlchemyError as e:
            logger.error(f"Failed to get table stats: {str(e)}")
        return stats

    def export_schema(self) -> Dict[str, Any]:
        """Export database schema for frontend consumption."""
        schema = {}
        for table_name, table in Base.metadata.tables.items():
            columns = {}
            for column in table.columns:
                columns[column.name] = {
                    "type": str(column.type),
                    "nullable": column.nullable,
                    "primary_key": column.primary_key,
                    "foreign_key": bool(column.foreign_keys),
                    "default": str(column.default) if column.default else None
                }
            schema[table_name] = {
                "columns": columns,
                "relationships": self._get_relationships(table_name)
            }
        return schema

    def _get_relationships(self, table_name: str) -> Dict[str, List[str]]:
        """Get relationships for a table."""
        relationships = {"many_to_one": [], "one_to_many": [], "many_to_many": []}
        
        table = Base.metadata.tables[table_name]
        
        # Find foreign key relationships
        for fk in table.foreign_keys:
            relationships["many_to_one"].append(fk.column.table.name)
            
        # Find back references
        for other_table in Base.metadata.tables.values():
            for fk in other_table.foreign_keys:
                if fk.column.table.name == table_name:
                    relationships["one_to_many"].append(other_table.name)
                    
        # Find many-to-many relationships
        for assoc_table in Base.metadata.tables.values():
            if len(assoc_table.foreign_keys) == 2:
                fk_tables = [fk.column.table.name for fk in assoc_table.foreign_keys]
                if table_name in fk_tables:
                    other_table = [t for t in fk_tables if t != table_name][0]
                    relationships["many_to_many"].append(other_table)
                    
        return relationships

    def get_connection_info(self) -> Dict[str, Any]:
        """Get database connection information for monitoring."""
        with self.db.session() as session:
            result = session.execute(text("""
                SELECT 
                    numbackends as active_connections,
                    xact_commit as committed_transactions,
                    xact_rollback as rolled_back_transactions,
                    blks_read as blocks_read,
                    blks_hit as blocks_hit,
                    tup_returned as rows_returned,
                    tup_fetched as rows_fetched
                FROM pg_stat_database 
                WHERE datname = current_database()
            """))
            stats = dict(result.fetchone())
            
            # Calculate cache hit ratio
            total_reads = stats['blocks_read'] + stats['blocks_hit']
            stats['cache_hit_ratio'] = (
                stats['blocks_hit'] / total_reads if total_reads > 0 else 0
            )
            
            return stats

    def vacuum_analyze(self, table_name: Optional[str] = None) -> None:
        """Perform VACUUM ANALYZE on the database or specific table."""
        with self.db.engine.connect().execution_options(
            isolation_level="AUTOCOMMIT"
        ) as conn:
            if table_name:
                conn.execute(text(f"VACUUM ANALYZE {table_name}"))
            else:
                conn.execute(text("VACUUM ANALYZE"))

    def create_indexes(self) -> None:
        """Create additional indexes for better query performance."""
        with self.db.session() as session:
            # Add indexes for frequently queried columns
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
                CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
                CREATE INDEX IF NOT EXISTS idx_oracles_name ON oracles (name);
                CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
                CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);
            """))
            session.commit()

    def get_table_sizes(self) -> Dict[str, Dict[str, Any]]:
        """Get size information for all tables."""
        with self.db.session() as session:
            result = session.execute(text("""
                SELECT
                    relname as table_name,
                    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
                    pg_size_pretty(pg_table_size(relid)) as table_size,
                    pg_size_pretty(pg_indexes_size(relid)) as index_size,
                    pg_stat_get_live_tuples(relid) as row_count
                FROM pg_catalog.pg_statio_user_tables
                ORDER BY pg_total_relation_size(relid) DESC;
            """))
            return {row.table_name: dict(row) for row in result}

# Create a global instance
db_manager = DatabaseManager() 