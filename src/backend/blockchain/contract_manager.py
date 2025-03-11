"""
Contract management system for Oracular.
Handles the complete lifecycle of oracle smart contracts including
deployment, upgrades, monitoring, and security analysis.
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import UUID, uuid4

import aiofiles
import solcx
from eth_typing import ChecksumAddress, HexStr
from solidity_parser import parser
from web3.contract import Contract

from backend.monitoring.monitoring_service import MonitoringService
from backend.blockchain.eth_service import EthereumService, NetworkType

logger = logging.getLogger(__name__)


class ContractType(Enum):
    """Types of oracle contracts"""

    BASIC_ORACLE = auto()
    AGGREGATOR = auto()
    PROXY = auto()
    CONSUMER = auto()
    REGISTRY = auto()
    ACCESS_CONTROL = auto()


class ContractState(Enum):
    """Contract lifecycle states"""

    DRAFT = auto()
    COMPILED = auto()
    DEPLOYED = auto()
    VERIFIED = auto()
    ACTIVE = auto()
    DEPRECATED = auto()
    UPGRADED = auto()


class SecuritySeverity(Enum):
    """Security finding severity levels"""

    HIGH = auto()
    MEDIUM = auto()
    LOW = auto()
    INFO = auto()


@dataclass
class ContractTemplate:
    """Contract template with parameters"""

    name: str
    contract_type: ContractType
    source_code: str
    parameters: Dict[str, Any]
    description: str
    example_usage: str
    default_config: Dict[str, Any]


@dataclass
class ContractVersion:
    """Contract version information"""

    version_id: UUID
    contract_id: UUID
    version: str
    source_code: str
    bytecode: HexStr
    abi: List[Dict[str, Any]]
    compiler_version: str
    compiler_settings: Dict[str, Any]
    created_at: datetime
    security_score: float
    audit_report: Optional[str] = None


@dataclass
class SecurityFinding:
    """Security analysis finding"""

    severity: SecuritySeverity
    title: str
    description: str
    line_number: Optional[int]
    recommendation: str


@dataclass
class ContractMetadata:
    """Contract instance metadata"""

    contract_id: UUID
    name: str
    contract_type: ContractType
    network: NetworkType
    address: ChecksumAddress
    current_version: UUID
    admin_address: ChecksumAddress
    created_at: datetime
    last_updated: datetime
    data_sources: List[str]
    update_frequency: int
    min_responses: int
    parameters: Dict[str, Any]
    consumers: Set[ChecksumAddress]


class ContractRegistry:
    """Registry of deployed oracle contracts"""

    def __init__(self):
        self._contracts: Dict[UUID, ContractMetadata] = {}
        self._versions: Dict[UUID, ContractVersion] = {}
        self._templates: Dict[str, ContractTemplate] = {}

    def register_contract(self, metadata: ContractMetadata):
        """Register new contract"""
        self._contracts[metadata.contract_id] = metadata

    def register_version(self, version: ContractVersion):
        """Register new contract version"""
        self._versions[version.version_id] = version

    def get_contract(self, contract_id: UUID) -> Optional[ContractMetadata]:
        """Get contract metadata by ID"""
        return self._contracts.get(contract_id)

    def get_version(self, version_id: UUID) -> Optional[ContractVersion]:
        """Get contract version by ID"""
        return self._versions.get(version_id)

    def get_contracts_by_type(
        self, contract_type: ContractType
    ) -> List[ContractMetadata]:
        """Get all contracts of specified type"""
        return [c for c in self._contracts.values() if c.contract_type == contract_type]

    def get_contracts_by_network(self, network: NetworkType) -> List[ContractMetadata]:
        """Get all contracts on specified network"""
        return [c for c in self._contracts.values() if c.network == network]

    def get_contract_versions(self, contract_id: UUID) -> List[ContractVersion]:
        """Get all versions of a contract"""
        return [v for v in self._versions.values() if v.contract_id == contract_id]

    def register_template(self, template: ContractTemplate):
        """Register contract template"""
        self._templates[template.name] = template

    def get_template(self, name: str) -> Optional[ContractTemplate]:
        """Get contract template by name"""
        return self._templates.get(name)

    def list_templates(self) -> List[ContractTemplate]:
        """List all available templates"""
        return list(self._templates.values())


class ContractManager:
    """Manages oracle contract lifecycle"""

    def __init__(
        self,
        eth_service: EthereumService,
        registry: ContractRegistry,
        monitor: Optional[MonitoringService] = None,
        contracts_dir: str = "contracts",
        artifacts_dir: str = "artifacts",
    ):
        self.eth_service = eth_service
        self.registry = registry
        self.monitor = monitor
        self.contracts_dir = Path(contracts_dir)
        self.artifacts_dir = Path(artifacts_dir)

        # Initialize solc
        solcx.set_solc_version_pragma(">=0.8.0")

        # Load contract templates
        self._load_templates()

        # Initialize monitoring if available
        if self.monitor:
            self.monitor.record_metric(
                "contract_manager_initialized",
                1,
                {"contracts_dir": str(contracts_dir)}
            )

    def _load_templates(self):
        """Load built-in contract templates"""
        templates = [
            ContractTemplate(
                name="BasicOracle",
                contract_type=ContractType.BASIC_ORACLE,
                source_code=self._load_template_source("BasicOracle.sol"),
                parameters={
                    "min_responses": "Minimum number of data sources required",
                    "update_interval": "Update interval in seconds",
                    "deviation_threshold": "Maximum allowed deviation percentage",
                },
                description="Basic oracle contract for single data point reporting",
                example_usage="""
                // Deploy oracle
                BasicOracle oracle = new BasicOracle(
                    3,      // min_responses
                    60,     // update_interval
                    100     // deviation_threshold (1%)
                );
                
                // Get latest value
                (uint256 value, uint256 timestamp) = oracle.getLatestValue();
                """,
                default_config={
                    "min_responses": 3,
                    "update_interval": 60,
                    "deviation_threshold": 100,
                },
            ),
            ContractTemplate(
                name="AggregatorOracle",
                contract_type=ContractType.AGGREGATOR,
                source_code=self._load_template_source("AggregatorOracle.sol"),
                parameters={
                    "sources": "List of source oracle addresses",
                    "aggregation_method": "Method to aggregate values (median/mean)",
                    "heartbeat_period": "Maximum time between updates",
                },
                description="Aggregator contract that combines multiple data sources",
                example_usage="""
                // Deploy aggregator
                address[] memory sources = new address[](3);
                sources[0] = address(oracle1);
                sources[1] = address(oracle2);
                sources[2] = address(oracle3);
                
                AggregatorOracle aggregator = new AggregatorOracle(
                    sources,
                    1,      // AGGREGATION_METHOD.MEDIAN
                    3600    // heartbeat_period
                );
                """,
                default_config={"aggregation_method": 1, "heartbeat_period": 3600},
            ),
        ]

        for template in templates:
            self.registry.register_template(template)

    def _load_template_source(self, filename: str) -> str:
        """Load contract template source code"""
        template_path = self.contracts_dir / "templates" / filename
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {filename}")
        return template_path.read_text()

    async def _record_operation_metric(self, operation: str, contract_id: Optional[UUID] = None, **labels):
        """Record contract operation metrics"""
        if self.monitor:
            metric_labels = {"operation": operation}
            if contract_id:
                metric_labels["contract_id"] = str(contract_id)
            metric_labels.update(labels)
            
            self.monitor.record_metric(
                "contract_operation",
                1,
                metric_labels
            )

    async def _record_operation_duration(self, operation: str, start_time: float, contract_id: Optional[UUID] = None):
        """Record operation duration metrics"""
        if self.monitor:
            duration = datetime.utcnow().timestamp() - start_time
            labels = {"operation": operation}
            if contract_id:
                labels["contract_id"] = str(contract_id)
            
            self.monitor.record_metric(
                "contract_operation_duration",
                duration,
                labels
            )

    async def create_contract(
        self,
        template_name: str,
        parameters: Dict[str, Any],
        network: NetworkType,
        admin_address: ChecksumAddress,
    ) -> Tuple[UUID, str]:
        """Create new contract from template."""
        start_time = datetime.utcnow().timestamp()
        try:
            contract_id, source_code = await self._create_contract_impl(
                template_name, parameters, network, admin_address
            )
            
            await self._record_operation_metric(
                "create_contract",
                contract_id,
                template=template_name,
                network=network.value
            )
            await self._record_operation_duration("create_contract", start_time, contract_id)
            
            return contract_id, source_code
        except Exception as e:
            if self.monitor:
                self.monitor.record_metric(
                    "contract_operation_error",
                    1,
                    {
                        "operation": "create_contract",
                        "error_type": type(e).__name__,
                        "template": template_name
                    }
                )
            raise

    async def _create_contract_impl(
        self,
        template_name: str,
        parameters: Dict[str, Any],
        network: NetworkType,
        admin_address: ChecksumAddress,
    ) -> Tuple[UUID, str]:
        """Implementation of contract creation logic"""
        template = self.registry.get_template(template_name)
        if not template:
            raise ValueError(f"Unknown template: {template_name}")

        # Validate parameters
        for param_name, param_desc in template.parameters.items():
            if param_name not in parameters:
                raise ValueError(f"Missing parameter: {param_name} ({param_desc})")

        # Generate source code from template
        source_code = template.source_code
        for param_name, param_value in parameters.items():
            placeholder = f"{{${param_name}}}"
            source_code = source_code.replace(placeholder, str(param_value))

        # Create contract metadata
        contract_id = uuid4()
        version_id = uuid4()

        metadata = ContractMetadata(
            contract_id=contract_id,
            name=f"{template_name}_{contract_id.hex[:8]}",
            contract_type=template.contract_type,
            network=network,
            address="0x0000000000000000000000000000000000000000",
            current_version=version_id,
            admin_address=admin_address,
            created_at=datetime.utcnow(),
            last_updated=datetime.utcnow(),
            data_sources=[],
            update_frequency=parameters.get("update_interval", 60),
            min_responses=parameters.get("min_responses", 1),
            parameters=parameters,
            consumers=set(),
        )

        self.registry.register_contract(metadata)

        return contract_id, source_code

    async def analyze_security(
        self, source_code: str
    ) -> Tuple[float, List[SecurityFinding]]:
        """
        Perform security analysis on contract code.

        Args:
            source_code: Contract source code

        Returns:
            Tuple of (security_score, findings)
        """
        findings = []

        try:
            # Parse source code
            ast = parser.parse(source_code)

            # Check for common vulnerabilities
            findings.extend(self._check_reentrancy(ast))
            findings.extend(self._check_integer_overflow(ast))
            findings.extend(self._check_access_control(ast))
            findings.extend(self._check_oracle_specific(ast))

            # Calculate security score
            total_weight = sum(f.severity.value for f in findings)
            max_weight = len(findings) * SecuritySeverity.HIGH.value
            security_score = 1.0 - (total_weight / max_weight if max_weight > 0 else 0)

            return security_score, findings

        except Exception as e:
            logger.error(f"Security analysis error: {str(e)}")
            return 0.0, [
                SecurityFinding(
                    severity=SecuritySeverity.HIGH,
                    title="Analysis Failed",
                    description=f"Security analysis failed: {str(e)}",
                    line_number=None,
                    recommendation="Review contract manually",
                )
            ]

    def _check_reentrancy(self, ast: Dict) -> List[SecurityFinding]:
        """Check for reentrancy vulnerabilities"""
        findings = []
        # TODO: Implement reentrancy checks
        return findings

    def _check_integer_overflow(self, ast: Dict) -> List[SecurityFinding]:
        """Check for integer overflow vulnerabilities"""
        findings = []
        # TODO: Implement overflow checks
        return findings

    def _check_access_control(self, ast: Dict) -> List[SecurityFinding]:
        """Check for access control issues"""
        findings = []
        # TODO: Implement access control checks
        return findings

    def _check_oracle_specific(self, ast: Dict) -> List[SecurityFinding]:
        """Check for oracle-specific vulnerabilities"""
        findings = []
        # TODO: Implement oracle-specific checks
        return findings

    async def compile_contract(
        self, contract_id: UUID, source_code: str
    ) -> ContractVersion:
        """Compile contract and create new version."""
        start_time = datetime.utcnow().timestamp()
        try:
            version = await self._compile_contract_impl(contract_id, source_code)
            
            await self._record_operation_metric(
                "compile_contract",
                contract_id,
                version_id=str(version.version_id)
            )
            await self._record_operation_duration("compile_contract", start_time, contract_id)
            
            if self.monitor:
                self.monitor.record_metric(
                    "contract_security_score",
                    version.security_score,
                    {"contract_id": str(contract_id), "version": version.version}
                )
            
            return version
        except Exception as e:
            if self.monitor:
                self.monitor.record_metric(
                    "contract_operation_error",
                    1,
                    {
                        "operation": "compile_contract",
                        "error_type": type(e).__name__,
                        "contract_id": str(contract_id)
                    }
                )
            raise

    async def _compile_contract_impl(
        self, contract_id: UUID, source_code: str
    ) -> ContractVersion:
        """Implementation of contract compilation logic"""
        # Compile contract
        compilation_output = solcx.compile_source(
            source_code, output_values=["abi", "bin"], optimize=True, optimize_runs=200
        )

        contract_interface = compilation_output["<stdin>:Oracle"]

        # Perform security analysis
        security_score, findings = await self.analyze_security(source_code)

        # Create version
        version = ContractVersion(
            version_id=uuid4(),
            contract_id=contract_id,
            version=datetime.utcnow().strftime("%Y%m%d%H%M%S"),
            source_code=source_code,
            bytecode=contract_interface["bin"],
            abi=contract_interface["abi"],
            compiler_version=solcx.get_solc_version().version,
            compiler_settings={"optimizer": {"enabled": True, "runs": 200}},
            created_at=datetime.utcnow(),
            security_score=security_score,
        )

        self.registry.register_version(version)

        # Save artifacts
        await self._save_artifacts(version)

        return version

    async def _save_artifacts(self, version: ContractVersion):
        """Save contract artifacts to disk"""
        version_dir = self.artifacts_dir / str(version.contract_id) / version.version
        version_dir.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(version_dir / "metadata.json", "w") as f:
            await f.write(
                json.dumps(
                    {
                        "version_id": str(version.version_id),
                        "contract_id": str(version.contract_id),
                        "version": version.version,
                        "compiler_version": version.compiler_version,
                        "compiler_settings": version.compiler_settings,
                        "created_at": version.created_at.isoformat(),
                        "security_score": version.security_score,
                    },
                    indent=2,
                )
            )

        async with aiofiles.open(version_dir / "Oracle.sol", "w") as f:
            await f.write(version.source_code)

        async with aiofiles.open(version_dir / "abi.json", "w") as f:
            await f.write(json.dumps(version.abi, indent=2))

        async with aiofiles.open(version_dir / "bytecode.txt", "w") as f:
            await f.write(version.bytecode)

    async def deploy_contract(
        self, contract_id: UUID, version_id: UUID, constructor_args: List[Any]
    ) -> ChecksumAddress:
        """Deploy contract to network."""
        start_time = datetime.utcnow().timestamp()
        try:
            address = await self._deploy_contract_impl(
                contract_id, version_id, constructor_args
            )
            
            await self._record_operation_metric(
                "deploy_contract",
                contract_id,
                version_id=str(version_id),
                address=address
            )
            await self._record_operation_duration("deploy_contract", start_time, contract_id)
            
            return address
        except Exception as e:
            if self.monitor:
                self.monitor.record_metric(
                    "contract_operation_error",
                    1,
                    {
                        "operation": "deploy_contract",
                        "error_type": type(e).__name__,
                        "contract_id": str(contract_id),
                        "version_id": str(version_id)
                    }
                )
            raise

    async def _deploy_contract_impl(
        self, contract_id: UUID, version_id: UUID, constructor_args: List[Any]
    ) -> ChecksumAddress:
        """Implementation of contract deployment logic"""
        metadata = self.registry.get_contract(contract_id)
        version = self.registry.get_version(version_id)

        if not metadata or not version:
            raise ValueError("Invalid contract or version ID")

        # Deploy contract
        contract, tx_hash = await self.eth_service.deploy_contract(
            abi=version.abi,
            bytecode=version.bytecode,
            constructor_args=constructor_args,
        )

        # Update metadata
        metadata.address = contract.address
        metadata.last_updated = datetime.utcnow()

        return contract.address

    async def upgrade_contract(self, contract_id: UUID, new_version_id: UUID) -> bool:
        """
        Upgrade contract to new version.

        Args:
            contract_id: Contract ID
            new_version_id: New version ID

        Returns:
            Success status
        """
        metadata = self.registry.get_contract(contract_id)
        new_version = self.registry.get_version(new_version_id)

        if not metadata or not new_version:
            raise ValueError("Invalid contract or version ID")

        # TODO: Implement upgrade logic using proxy pattern
        return True

    async def monitor_contract(self, contract_id: UUID) -> Dict[str, Any]:
        """Get contract monitoring metrics."""
        start_time = datetime.utcnow().timestamp()
        try:
            metrics = await self._monitor_contract_impl(contract_id)
            
            # Record all contract metrics
            if self.monitor:
                for metric_name, value in metrics.items():
                    self.monitor.record_metric(
                        f"contract_{metric_name}",
                        float(value),
                        {"contract_id": str(contract_id)}
                    )
            
            await self._record_operation_duration("monitor_contract", start_time, contract_id)
            return metrics
        except Exception as e:
            if self.monitor:
                self.monitor.record_metric(
                    "contract_operation_error",
                    1,
                    {
                        "operation": "monitor_contract",
                        "error_type": type(e).__name__,
                        "contract_id": str(contract_id)
                    }
                )
            raise

    async def _monitor_contract_impl(self, contract_id: UUID) -> Dict[str, Any]:
        """Implementation of contract monitoring logic"""
        metadata = self.registry.get_contract(contract_id)
        if not metadata:
            raise ValueError("Invalid contract ID")

        contract = self.eth_service.create_contract(
            metadata.address, self.registry.get_version(metadata.current_version).abi
        )

        # Collect metrics
        metrics = {
            "last_update": await contract.functions.lastUpdateTime().call(),
            "total_updates": await contract.functions.updateCount().call(),
            "current_value": await contract.functions.latestAnswer().call(),
            "num_sources": len(metadata.data_sources),
            "active_sources": await contract.functions.activeSourceCount().call(),
            "total_consumers": len(metadata.consumers),
            "gas_used_last_update": await self._get_last_update_gas(contract),
        }

        return metrics

    async def _get_last_update_gas(self, contract: Contract) -> int:
        """Get gas used in last update"""
        # TODO: Implement gas usage tracking
        return 0

    async def add_consumer(self, contract_id: UUID, consumer_address: ChecksumAddress):
        """Register new contract consumer"""
        metadata = self.registry.get_contract(contract_id)
        if not metadata:
            raise ValueError("Invalid contract ID")

        metadata.consumers.add(consumer_address)

    async def remove_consumer(
        self, contract_id: UUID, consumer_address: ChecksumAddress
    ):
        """Remove contract consumer"""
        metadata = self.registry.get_contract(contract_id)
        if not metadata:
            raise ValueError("Invalid contract ID")

        metadata.consumers.discard(consumer_address)

    def get_integration_example(
        self, contract_id: UUID, language: str = "solidity"
    ) -> str:
        """
        Get integration example code.

        Args:
            contract_id: Contract ID
            language: Target language

        Returns:
            Example code
        """
        metadata = self.registry.get_contract(contract_id)
        version = self.registry.get_version(metadata.current_version)

        if language == "solidity":
            return """
            // SPDX-License-Identifier: MIT
            pragma solidity ^0.8.0;
            
            interface IOracle {
                function getLatestValue() external view returns (uint256 value, uint256 timestamp);
                function getValue(uint256 roundId) external view returns (uint256 value, uint256 timestamp);
            }
            
            contract Consumer {
                IOracle public oracle;
                
                constructor(address _oracle) {
                    oracle = IOracle(_oracle);
                }
                
                function getOracleValue() external view returns (uint256 value, uint256 timestamp) {
                    return oracle.getLatestValue();
                }
            }
            """
        else:
            raise ValueError(f"Unsupported language: {language}")
