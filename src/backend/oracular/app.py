"""
Primary application entry point for Oracular.
Coordinates initialization and operation of all system components with
robust lifecycle management, monitoring, and operational control.
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional

import pkg_resources
import psutil
import yaml
from dependency_injector import containers, providers
from dependency_injector.wiring import Provide, inject
from backend.auth.auth_service import AuthService
from backend.blockchain.contract_manager import ContractManager
from backend.blockchain.eth_service import EthereumService, NetworkConfig
from backend.adapters.data_source_adapter import AdapterFactory
from backend.monitoring.monitoring_service import MonitoringService
from backend.scheduler.task_scheduler import TaskScheduler
from backend.services.oracle_service import OracleService
from backend.monitoring.monitoring_service import MonitoringService
from backend.validation.validation_service import ValidationService

logger = logging.getLogger(__name__)

# Version compatibility requirements
REQUIRED_PYTHON_VERSION = (3, 8)
REQUIRED_PACKAGES = {
    "web3": ">=5.0.0",
    "aiohttp": ">=3.7.0",
    "cryptography": ">=3.0",
    "numpy": ">=1.19.0",
    "scipy": ">=1.5.0",
}


@dataclass
class SystemHealth:
    """System health status"""

    cpu_percent: float
    memory_percent: float
    disk_usage_percent: float
    open_files: int
    component_status: Dict[str, bool]
    last_checked: datetime


class Container(containers.DeclarativeContainer):
    """Dependency injection container"""

    config = providers.Configuration()

    # Core services
    performance_monitor = providers.Singleton(  )

    monitoring_service = providers.Singleton(
        MonitoringService, redis_url=config.redis.url, monitor=performance_monitor
    )

    eth_service = providers.Singleton(
        EthereumService,
        network_config=providers.Factory(
            NetworkConfig,
            rpc_url=config.network.rpc_url,
            chain_id=config.network.chain_id,
            network_type=config.network.network_type,
            block_time=config.network.block_time,
            required_confirmations=config.network.required_confirmations,
            max_gas_price=config.network.max_gas_price,
            priority_fee=config.network.priority_fee,
        ),
        private_key=config.network.private_key,
    )

    contract_manager = providers.Singleton(
        ContractManager, eth_service=eth_service, monitor=performance_monitor
    )

    adapter_factory = providers.Singleton(AdapterFactory)

    validation_service = providers.Singleton(
        ValidationService, monitor=performance_monitor
    )

    auth_service = providers.Singleton(
        AuthService,
        redis_url=config.redis.url,
        eth_service=eth_service,
        jwt_secret=config.security.jwt_secret,
        monitor=performance_monitor,
    )

    task_scheduler = providers.Singleton(
        TaskScheduler,
        redis_url=config.redis.url,
        eth_service=eth_service,
        contract_manager=contract_manager,
        adapter_factory=adapter_factory,
        monitor=performance_monitor,
    )

    oracle_service = providers.Singleton(
        OracleService,
        data_sources=config.data_sources,
        validator=validation_service,
        update_interval=config.oracle.update_interval,
    )


class Application:
    """Main application coordinator"""

    def __init__(self):
        self.container = Container()
        self.health_check_interval = 60  # seconds
        self.is_shutting_down = False
        self.startup_time = datetime.utcnow()
        self._health: Optional[SystemHealth] = None
        self._component_init_order = [
            "performance_monitor",
            "monitoring_service",
            "eth_service",
            "contract_manager",
            "adapter_factory",
            "validation_service",
            "auth_service",
            "task_scheduler",
            "oracle_service",
        ]

    async def start(self, config_path: str):
        """
        Start the application.

        Args:
            config_path: Path to configuration file
        """
        try:
            # Verify system prerequisites
            self._verify_prerequisites()

            # Load configuration
            await self._load_config(config_path)

            # Initialize components
            await self._initialize_components()

            # Start health monitoring
            asyncio.create_task(self._health_check_loop())

            # Setup signal handlers
            self._setup_signal_handlers()

            logger.info(
                f"Oracular started successfully. "
                f"Environment: {self.container.config.environment}"
            )

        except Exception as e:
            logger.error(f"Failed to start application: {str(e)}")
            raise

    async def stop(self):
        """Stop the application gracefully"""
        if self.is_shutting_down:
            return

        self.is_shutting_down = True
        logger.info("Shutting down Oracular...")

        # Stop components in reverse order
        for component_name in reversed(self._component_init_order):
            try:
                component = getattr(self.container, component_name)()
                if hasattr(component, "stop"):
                    await component.stop()
                logger.info(f"Stopped {component_name}")
            except Exception as e:
                logger.error(f"Error stopping {component_name}: {str(e)}")

        logger.info("Shutdown complete")

    def _verify_prerequisites(self):
        """Verify system prerequisites"""
        # Check Python version
        if sys.version_info < REQUIRED_PYTHON_VERSION:
            raise RuntimeError(
                f"Python {'.'.join(map(str, REQUIRED_PYTHON_VERSION))} or higher required"
            )

        # Check required packages
        for package, version in REQUIRED_PACKAGES.items():
            try:
                pkg_resources.require(f"{package}{version}")
            except pkg_resources.VersionConflict as e:
                raise RuntimeError(f"Incompatible package version: {str(e)}")
            except pkg_resources.DistributionNotFound:
                raise RuntimeError(f"Required package not found: {package}")

        # Check system resources
        cpu_count = psutil.cpu_count()
        memory = psutil.virtual_memory()
        if cpu_count < 2:
            logger.warning("Recommended minimum 2 CPU cores")
        if memory.total < 4 * 1024 * 1024 * 1024:  # 4GB
            logger.warning("Recommended minimum 4GB RAM")

    async def _load_config(self, config_path: str):
        """Load configuration from file"""
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Configuration file not found: {config_path}")

        # Load configuration
        with open(config_path) as f:
            config = yaml.safe_load(f)

        # Detect environment
        env = os.getenv("ORACULAR_ENV", "development")
        if env not in config:
            raise ValueError(f"Environment '{env}' not found in config")

        # Update container configuration
        self.container.config.from_dict(config[env])

        logger.info(f"Loaded configuration for environment: {env}")

    async def _initialize_components(self):
        """Initialize all components"""
        for component_name in self._component_init_order:
            try:
                logger.info(f"Initializing {component_name}...")
                component = getattr(self.container, component_name)()

                # Initialize component
                if hasattr(component, "initialize"):
                    await component.initialize()

                # Verify component health
                if hasattr(component, "check_health"):
                    health = await component.check_health()
                    if not health:
                        raise RuntimeError(f"{component_name} health check failed")

                logger.info(f"Initialized {component_name}")

            except Exception as e:
                logger.error(f"Failed to initialize {component_name}: {str(e)}")
                raise

    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        loop = asyncio.get_event_loop()

        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(
                sig, lambda s=sig: asyncio.create_task(self._handle_signal(s))
            )

    async def _handle_signal(self, sig: signal.Signals):
        """Handle termination signal"""
        logger.info(f"Received signal {sig.name}")
        await self.stop()

    async def _health_check_loop(self):
        """Periodic health check loop"""
        while not self.is_shutting_down:
            try:
                self._health = await self._check_health()

                # Log warnings for concerning metrics
                if self._health.cpu_percent > 80:
                    logger.warning(f"High CPU usage: {self._health.cpu_percent}%")
                if self._health.memory_percent > 80:
                    logger.warning(f"High memory usage: {self._health.memory_percent}%")
                if self._health.disk_usage_percent > 80:
                    logger.warning(
                        f"High disk usage: {self._health.disk_usage_percent}%"
                    )

                # Check component health
                for component, is_healthy in self._health.component_status.items():
                    if not is_healthy:
                        logger.error(f"Unhealthy component: {component}")

            except Exception as e:
                logger.error(f"Health check error: {str(e)}")

            await asyncio.sleep(self.health_check_interval)

    async def _check_health(self) -> SystemHealth:
        """Check system health"""
        process = psutil.Process()

        # Check component health
        component_status = {}
        for component_name in self._component_init_order:
            component = getattr(self.container, component_name)()
            is_healthy = True

            if hasattr(component, "check_health"):
                try:
                    is_healthy = await component.check_health()
                except Exception:
                    is_healthy = False

            component_status[component_name] = is_healthy

        return SystemHealth(
            cpu_percent=psutil.cpu_percent(),
            memory_percent=process.memory_percent(),
            disk_usage_percent=psutil.disk_usage("/").percent,
            open_files=len(process.open_files()),
            component_status=component_status,
            last_checked=datetime.utcnow(),
        )

    def get_health(self) -> Optional[SystemHealth]:
        """Get latest health check results"""
        return self._health

    def get_uptime(self) -> float:
        """Get application uptime in seconds"""
        return (datetime.utcnow() - self.startup_time).total_seconds()


@inject
def main(config_path: str = Provide["config_path"]):
    """Application entry point"""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
    )

    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Oracular Oracle System")
    parser.add_argument(
        "--config", default=config_path, help="Path to configuration file"
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"Oracular v{pkg_resources.get_distribution('oracular').version}",
    )
    args = parser.parse_args()

    # Create and start application
    app = Application()
    loop = asyncio.get_event_loop()

    try:
        loop.run_until_complete(app.start(args.config))
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        loop.run_until_complete(app.stop())
        loop.close()


if __name__ == "__main__":
    main()
