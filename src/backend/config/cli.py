"""
Command-line interface for Oracular configuration management.
Provides tools for configuration validation, migration, and documentation.
"""

import argparse
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

import yaml

from backend.config.config_manager import ConfigManager
from backend.config.config_migration import ConfigMigration, ConfigDocumentation

logger = logging.getLogger(__name__)


def setup_logging(level: str = "INFO"):
    """Setup logging configuration"""
    logging.basicConfig(
        level=level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )


def validate_config(args):
    """Validate configuration file"""
    config_dir = Path(args.config_dir)
    manager = ConfigManager(config_dir)

    try:
        manager.initialize()
        print("Configuration validation successful!")
        return 0
    except Exception as e:
        print(f"Configuration validation failed: {str(e)}")
        return 1


def create_migration(args):
    """Create configuration migration"""
    migrations_dir = Path(args.migrations_dir)
    old_config_path = Path(args.old_config)
    new_config_path = Path(args.new_config)

    try:
        with open(old_config_path) as f:
            old_config = yaml.safe_load(f)
        with open(new_config_path) as f:
            new_config = yaml.safe_load(f)

        migration = ConfigMigration(migrations_dir)
        result = migration.create_migration(
            old_config, new_config, args.version, args.description, args.author
        )

        print(f"Created migration {result.version}")
        print(f"Changes detected: {len(result.changes)}")
        for change in result.changes:
            print(f"- {change['type']}: {change['path']}")
        return 0

    except Exception as e:
        print(f"Failed to create migration: {str(e)}")
        return 1


def apply_migration(args):
    """Apply configuration migration"""
    config_path = Path(args.config)
    migrations_dir = Path(args.migrations_dir)

    try:
        with open(config_path) as f:
            config = yaml.safe_load(f)

        migration = ConfigMigration(migrations_dir)
        new_config, changes = migration.apply_migration(
            config, args.version, args.dry_run
        )

        if not args.dry_run:
            with open(config_path, "w") as f:
                yaml.dump(new_config, f, default_flow_style=False)

        print(f"Applied changes: {len(changes)}")
        for change in changes:
            print(f"- {change}")
        return 0

    except Exception as e:
        print(f"Failed to apply migration: {str(e)}")
        return 1


def generate_docs(args):
    """Generate configuration documentation"""
    config_dir = Path(args.config_dir)
    output_dir = Path(args.output_dir)
    template_dir = Path(__file__).parent / "templates"

    try:
        docs = ConfigDocumentation(template_dir)
        docs.generate_docs(output_dir, args.examples)

        print(f"Generated documentation in {output_dir}")
        return 0

    except Exception as e:
        print(f"Failed to generate documentation: {str(e)}")
        return 1


def export_config(args):
    """Export configuration"""
    config_dir = Path(args.config_dir)
    output_path = Path(args.output)

    try:
        manager = ConfigManager(config_dir)
        manager.initialize()
        manager.export_config(output_path, args.include_secrets)

        print(f"Exported configuration to {output_path}")
        return 0

    except Exception as e:
        print(f"Failed to export configuration: {str(e)}")
        return 1


def import_config(args):
    """Import configuration"""
    config_dir = Path(args.config_dir)
    input_path = Path(args.input)

    try:
        manager = ConfigManager(config_dir)
        manager.import_config(input_path, not args.skip_validation)

        print(f"Imported configuration from {input_path}")
        return 0

    except Exception as e:
        print(f"Failed to import configuration: {str(e)}")
        return 1


