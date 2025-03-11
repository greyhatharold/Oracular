"""
Configuration migration and documentation utilities for Oracular.
Provides tools for managing configuration changes across versions
and generating synchronized documentation.
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml
from jinja2 import Environment, FileSystemLoader

from backend.config.config_manager import ConfigSchema

logger = logging.getLogger(__name__)


@dataclass
class Migration:
    """Configuration migration definition"""

    version: str
    description: str
    changes: List[Dict[str, str]]
    created_at: datetime
    author: str


class ConfigMigration:
    """Manages configuration migrations between versions"""

    def __init__(self, migrations_dir: Path):
        self.migrations_dir = migrations_dir
        self.migrations_dir.mkdir(parents=True, exist_ok=True)

    def create_migration(
        self,
        old_config: Dict,
        new_config: Dict,
        version: str,
        description: str,
        author: str,
    ) -> Migration:
        """Create new migration from config differences"""
        changes = self._detect_changes(old_config, new_config)

        migration = Migration(
            version=version,
            description=description,
            changes=changes,
            created_at=datetime.utcnow(),
            author=author,
        )

        self._save_migration(migration)
        return migration

    def apply_migration(
        self, config: Dict, version: str, dry_run: bool = False
    ) -> Tuple[Dict, List[str]]:
        """Apply migration to configuration"""
        migration = self._load_migration(version)
        if not migration:
            raise ValueError(f"Migration not found: {version}")

        new_config = config.copy()
        applied_changes = []

        for change in migration.changes:
            if change["type"] == "add":
                self._apply_add(new_config, change, applied_changes)
            elif change["type"] == "remove":
                self._apply_remove(new_config, change, applied_changes)
            elif change["type"] == "modify":
                self._apply_modify(new_config, change, applied_changes)

        if not dry_run:
            return new_config, applied_changes
        else:
            return config, applied_changes

    def list_migrations(
        self, start_version: Optional[str] = None, end_version: Optional[str] = None
    ) -> List[Migration]:
        """List available migrations"""
        migrations = []
        for path in sorted(self.migrations_dir.glob("*.yaml")):
            migration = self._load_migration(path.stem)
            if migration:
                if (not start_version or migration.version >= start_version) and (
                    not end_version or migration.version <= end_version
                ):
                    migrations.append(migration)
        return migrations

    def _detect_changes(
        self, old_config: Dict, new_config: Dict, path: str = ""
    ) -> List[Dict[str, str]]:
        """Detect changes between configurations"""
        changes = []

        # Detect removed keys
        for key in old_config:
            full_path = f"{path}.{key}" if path else key
            if key not in new_config:
                changes.append(
                    {"type": "remove", "path": full_path, "value": str(old_config[key])}
                )
            elif isinstance(old_config[key], dict) and isinstance(
                new_config[key], dict
            ):
                changes.extend(
                    self._detect_changes(old_config[key], new_config[key], full_path)
                )
            elif old_config[key] != new_config[key]:
                changes.append(
                    {
                        "type": "modify",
                        "path": full_path,
                        "old_value": str(old_config[key]),
                        "new_value": str(new_config[key]),
                    }
                )

        # Detect added keys
        for key in new_config:
            full_path = f"{path}.{key}" if path else key
            if key not in old_config:
                changes.append(
                    {"type": "add", "path": full_path, "value": str(new_config[key])}
                )

        return changes

    def _save_migration(self, migration: Migration) -> None:
        """Save migration to file"""
        path = self.migrations_dir / f"{migration.version}.yaml"
        with open(path, "w") as f:
            yaml.dump(
                {
                    "version": migration.version,
                    "description": migration.description,
                    "changes": migration.changes,
                    "created_at": migration.created_at.isoformat(),
                    "author": migration.author,
                },
                f,
                default_flow_style=False,
            )

    def _load_migration(self, version: str) -> Optional[Migration]:
        """Load migration from file"""
        path = self.migrations_dir / f"{version}.yaml"
        if not path.exists():
            return None

        with open(path) as f:
            data = yaml.safe_load(f)
            return Migration(
                version=data["version"],
                description=data["description"],
                changes=data["changes"],
                created_at=datetime.fromisoformat(data["created_at"]),
                author=data["author"],
            )

    def _apply_add(
        self, config: Dict, change: Dict[str, str], applied: List[str]
    ) -> None:
        """Apply add change"""
        path = change["path"].split(".")
        current = config
        for part in path[:-1]:
            current = current.setdefault(part, {})
        current[path[-1]] = self._parse_value(change["value"])
        applied.append(f"Added {change['path']}")

    def _apply_remove(
        self, config: Dict, change: Dict[str, str], applied: List[str]
    ) -> None:
        """Apply remove change"""
        path = change["path"].split(".")
        current = config
        for part in path[:-1]:
            if part not in current:
                return
            current = current[part]
        if path[-1] in current:
            del current[path[-1]]
            applied.append(f"Removed {change['path']}")

    def _apply_modify(
        self, config: Dict, change: Dict[str, str], applied: List[str]
    ) -> None:
        """Apply modify change"""
        path = change["path"].split(".")
        current = config
        for part in path[:-1]:
            if part not in current:
                return
            current = current[part]
        if path[-1] in current:
            current[path[-1]] = self._parse_value(change["new_value"])
            applied.append(f"Modified {change['path']}")

    def _parse_value(self, value: str) -> any:
        """Parse string value to appropriate type"""
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value


class ConfigDocumentation:
    """Generates configuration documentation"""

    def __init__(self, template_dir: Path):
        self.env = Environment(
            loader=FileSystemLoader(template_dir), trim_blocks=True, lstrip_blocks=True
        )

    def generate_docs(self, output_dir: Path, include_examples: bool = True) -> None:
        """Generate configuration documentation"""
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate main configuration documentation
        self._generate_main_docs(output_dir)

        # Generate environment-specific documentation
        self._generate_environment_docs(output_dir)

        # Generate examples if requested
        if include_examples:
            self._generate_examples(output_dir)

    def _generate_main_docs(self, output_dir: Path) -> None:
        """Generate main configuration documentation"""
        template = self.env.get_template("config.md.j2")
        schema = self._get_schema_docs(ConfigSchema)

        with open(output_dir / "configuration.md", "w") as f:
            f.write(template.render(schema=schema))

    def _generate_environment_docs(self, output_dir: Path) -> None:
        """Generate environment-specific documentation"""
        template = self.env.get_template("environments.md.j2")

        with open(output_dir / "environments.md", "w") as f:
            f.write(template.render(environments=ConfigSchema.Environment))

    def _generate_examples(self, output_dir: Path) -> None:
        """Generate configuration examples"""
        examples_dir = output_dir / "examples"
        examples_dir.mkdir(exist_ok=True)

        # Generate example for each environment
        for env in ConfigSchema.Environment:
            example = self._generate_example_config(env)
            with open(examples_dir / f"{env.value}.yaml", "w") as f:
                yaml.dump(example, f, default_flow_style=False)

    def _get_schema_docs(self, schema: type) -> Dict:
        """Extract documentation from schema"""
        docs = {"description": schema.__doc__, "fields": {}}

        for name, field in schema.__fields__.items():
            field_docs = {
                "description": field.field_info.description,
                "type": str(field.type_),
                "required": field.required,
                "default": field.default if not field.required else None,
            }

            # Handle nested models
            if hasattr(field.type_, "__fields__"):
                field_docs["fields"] = self._get_schema_docs(field.type_)

            docs["fields"][name] = field_docs

        return docs

    def _generate_example_config(self, environment: str) -> Dict:
        """Generate example configuration"""
        example = {
            "environment": environment,
            "network": {
                "rpc_url": "https://example.com/rpc",
                "chain_id": 1,
                "max_gas_price": 100000000000,
            },
            "oracle": {"update_interval": 60, "min_data_points": 3},
            "monitoring": {"metrics_port": 9090, "log_level": "INFO"},
            "security": {"jwt_secret": "***EXAMPLE_SECRET***"},
        }

        return example
