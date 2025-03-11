from typing import Any, Dict, List, Callable, Tuple, TypeVar, cast, Optional
import asyncio
import logging
import time
from datetime import datetime
from decimal import Decimal
import statistics
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from abc import ABC, abstractmethod

from backend.blockchain.eth_service import EthereumService
from backend.blockchain.contract_manager import ContractManager, ContractType
from backend.monitoring.monitoring_service import MonitoringService

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DataSource(ABC):
    """Abstract base class for data sources"""

    @abstractmethod
    async def fetch_data(self) -> Dict[str, Any]:
        """Fetch data from the source"""
        pass

    @abstractmethod
    def get_reputation_score(self) -> float:
        """Get the current reputation score of this data source"""
        pass


class DataValidator:
    """Validates incoming data against predefined rules"""

    def __init__(self, validation_rules: Dict[str, Dict[str, Any]]):
        self.validation_rules = validation_rules

    def validate(self, data: Dict[str, Any], data_type: str) -> bool:
        """
        Validate data against rules for its type
        Returns True if valid, False otherwise
        """
        if data_type not in self.validation_rules:
            logger.error(f"No validation rules found for data type: {data_type}")
            return False

        rules = self.validation_rules[data_type]

        try:
            if rules.get("type") == "numeric":
                return self._validate_numeric(data, rules)
            elif rules.get("type") == "categorical":
                return self._validate_categorical(data, rules)
            elif rules.get("type") == "binary":
                return self._validate_binary(data, rules)
            else:
                logger.error(f"Unknown validation type: {rules.get('type')}")
                return False
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return False

    def _validate_numeric(self, data: Dict[str, Any], rules: Dict[str, Any]) -> bool:
        value = data.get("value")
        if not isinstance(value, (int, float, Decimal)):
            return False
        return (
            rules.get("min", float("-inf")) <= value <= rules.get("max", float("inf"))
        )

    def _validate_categorical(
        self, data: Dict[str, Any], rules: Dict[str, Any]
    ) -> bool:
        return data.get("value") in rules.get("allowed_values", [])

    def _validate_binary(self, data: Dict[str, Any], rules: Dict[str, Any]) -> bool:
        return isinstance(data.get("value"), bool)


class DataAggregator:
    """Aggregates and processes data from multiple sources"""

    def __init__(self, outlier_threshold: float = 2.0):
        self.outlier_threshold = outlier_threshold

    def aggregate(
        self, data_points: List[Dict[str, Any]], weights: List[float]
    ) -> Dict[str, Any]:
        """
        Aggregate data points using reputation-weighted averaging
        with outlier detection
        """
        if not data_points or not weights or len(data_points) != len(weights):
            raise ValueError("Invalid data points or weights")

        values = [float(d.get("value", 0.0)) for d in data_points]  # Ensure all values are float

        # Detect and remove outliers
        clean_values, clean_weights = self._remove_outliers(values, weights)

        if not clean_values:
            raise ValueError("No valid data points after outlier removal")

        # Calculate weighted average
        weighted_sum = sum(v * w for v, w in zip(clean_values, clean_weights))
        weight_sum = sum(clean_weights)

        return {
            "value": weighted_sum / weight_sum,
            "confidence": self._calculate_confidence(clean_values, clean_weights),
            "num_sources": len(clean_values),
        }

    def _remove_outliers(self, values: List[float], weights: List[float]) -> Tuple[List[float], List[float]]:
        """Remove statistical outliers using z-score method"""
        if len(values) < 2:
            return values, weights

        mean = statistics.mean(values)
        stdev = statistics.stdev(values)

        clean_data = [
            (v, w)
            for v, w in zip(values, weights)
            if abs((v - mean) / stdev) < self.outlier_threshold
        ]

        if not clean_data:
            return [], []
            
        clean_values, clean_weights = zip(*clean_data)
        return list(clean_values), list(clean_weights)

    def _calculate_confidence(self, values: List[float], weights: List[float]) -> float:
        """Calculate confidence score based on data consistency and source reputation"""
        if not values:
            return 0.0

        variance = statistics.variance(values) if len(values) > 1 else 0.0
        avg_weight = sum(weights) / len(weights)

        # Confidence increases with more sources and higher weights
        # Decreases with higher variance
        confidence = (1 / (1 + variance)) * avg_weight * min(1.0, len(values) / 5.0)
        return min(1.0, confidence)


