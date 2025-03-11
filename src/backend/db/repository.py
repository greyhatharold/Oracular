from typing import TypeVar, Generic, Type, List, Optional, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete
from backend.db.database import db
from backend.db.models import (
    BaseModel, User, Oracle, DataSource, Task, Role, Alert,
    ContractEvent, AssetPrice, PerformanceMetric, AuditLog,
    ValidationRule, UserRole
)

T = TypeVar('T', bound=BaseModel)

class Repository(Generic[T]):
    """Generic repository pattern implementation for database operations."""

    def __init__(self, model: Type[T]):
        self.model = model
        self.db = db

    def create(self, session: Session, **kwargs: Any) -> T:
        """Create a new record."""
        instance = self.model(**kwargs)
        session.add(instance)
        session.commit()
        return instance

    def get(self, session: Session, id: int) -> Optional[T]:
        """Get a record by ID."""
        return session.get(self.model, id)

    def get_all(self, session: Session) -> List[T]:
        """Get all records."""
        return session.execute(select(self.model)).scalars().all()

    def update(self, session: Session, id: int, **kwargs: Any) -> Optional[T]:
        """Update a record by ID."""
        instance = self.get(session, id)
        if instance:
            for key, value in kwargs.items():
                setattr(instance, key, value)
            session.commit()
        return instance

    def delete(self, session: Session, id: int) -> bool:
        """Delete a record by ID."""
        instance = self.get(session, id)
        if instance:
            session.delete(instance)
            session.commit()
            return True
        return False

    def filter_by(self, session: Session, **kwargs: Any) -> List[T]:
        """Get records matching the given criteria."""
        return session.query(self.model).filter_by(**kwargs).all()

    def exists(self, session: Session, **kwargs: Any) -> bool:
        """Check if a record exists with the given criteria."""
        return session.query(
            session.query(self.model).filter_by(**kwargs).exists()
        ).scalar()

    def count(self, session: Session) -> int:
        """Get the total count of records."""
        return session.query(self.model).count()

    def bulk_create(self, session: Session, items: List[Dict[str, Any]]) -> List[T]:
        """Create multiple records at once."""
        instances = [self.model(**item) for item in items]
        session.bulk_save_objects(instances)
        session.commit()
        return instances

    def bulk_update(self, session: Session, items: List[Dict[str, Any]]) -> None:
        """Update multiple records at once."""
        stmt = update(self.model)
        session.execute(stmt, items)
        session.commit()

    def bulk_delete(self, session: Session, ids: List[int]) -> None:
        """Delete multiple records by their IDs."""
        stmt = delete(self.model).where(self.model.id.in_(ids))
        session.execute(stmt)
        session.commit()

class UserRepository(Repository[User]):
    """Repository for User model operations."""
    def __init__(self):
        super().__init__(User)

    def get_by_username(self, session: Session, username: str) -> Optional[User]:
        """Get a user by username."""
        return session.query(User).filter(User.username == username).first()

    def get_active_users(self, session: Session) -> List[User]:
        """Get all active users."""
        return session.query(User).filter(User.is_active == True).all()

    def get_by_email(self, session: Session, email: str) -> Optional[User]:
        """Get a user by email."""
        return session.query(User).filter(User.email == email).first()

    def get_by_role(self, session: Session, role_name: str) -> List[User]:
        """Get users by role name."""
        return session.query(User).join(User.roles).filter(Role.name == role_name).all()

class OracleRepository(Repository[Oracle]):
    """Repository for Oracle model operations."""
    def __init__(self):
        super().__init__(Oracle)

    def get_active_oracles(self, session: Session) -> List[Oracle]:
        """Get all active oracles."""
        return session.query(Oracle).filter(Oracle.is_active == True).all()

    def get_by_contract_address(self, session: Session, address: str) -> Optional[Oracle]:
        """Get oracle by contract address."""
        return session.query(Oracle).filter(Oracle.contract_address == address).first()

    def get_with_data_sources(self, session: Session, oracle_id: int) -> Optional[Oracle]:
        """Get oracle with its data sources."""
        return session.query(Oracle).options(
            joinedload(Oracle.data_sources)
        ).filter(Oracle.id == oracle_id).first()

