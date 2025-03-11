from datetime import datetime
from typing import List, Optional, Any, Dict, Set
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, 
    ForeignKey, JSON, Table, Enum, Index, BigInteger, event
)
from sqlalchemy.orm import relationship, declarative_base, Session, validates
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property
import enum
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

class BaseModel:
    """Base model class with common functionality for all models."""
    
    @declared_attr
    def __tablename__(cls) -> str:
        """Generate table name automatically from class name."""
        return cls.__name__.lower()

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    @classmethod
    def get_by_id(cls, session: Session, id: int) -> Optional['BaseModel']:
        """Get a record by its ID."""
        return session.query(cls).filter(cls.id == id).first()

    @classmethod
    def get_all(cls, session: Session) -> List['BaseModel']:
        """Get all records."""
        return session.query(cls).all()

    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }

    def update(self, session: Session, **kwargs: Any) -> None:
        """Update model instance with given kwargs."""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        session.commit()

    def __repr__(self) -> str:
        """String representation of the model."""
        return f"<{self.__class__.__name__}(id={self.id})>"

Base = declarative_base(cls=BaseModel)

# Association tables
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'))
)

oracle_data_sources = Table(
    'oracle_data_sources',
    Base.metadata,
    Column('oracle_id', Integer, ForeignKey('oracles.id', ondelete='CASCADE')),
    Column('data_source_id', Integer, ForeignKey('data_sources.id', ondelete='CASCADE'))
)

