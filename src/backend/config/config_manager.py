"""
Configuration management system for Oracular.
Provides hierarchical configuration with environment-specific settings,
schema validation, secret management, and dynamic updates.
"""

import logging
import os
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union, Type, cast, Callable

import yaml
from cryptography.fernet import Fernet
from jsonschema import ValidationError
from pydantic import BaseModel, Field, model_validator, TypeAdapter
from pydantic.fields import FieldInfo
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

logger = logging.getLogger(__name__)


class Environment(Enum):
    """Supported deployment environments"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    LOCAL = "local"


class ConfigSource(Enum):
    """Configuration data sources"""

    DEFAULT = "default"
    ENV_FILE = "env_file"
    ENVIRONMENT = "environment"
    INSTANCE = "instance"
    OVERRIDE = "override"


@dataclass
class ConfigAuditLog:
    """Audit log entry for configuration changes"""

    timestamp: datetime
    user: str
    source: ConfigSource
    changes: Dict[str, Any]
    reason: Optional[str] = None


class ConfigSchema(BaseModel):
    """Configuration schema definition"""

    class Network(BaseModel):
        """Network configuration"""

        rpc_url: str = Field(..., description="RPC endpoint URL")
        chain_id: int = Field(..., description="Network chain ID")
        block_time: int = Field(default=15, description="Average block time in seconds")
        required_confirmations: int = Field(
            default=12, description="Required block confirmations"
        )
        max_gas_price: int = Field(..., description="Maximum gas price in wei")
        priority_fee: int = Field(default=1500000000, description="Priority fee in wei")

    class Oracle(BaseModel):
        """Oracle service configuration"""

        update_interval: int = Field(
            default=60, description="Update interval in seconds"
        )
        min_data_points: int = Field(
            default=3, description="Minimum required data points"
        )
        outlier_threshold: float = Field(
            default=2.0, description="Outlier detection threshold"
        )
        retry_attempts: int = Field(default=3, description="Number of retry attempts")
        retry_delay: int = Field(
            default=5, description="Delay between retries in seconds"
        )

    class Monitoring(BaseModel):
        """Monitoring configuration"""

        metrics_port: int = Field(default=9090, description="Prometheus metrics port")
        log_level: str = Field(default="INFO", description="Logging level")
        alert_thresholds: Dict[str, float] = Field(
            default_factory=lambda: {
                "source_failure_rate": 0.1,
                "update_delay": 300,
                "gas_price": 100000000000,
            }
        )

    class Security(BaseModel):
        """Security configuration"""

        jwt_secret: str = Field(..., description="JWT signing secret")
        api_key_expiry: int = Field(
            default=2592000, description="API key expiry in seconds"
        )
        session_timeout: int = Field(
            default=3600, description="Session timeout in seconds"
        )
        max_failed_attempts: int = Field(
            default=5, description="Maximum failed login attempts"
        )

    # Main configuration schema
    environment: Environment
    network: Network
    oracle: Oracle
    monitoring: Monitoring
    security: Security
    data_sources: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    contracts: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


class ConfigManager:
    """
    Manages application configuration with environment-specific settings,
    schema validation, and dynamic updates.
    """

    def __init__(
        self,
        config_dir: Union[str, Path],
        environment: Optional[Environment] = None,
        secrets_key: Optional[str] = None,
    ):
        self.config_dir = Path(config_dir)
        self.environment = environment or self._detect_environment()
        self.secrets_key = secrets_key or os.getenv("ORACULAR_SECRETS_KEY")

        # Initialize Fernet for secret encryption
        if self.secrets_key:
            self.cipher = Fernet(self.secrets_key.encode())

        # Configuration state
        self._config: Dict[str, Any] = {}
        self._schema = ConfigSchema
        self._audit_log: List[ConfigAuditLog] = []
        self._dynamic_handlers: Dict[str, Set[Callable[[Any], None]]] = {}

        # File watchers for dynamic updates
        self._observer = Observer()
        self._file_handler = ConfigFileHandler(self._handle_file_change)

    def initialize(self) -> None:
        """Initialize configuration from all sources"""
        try:
            # Load configuration in order of precedence
            self._config = self._load_default_config()
            self._config.update(self._load_environment_config())
            self._config.update(self._load_instance_config())
            self._config.update(self._load_environment_variables())

            # Validate final configuration
            self._validate_config()

            # Start file watchers
            self._start_file_watchers()

            logger.info(
                f"Configuration initialized for environment: {self.environment.value}"
            )

        except Exception as e:
            logger.error(f"Configuration initialization failed: {str(e)}")
            raise

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by key with optional default"""
        try:
            value = self._config
            for part in key.split("."):
                value = value[part]
            return value
        except (KeyError, TypeError):
            return default

    def set(
        self,
        key: str,
        value: Any,
        source: ConfigSource = ConfigSource.OVERRIDE,
        user: str = "system",
        reason: Optional[str] = None,
    ) -> None:
        """Set configuration value with audit logging"""
        try:
            # Validate new value against schema
            schema_path = key.split(".")
            self._validate_value(schema_path, value)

            # Update configuration
            current = self._config
            *parts, last = schema_path
            for part in parts:
                current = current.setdefault(part, {})

            old_value = current.get(last)
            current[last] = value

            # Log change
            self._audit_log.append(
                ConfigAuditLog(
                    timestamp=datetime.utcnow(),
                    user=user,
                    source=source,
                    changes={key: {"old": old_value, "new": value}},
                    reason=reason,
                )
            )

            # Notify subscribers
            self._notify_handlers(key, value)

        except Exception as e:
            logger.error(f"Failed to set configuration {key}: {str(e)}")
            raise

    def subscribe(self, key: str, handler: Callable[[Any], None]) -> None:
        """Subscribe to configuration changes"""
        self._dynamic_handlers.setdefault(key, set()).add(handler)

    def unsubscribe(self, key: str, handler: Callable[[Any], None]) -> None:
        """Unsubscribe from configuration changes"""
        if key in self._dynamic_handlers:
            self._dynamic_handlers[key].discard(handler)

    def export_config(self, path: Path, include_secrets: bool = False) -> None:
        """Export configuration to file"""
        config = self._config.copy()
        if not include_secrets:
            config = self._remove_secrets(config)

        with open(path, "w") as f:
            yaml.dump(config, f, default_flow_style=False)

    def import_config(self, path: Path, validate: bool = True) -> None:
        """Import configuration from file"""
        with open(path) as f:
            config = yaml.safe_load(f)

        if validate:
            self._validate_config(config)

        self._config.update(config)

    def get_audit_log(
        self, start_time: Optional[datetime] = None, end_time: Optional[datetime] = None
    ) -> List[ConfigAuditLog]:
        """Get configuration audit log entries"""
        logs = self._audit_log

        if start_time:
            logs = [log for log in logs if log.timestamp >= start_time]
        if end_time:
            logs = [log for log in logs if log.timestamp <= end_time]

        return logs

    def _detect_environment(self) -> Environment:
        """Detect deployment environment"""
        env = os.getenv("ORACULAR_ENV", "development").lower()
        try:
            return Environment(env)
        except ValueError:
            logger.warning(f"Unknown environment {env}, using development")
            return Environment.DEVELOPMENT

    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        default_path = self.config_dir / "default.yaml"
        return self._load_yaml(default_path)

    def _load_environment_config(self) -> Dict[str, Any]:
        """Load environment-specific configuration"""
        env_path = self.config_dir / f"{self.environment.value}.yaml"
        return self._load_yaml(env_path)

    def _load_instance_config(self) -> Dict[str, Any]:
        """Load instance-specific configuration"""
        instance_path = self.config_dir / "instance.yaml"
        return self._load_yaml(instance_path, required=False)

    def _load_environment_variables(self) -> Dict[str, Any]:
        """Load configuration from environment variables"""
        prefix = "ORACULAR_"
        config: Dict[str, Any] = {}

        for key, value in os.environ.items():
            if key.startswith(prefix):
                path = key[len(prefix) :].lower().split("_")
                current = config
                for part in path[:-1]:
                    current = current.setdefault(part, {})
                current[path[-1]] = value

        return config

    def _load_yaml(self, path: Path, required: bool = True) -> Dict[str, Any]:
        """Load and parse YAML file"""
        try:
            if path.exists():
                with open(path) as f:
                    return yaml.safe_load(f) or {}
            elif required:
                raise FileNotFoundError(f"Required config file not found: {path}")
            return {}
        except Exception as e:
            logger.error(f"Error loading config file {path}: {str(e)}")
            if required:
                raise
            return {}

    def _validate_config(self, config: Optional[Dict[str, Any]] = None) -> None:
        """Validate configuration against schema"""
        try:
            ConfigSchema(**(config or self._config))
        except ValidationError as e:
            raise ValueError(f"Configuration validation failed: {str(e)}")

    def _validate_value(self, path: List[str], value: Any) -> None:
        """Validate single configuration value"""
        schema_cls = cast(Type[BaseModel], self._schema)
        current_schema = schema_cls
        
        for part in path[:-1]:
            if not hasattr(current_schema, part):
                raise ValueError(f"Invalid configuration path: {'.'.join(path)}")
            current_schema = getattr(current_schema, part)
            
        if not hasattr(current_schema, '__fields__'):
            raise ValueError(f"Invalid configuration path: {'.'.join(path)}")
            
        fields = cast(Dict[str, FieldInfo], current_schema.__fields__)
        if path[-1] not in fields:
            raise ValueError(f"Invalid configuration key: {'.'.join(path)}")
            
        field_info = fields[path[-1]]
        type_adapter: TypeAdapter[Any] = TypeAdapter(field_info.annotation)
        type_adapter.validate_python(value)

    def _notify_handlers(self, key: str, value: Any) -> None:
        """Notify configuration change subscribers"""
        handlers = self._dynamic_handlers.get(key, set())
        for handler in handlers:
            try:
                handler(value)
            except Exception as e:
                logger.error(f"Error in config handler: {str(e)}")

    def _start_file_watchers(self) -> None:
        """Start configuration file watchers"""
        self._observer.schedule(self._file_handler, str(self.config_dir), recursive=False)
        self._observer.start()

    def _handle_file_change(self, path: Path) -> None:
        """Handle configuration file changes"""
        try:
            if path.name == f"{self.environment.value}.yaml":
                config = self._load_yaml(path)
                self._validate_config(config)
                self._config.update(config)
                logger.info(f"Reloaded configuration from {path}")
        except Exception as e:
            logger.error(f"Error handling config file change: {str(e)}")

    def _remove_secrets(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive values from configuration"""
        clean_config = config.copy()

        # Define paths to sensitive values
        secret_paths = [
            ["security", "jwt_secret"],
            ["network", "private_key"],
            ["data_sources", "api_keys"],
        ]

        for path in secret_paths:
            current = clean_config
            for part in path[:-1]:
                if part in current:
                    current = current[part]
                else:
                    break
            if path[-1] in current:
                current[path[-1]] = "***REDACTED***"

        return clean_config


class ConfigFileHandler(FileSystemEventHandler):
    """Handles file system events for configuration files"""

    def __init__(self, callback: Callable[[Path], None]):
        self.callback = callback

    def on_modified(self, event) -> None:
        if not event.is_directory:
            self.callback(Path(event.src_path))