class CircuitBreaker:
    """Implements circuit breaker pattern for data safety"""

    def __init__(self, threshold: int = 3, reset_timeout: int = 300):
        self.threshold = threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.last_failure_time: float = 0.0
        self.is_open = False

    async def execute(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute function with circuit breaker pattern"""
        current_time = time.time()
        if self.is_open:
            if current_time - self.last_failure_time >= self.reset_timeout:
                self.is_open = False
                self.failure_count = 0
            else:
                raise Exception("Circuit breaker is open")

        try:
            result = await func(*args, **kwargs)
            self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = current_time

            if self.failure_count >= self.threshold:
                self.is_open = True
                logger.error(
                    f"Circuit breaker opened due to {self.failure_count} consecutive failures"
                )

            raise e


class OracleService:
    """Main oracle service that orchestrates the data flow pipeline"""

    def __init__(
        self,
        data_sources: List[DataSource],
        validator: DataValidator,
        update_interval: int = 60,
    ):
        self.data_sources = data_sources
        self.validator = validator
        self.aggregator = DataAggregator()
        self.circuit_breaker = CircuitBreaker()
        self.update_interval = update_interval
        self.private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=2048
        )
        self.public_key = self.private_key.public_key()
        self.is_running = False

    async def start(self):
        """Start the oracle service"""
        self.is_running = True
        while self.is_running:
            try:
                await self._update_cycle()
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                logger.error(f"Error in update cycle: {str(e)}")
                await asyncio.sleep(5)  # Brief pause before retry

    async def stop(self):
        """Stop the oracle service"""
        self.is_running = False

    async def _update_cycle(self):
        """Run a single update cycle"""
        # Fetch data from all sources
        raw_data = await self._fetch_all_sources()

        # Validate and filter data
        valid_data = self._validate_data(raw_data)

        if not valid_data:
            logger.warning("No valid data points in update cycle")
            return

        # Aggregate data
        aggregated_data = self.aggregator.aggregate(
            [d["data"] for d in valid_data],
            [d["source"].get_reputation_score() for d in valid_data],
        )

        # Sign the aggregated data
        signed_data = self._sign_data(aggregated_data)

        # Submit to blockchain (implement in derived class)
        await self._submit_to_chain(signed_data)

    async def _fetch_all_sources(self) -> List[Dict[str, Any]]:
        """Fetch data from all sources concurrently"""

        async def fetch_with_circuit_breaker(source: DataSource) -> Dict[str, Any]:
            return await self.circuit_breaker.execute(source.fetch_data)

        tasks = [fetch_with_circuit_breaker(source) for source in self.data_sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        return [
            {"source": source, "data": result}
            for source, result in zip(self.data_sources, results)
            if not isinstance(result, Exception)
        ]

    def _validate_data(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate data from all sources"""
        return [
            data
            for data in raw_data
            if self.validator.validate(
                data["data"], data["data"].get("type", "numeric")
            )
        ]

    def _sign_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sign data with the oracle's private key"""
        data_bytes = str(data).encode()
        signature = self.private_key.sign(
            data_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256(),
        )

        return {
            "data": data,
            "signature": signature,
            "timestamp": datetime.utcnow().isoformat(),
        }

    @abstractmethod
    async def _submit_to_chain(self, signed_data: Dict[str, Any]):
        """
        Submit signed data to blockchain
        To be implemented by derived classes for specific chains
        """
        pass


class EthereumOracleService(OracleService):
    """Ethereum-specific oracle service implementation"""

    def __init__(
        self,
        data_sources: List[DataSource],
        validator: DataValidator,
        eth_service: EthereumService,
        contract_manager: ContractManager,
        update_interval: int = 60,
        monitor: Optional[MonitoringService] = None,
    ):
        super().__init__(data_sources, validator, update_interval)
        self.eth_service = eth_service
        self.contract_manager = contract_manager
        self.monitor = monitor

    async def _submit_to_chain(self, signed_data: Dict[str, Any]):
        """Submit oracle data to Ethereum blockchain"""
        try:
            # Get active oracle contracts
            oracle_contracts = self.contract_manager.registry.get_contracts_by_type(
                ContractType.BASIC_ORACLE
            )

            for contract_metadata in oracle_contracts:
                if not contract_metadata.is_active:
                    continue

                contract = self.contract_manager.get_contract(contract_metadata.contract_id)
                if not contract:
                    logger.warning(
                        f"Contract not found for ID: {contract_metadata.contract_id}"
                    )
                    continue

                # Prepare transaction data
                update_fn = contract.get_function_by_name("updateOracleData")
                tx_data = update_fn.encode_input(
                    signed_data["data"]["value"],
                    signed_data["timestamp"],
                    signed_data["signature"],
                )

                # Estimate gas
                tx = {
                    "to": contract.address,
                    "data": tx_data,
                    "value": 0,
                }
                gas_estimate = await self.eth_service.estimate_gas(tx)

                # Send transaction
                tx["gas"] = int(gas_estimate * 1.2)  # Add 20% buffer
                tx_hash = await self.eth_service.send_transaction(tx)

                # Wait for confirmation
                receipt = await self.eth_service.wait_for_transaction(
                    tx_hash,
                    timeout=300,  # 5 minutes
                    confirmation_blocks=2,
                )

                if receipt.status != 1:
                    raise Exception(f"Transaction failed: {tx_hash}")

                if self.monitor:
                    self.monitor.record_metric(
                        "oracle_update_submitted",
                        1,
                        {
                            "contract_id": str(contract_metadata.contract_id),
                            "tx_hash": tx_hash,
                            "gas_used": receipt.gasUsed,
                        },
                    )

                logger.info(
                    f"Oracle data submitted to contract {contract.address}, "
                    f"tx: {tx_hash}"
                )

        except Exception as e:
            logger.error(f"Error submitting oracle data: {str(e)}")
            if self.monitor:
                self.monitor.record_metric(
                    "oracle_update_failed",
                    1,
                    {"error": str(e)},
                )
            raise