def show_audit_log(args):
    """Show configuration audit log"""
    config_dir = Path(args.config_dir)

    try:
        manager = ConfigManager(config_dir)
        manager.initialize()

        start_time = datetime.fromisoformat(args.start) if args.start else None
        end_time = datetime.fromisoformat(args.end) if args.end else None

        logs = manager.get_audit_log(start_time, end_time)

        print(f"Audit log entries: {len(logs)}")
        for log in logs:
            print(f"\nTimestamp: {log.timestamp}")
            print(f"User: {log.user}")
            print(f"Source: {log.source.value}")
            print("Changes:")
            for key, change in log.changes.items():
                print(f"  {key}:")
                print(f"    Old: {change['old']}")
                print(f"    New: {change['new']}")
            if log.reason:
                print(f"Reason: {log.reason}")
        return 0

    except Exception as e:
        print(f"Failed to show audit log: {str(e)}")
        return 1


def main():
    """Main CLI entrypoint"""
    parser = argparse.ArgumentParser(
        description="Oracular configuration management tools"
    )
    subparsers = parser.add_subparsers(dest="command")

    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate configuration")
    validate_parser.add_argument(
        "--config-dir", default="config", help="Configuration directory"
    )

    # Create migration command
    create_parser = subparsers.add_parser(
        "create-migration", help="Create configuration migration"
    )
    create_parser.add_argument(
        "--migrations-dir", default="config/migrations", help="Migrations directory"
    )
    create_parser.add_argument(
        "--old-config", required=True, help="Old configuration file"
    )
    create_parser.add_argument(
        "--new-config", required=True, help="New configuration file"
    )
    create_parser.add_argument("--version", required=True, help="Migration version")
    create_parser.add_argument(
        "--description", required=True, help="Migration description"
    )
    create_parser.add_argument(
        "--author", default=os.getenv("USER", "unknown"), help="Migration author"
    )

    # Apply migration command
    apply_parser = subparsers.add_parser(
        "apply-migration", help="Apply configuration migration"
    )
    apply_parser.add_argument(
        "--config", required=True, help="Configuration file to update"
    )
    apply_parser.add_argument(
        "--migrations-dir", default="config/migrations", help="Migrations directory"
    )
    apply_parser.add_argument(
        "--version", required=True, help="Migration version to apply"
    )
    apply_parser.add_argument(
        "--dry-run", action="store_true", help="Show changes without applying"
    )

    # Generate docs command
    docs_parser = subparsers.add_parser(
        "generate-docs", help="Generate configuration documentation"
    )
    docs_parser.add_argument(
        "--config-dir", default="config", help="Configuration directory"
    )
    docs_parser.add_argument(
        "--output-dir", default="docs/config", help="Output directory"
    )
    docs_parser.add_argument(
        "--examples", action="store_true", help="Include example configurations"
    )

    # Export command
    export_parser = subparsers.add_parser("export", help="Export configuration")
    export_parser.add_argument(
        "--config-dir", default="config", help="Configuration directory"
    )
    export_parser.add_argument("--output", required=True, help="Output file")
    export_parser.add_argument(
        "--include-secrets", action="store_true", help="Include sensitive values"
    )

    # Import command
    import_parser = subparsers.add_parser("import", help="Import configuration")
    import_parser.add_argument(
        "--config-dir", default="config", help="Configuration directory"
    )
    import_parser.add_argument("--input", required=True, help="Input file")
    import_parser.add_argument(
        "--skip-validation", action="store_true", help="Skip validation"
    )

    # Audit log command
    audit_parser = subparsers.add_parser(
        "audit-log", help="Show configuration audit log"
    )
    audit_parser.add_argument(
        "--config-dir", default="config", help="Configuration directory"
    )
    audit_parser.add_argument("--start", help="Start time (ISO format)")
    audit_parser.add_argument("--end", help="End time (ISO format)")

    args = parser.parse_args()

    if args.command == "validate":
        return validate_config(args)
    elif args.command == "create-migration":
        return create_migration(args)
    elif args.command == "apply-migration":
        return apply_migration(args)
    elif args.command == "generate-docs":
        return generate_docs(args)
    elif args.command == "export":
        return export_config(args)
    elif args.command == "import":
        return import_config(args)
    elif args.command == "audit-log":
        return show_audit_log(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