class DataSourceRepository(Repository[DataSource]):
    """Repository for DataSource model operations."""
    def __init__(self):
        super().__init__(DataSource)

    def get_by_type(self, session: Session, source_type: str) -> List[DataSource]:
        """Get data sources by type."""
        return session.query(DataSource).filter(DataSource.type == source_type).all()

    def get_active_by_type(self, session: Session, source_type: str) -> List[DataSource]:
        """Get active data sources by type."""
        return session.query(DataSource).filter(
            DataSource.type == source_type,
            DataSource.is_active == True
        ).all()

class TaskRepository(Repository[Task]):
    """Repository for Task model operations."""
    def __init__(self):
        super().__init__(Task)

    def get_pending_tasks(self, session: Session) -> List[Task]:
        """Get all pending tasks."""
        return session.query(Task).filter(Task.status == 'pending').all()

    def get_tasks_by_type(self, session: Session, task_type: str) -> List[Task]:
        """Get tasks by type."""
        return session.query(Task).filter(Task.type == task_type).all()

    def get_scheduled_tasks(self, session: Session) -> List[Task]:
        """Get tasks with scheduled execution."""
        return session.query(Task).filter(Task.next_run != None).order_by(Task.next_run).all()

class RoleRepository(Repository[Role]):
    """Repository for Role model operations."""
    def __init__(self):
        super().__init__(Role)

    def get_by_name(self, session: Session, name: str) -> Optional[Role]:
        """Get role by name."""
        return session.query(Role).filter(Role.name == name).first()

class AlertRepository(Repository[Alert]):
    """Repository for Alert model operations."""
    def __init__(self):
        super().__init__(Alert)

    def get_unread_alerts(self, session: Session, user_id: int) -> List[Alert]:
        """Get unread alerts for user."""
        return session.query(Alert).filter(
            Alert.user_id == user_id,
            Alert.is_read == False
        ).all()

class ContractEventRepository(Repository[ContractEvent]):
    """Repository for ContractEvent model operations."""
    def __init__(self):
        super().__init__(ContractEvent)

    def get_by_contract(self, session: Session, address: str) -> List[ContractEvent]:
        """Get events for contract."""
        return session.query(ContractEvent).filter(
            ContractEvent.contract_address == address
        ).order_by(ContractEvent.block_number, ContractEvent.log_index).all()

class AssetPriceRepository(Repository[AssetPrice]):
    """Repository for AssetPrice model operations."""
    def __init__(self):
        super().__init__(AssetPrice)

    def get_price_history(
        self, session: Session, oracle_id: int, limit: int = 100
    ) -> List[AssetPrice]:
        """Get price history for oracle."""
        return session.query(AssetPrice).filter(
            AssetPrice.oracle_id == oracle_id
        ).order_by(AssetPrice.timestamp.desc()).limit(limit).all()

class PerformanceMetricRepository(Repository[PerformanceMetric]):
    """Repository for PerformanceMetric model operations."""
    def __init__(self):
        super().__init__(PerformanceMetric)

    def get_metrics_by_name(
        self, session: Session, metric_name: str, limit: int = 100
    ) -> List[PerformanceMetric]:
        """Get metrics by name."""
        return session.query(PerformanceMetric).filter(
            PerformanceMetric.metric_name == metric_name
        ).order_by(PerformanceMetric.timestamp.desc()).limit(limit).all()

class ValidationRuleRepository(Repository[ValidationRule]):
    """Repository for ValidationRule model operations."""
    def __init__(self):
        super().__init__(ValidationRule)

    def get_rules_by_oracle(self, session: Session, oracle_id: int) -> List[ValidationRule]:
        """Get validation rules for oracle."""
        return session.query(ValidationRule).filter(
            ValidationRule.oracle_id == oracle_id
        ).all()

class AuditLogRepository(Repository[AuditLog]):
    """Repository for AuditLog model operations."""
    def __init__(self):
        super().__init__(AuditLog)

    def get_user_audit_logs(
        self, session: Session, user_id: int, limit: int = 100
    ) -> List[AuditLog]:
        """Get audit logs for user."""
        return session.query(AuditLog).filter(
            AuditLog.user_id == user_id
        ).order_by(AuditLog.created_at.desc()).limit(limit).all()

# Create repository instances
user_repository = UserRepository()
oracle_repository = OracleRepository()
data_source_repository = DataSourceRepository()
task_repository = TaskRepository()
role_repository = RoleRepository()
alert_repository = AlertRepository()
contract_event_repository = ContractEventRepository()
asset_price_repository = AssetPriceRepository()
performance_metric_repository = PerformanceMetricRepository()
validation_rule_repository = ValidationRuleRepository()
audit_log_repository = AuditLogRepository() 