class UserRole(enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"

class DataSourceType(enum.Enum):
    API = "api"
    BLOCKCHAIN = "blockchain"
    DATABASE = "database"
    FILE = "file"

class TaskStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class AlertSeverity(enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class User(Base):
    __tablename__ = 'users'
    
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    audit_logs = relationship('AuditLog', back_populates='user')
    alerts = relationship('Alert', back_populates='user')

    @validates('username')
    def validate_username(self, key: str, username: str) -> str:
        """Validate username."""
        if not username or len(username) < 3:
            raise ValueError("Username must be at least 3 characters long")
        return username

    @validates('email')
    def validate_email(self, key: str, email: str) -> str:
        """Validate email."""
        if not '@' in email:
            raise ValueError("Invalid email address")
        return email

    @hybrid_property
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return any(role.name == UserRole.ADMIN.value for role in self.roles)

    def has_role(self, role_name: str) -> bool:
        """Check if user has specific role."""
        return any(role.name == role_name for role in self.roles)

class Role(Base):
    __tablename__ = 'roles'
    
    name = Column(String(50), unique=True, nullable=False)
    permissions = Column(JSONB)
    
    users = relationship('User', secondary=user_roles, back_populates='roles')

    @validates('permissions')
    def validate_permissions(self, key: str, permissions: Dict) -> Dict:
        """Validate permissions format."""
        if not isinstance(permissions, dict):
            raise ValueError("Permissions must be a dictionary")
        return permissions

class Oracle(Base):
    __tablename__ = 'oracles'
    
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    contract_address = Column(String(42))  # Ethereum address length
    update_frequency = Column(Integer)  # in seconds
    last_updated = Column(DateTime)
    config = Column(JSONB)
    is_active = Column(Boolean, default=True)
    
    validation_rules = relationship('ValidationRule', back_populates='oracle')
    data_sources = relationship('DataSource', secondary=oracle_data_sources)
    price_history = relationship('AssetPrice', back_populates='oracle')
    metrics = relationship('PerformanceMetric', back_populates='oracle')

    @validates('contract_address')
    def validate_contract_address(self, key: str, address: str) -> str:
        """Validate Ethereum address format."""
        if address and (len(address) != 42 or not address.startswith('0x')):
            raise ValueError("Invalid Ethereum address format")
        return address

    @validates('update_frequency')
    def validate_update_frequency(self, key: str, frequency: int) -> int:
        """Validate update frequency."""
        if frequency and frequency < 1:
            raise ValueError("Update frequency must be positive")
        return frequency

class DataSource(Base):
    __tablename__ = 'data_sources'
    
    name = Column(String(100), nullable=False)
    type = Column(Enum(DataSourceType), nullable=False)
    config = Column(JSONB)
    version = Column(String(20))
    is_active = Column(Boolean, default=True)
    
    oracles = relationship('Oracle', secondary=oracle_data_sources)
    metrics = relationship('PerformanceMetric', back_populates='data_source')

    @validates('config')
    def validate_config(self, key: str, config: Dict) -> Dict:
        """Validate configuration format."""
        if not isinstance(config, dict):
            raise ValueError("Config must be a dictionary")
        return config

class ValidationRule(Base):
    __tablename__ = 'validation_rules'
    
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    rule_logic = Column(JSONB, nullable=False)
    oracle_id = Column(Integer, ForeignKey('oracles.id', ondelete='CASCADE'))
    
    oracle = relationship('Oracle', back_populates='validation_rules')

    @validates('rule_logic')
    def validate_rule_logic(self, key: str, logic: Dict) -> Dict:
        """Validate rule logic format."""
        required_keys = {'type', 'parameters'}
        if not isinstance(logic, dict) or not required_keys.issubset(logic.keys()):
            raise ValueError("Invalid rule logic format")
        return logic

class ContractEvent(Base):
    __tablename__ = 'contract_events'
    
    contract_address = Column(String(42), nullable=False)
    event_name = Column(String(100), nullable=False)
    transaction_hash = Column(String(66), nullable=False)  # Ethereum tx hash length
    block_number = Column(BigInteger, nullable=False)
    log_index = Column(Integer, nullable=False)
    event_data = Column(JSONB)
    
    __table_args__ = (
        Index('idx_contract_events_block_log', 'block_number', 'log_index'),
    )

    @validates('transaction_hash')
    def validate_transaction_hash(self, key: str, tx_hash: str) -> str:
        """Validate transaction hash format."""
        if len(tx_hash) != 66 or not tx_hash.startswith('0x'):
            raise ValueError("Invalid transaction hash format")
        return tx_hash

class AssetPrice(Base):
    __tablename__ = 'asset_prices'
    
    oracle_id = Column(Integer, ForeignKey('oracles.id', ondelete='CASCADE'))
    timestamp = Column(DateTime, nullable=False)
    price = Column(Float, nullable=False)
    volume = Column(Float)
    source_data = Column(JSONB)
    
    oracle = relationship('Oracle', back_populates='price_history')
    
    __table_args__ = (
        Index('idx_asset_prices_oracle_time', 'oracle_id', 'timestamp'),
    )

    @validates('price', 'volume')
    def validate_numeric(self, key: str, value: float) -> float:
        """Validate numeric values."""
        if value is not None and value < 0:
            raise ValueError(f"{key} cannot be negative")
        return value

class Task(Base):
    __tablename__ = 'tasks'
    
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    status = Column(Enum(TaskStatus), nullable=False)
    schedule = Column(String(100))  # Cron expression
    last_run = Column(DateTime)
    next_run = Column(DateTime)
    config = Column(JSONB)
    result = Column(JSONB)
    
    __table_args__ = (
        Index('idx_tasks_next_run', 'next_run'),
    )

    @validates('schedule')
    def validate_schedule(self, key: str, schedule: str) -> str:
        """Validate cron expression format."""
        if schedule and len(schedule.split()) not in [5, 6]:
            raise ValueError("Invalid cron expression format")
        return schedule

class Alert(Base):
    __tablename__ = 'alerts'
    
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    severity = Column(Enum(AlertSeverity), nullable=False)
    message = Column(String(500), nullable=False)
    data = Column(JSONB)
    is_read = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime)
    
    user = relationship('User', back_populates='alerts')

    @validates('message')
    def validate_message(self, key: str, message: str) -> str:
        """Validate alert message."""
        if not message or len(message) < 5:
            raise ValueError("Alert message must be at least 5 characters long")
        return message

class PerformanceMetric(Base):
    __tablename__ = 'performance_metrics'
    
    oracle_id = Column(Integer, ForeignKey('oracles.id', ondelete='CASCADE'))
    data_source_id = Column(Integer, ForeignKey('data_sources.id', ondelete='CASCADE'))
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    metadata = Column(JSONB)
    
    oracle = relationship('Oracle', back_populates='metrics')
    data_source = relationship('DataSource', back_populates='metrics')
    
    __table_args__ = (
        Index('idx_performance_metrics_time', 'timestamp'),
    )

    @validates('metric_value')
    def validate_metric_value(self, key: str, value: float) -> float:
        """Validate metric value."""
        if not isinstance(value, (int, float)):
            raise ValueError("Metric value must be numeric")
        return float(value)

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer)
    changes = Column(JSONB)
    
    user = relationship('User', back_populates='audit_logs')
    
    __table_args__ = (
        Index('idx_audit_logs_user_time', 'user_id', 'created_at'),
    )

    @validates('changes')
    def validate_changes(self, key: str, changes: Dict) -> Dict:
        """Validate changes format."""
        if not isinstance(changes, dict):
            raise ValueError("Changes must be a dictionary")
        return changes

# Event listeners for audit logging
@event.listens_for(Session, 'after_flush')
def after_flush(session: Session, context: Any) -> None:
    """Log model changes after flush."""
    for instance in session.new:
        if hasattr(instance, 'to_dict'):
            logger.info(f"Created new {instance.__class__.__name__}: {instance.to_dict()}")

    for instance in session.dirty:
        if hasattr(instance, 'to_dict'):
            logger.info(f"Updated {instance.__class__.__name__}: {instance.to_dict()}")

    for instance in session.deleted:
        if hasattr(instance, 'to_dict'):
            logger.info(f"Deleted {instance.__class__.__name__}: {instance.to_dict()}")

# Create indexes
def create_indexes() -> None:
    """Create additional indexes for better query performance."""
    # These will be created when the tables are created
    pass
