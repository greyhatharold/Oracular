"""
Ethereum blockchain integration service for oracle system.
Handles contract interactions, transaction management, and event monitoring.
"""

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
import time

from eth_account import Account
from eth_account.signers.local import LocalAccount
from eth_typing import Address, BlockNumber, HexStr
from web3 import Web3
from web3.contract import Contract
from web3.exceptions import BlockNotFound, TransactionNotFound
from web3.gas_strategies.time_based import medium_gas_price_strategy
from web3.middleware import construct_sign_and_send_raw_middleware, geth_poa_middleware
from web3.types import TxParams, Wei

from backend.monitoring.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)


class NetworkType(Enum):
    """Supported Ethereum network types."""

    MAINNET = "mainnet"
    TESTNET = "testnet"
    PRIVATE = "private"


@dataclass
class NetworkConfig:
    """Network-specific configuration."""

    rpc_url: str
    chain_id: int
    network_type: NetworkType
    block_time: int
    required_confirmations: int
    max_gas_price: Wei
    priority_fee: Wei


class TransactionStatus(Enum):
    """Transaction lifecycle states."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    STUCK = "stuck"


class EthereumService:
    """
    Manages all Ethereum blockchain interactions for the oracle system.
    Handles contract deployment, transaction management, and event monitoring.
    """

    def __init__(
        self,
        network_config: NetworkConfig,
        private_key: Optional[str] = None,
        max_nonce_cache_age: int = 300,
        gas_price_update_interval: int = 60,
        transaction_timeout: int = 600,
        monitor: Optional[MonitoringService] = None,
    ):
        """
        Initialize the Ethereum service.

        Args:
            network_config: Network-specific configuration
            private_key: Optional private key for transaction signing
            max_nonce_cache_age: Maximum age of nonce cache in seconds
            gas_price_update_interval: Gas price update interval in seconds
            transaction_timeout: Transaction timeout in seconds
            monitor: Monitoring service instance
        """
        self.config = network_config
        self.w3 = self._initialize_web3()
        self.account: Optional[LocalAccount] = None
        self.monitor = monitor
        
        if private_key:
            self.account = Account.from_key(private_key)
            self.w3.middleware_onion.add(
                construct_sign_and_send_raw_middleware(self.account)
            )

        # Transaction management
        self._nonce_lock = asyncio.Lock()
        self._nonce_cache: Dict[Address, Tuple[int, float]] = {}
        self._pending_transactions: Dict[HexStr, TransactionStatus] = {}
        self._gas_price_cache: Optional[Wei] = None
        self._last_gas_update: float = 0

        # Configuration
        self.max_nonce_cache_age = max_nonce_cache_age
        self.gas_price_update_interval = gas_price_update_interval
        self.transaction_timeout = transaction_timeout

        # Initialize monitoring
        if self.monitor:
            self.monitor.record_metric(
                "eth_service_initialized",
                1,
                {
                    "network_type": network_config.network_type.value,
                    "chain_id": str(network_config.chain_id)
                }
            )

        # Start background tasks
        self._start_background_tasks()

    def _initialize_web3(self) -> Web3:
        """Initialize Web3 instance with appropriate middleware."""
        w3 = Web3(Web3.HTTPProvider(self.config.rpc_url))

        # Add PoA middleware for testnets
        if self.config.network_type in (NetworkType.TESTNET, NetworkType.PRIVATE):
            w3.middleware_onion.inject(geth_poa_middleware, layer=0)

        # Set gas price strategy
        w3.eth.set_gas_price_strategy(medium_gas_price_strategy)

        return w3

    def _start_background_tasks(self) -> None:
        """Start background monitoring tasks."""
        asyncio.create_task(self._monitor_pending_transactions())
        asyncio.create_task(self._update_gas_price_loop())

    async def _record_operation_metric(self, operation: str, **labels):
        """Record blockchain operation metrics"""
        if self.monitor:
            metric_labels = {
                "operation": operation,
                "network": self.config.network_type.value,
                "chain_id": str(self.config.chain_id)
            }
            metric_labels.update(labels)
            
            self.monitor.record_metric(
                "blockchain_operation",
                1,
                metric_labels
            )

    async def _record_operation_duration(self, operation: str, start_time: float, **labels):
        """Record operation duration metrics"""
        if self.monitor:
            duration = time.time() - start_time
            metric_labels = {
                "operation": operation,
                "network": self.config.network_type.value,
                "chain_id": str(self.config.chain_id)
            }
            metric_labels.update(labels)
            
            self.monitor.record_metric(
                "blockchain_operation_duration",
                duration,
                metric_labels
            )

    async def deploy_contract(
        self,
        abi: List[Dict[str, Any]],
        bytecode: HexStr,
        constructor_args: Optional[Tuple] = None,
        verify: bool = True,
    ) -> Tuple[Contract, HexStr]:
        """
        Deploy a new contract and optionally verify it.

        Args:
            abi: Contract ABI
            bytecode: Contract bytecode
            constructor_args: Constructor arguments
            verify: Whether to verify contract on block explorer

        Returns:
            Tuple of deployed contract instance and transaction hash
        """
        start_time = time.time()
        try:
            contract, tx_hash = await self._deploy_contract_impl(
                abi, bytecode, constructor_args, verify
            )
            
            await self._record_operation_metric(
                "deploy_contract",
                tx_hash=tx_hash,
                contract_address=contract.address
            )
            await self._record_operation_duration(
                "deploy_contract",
                start_time,
                tx_hash=tx_hash
            )
            
            return contract, tx_hash
        except Exception as e:
            if self.monitor:
                self.monitor.record_metric(
                    "blockchain_operation_error",
                    1,
                    {
                        "operation": "deploy_contract",
                        "error_type": type(e).__name__
                    }
                )
            raise

    async def send_transaction(
        self, transaction: TxParams, retry_count: int = 3
    ) -> HexStr:
        """
        Send a transaction with automatic nonce management and gas price optimization.

        Args:
            transaction: Transaction parameters
            retry_count: Number of retry attempts

        Returns:
            Transaction hash
        """
        start_time = time.time()
        try:
            tx_hash = await self._send_transaction_impl(transaction, retry_count)
            
            await self._record_operation_metric(
                "send_transaction",
                tx_hash=tx_hash
            )
            await self._record_operation_duration(
                "send_transaction",
                start_time,
                tx_hash=tx_hash
            )
            
            if self.monitor:
                self.monitor.record_metric(
                    "gas_price",
                    float(transaction.get("gasPrice", 0)),
                    {"tx_hash": tx_hash}
                )
            
            return tx_hash
        except Exception as e:
            if self.monitor:
                self.monitor.record_metric(
                    "blockchain_operation_error",
                    1,
                    {
                        "operation": "send_transaction",
                        "error_type": type(e).__name__
                    }
                )
            raise

    async def _get_tx_params(self) -> Dict[str, Any]:
        """Get optimized transaction parameters including nonce and gas price."""
        async with self._nonce_lock:
            nonce = await self._get_next_nonce(self.account.address)
            gas_price = await self._get_optimal_gas_price()

            return {
                "from": self.account.address,
                "nonce": nonce,
                "gasPrice": gas_price,
                "chainId": self.config.chain_id,
            }

    async def _get_next_nonce(self, address: Address) -> int:
        """Get next nonce for address with caching."""
        current_time = asyncio.get_event_loop().time()

        # Check cache
        if address in self._nonce_cache:
            cached_nonce, cache_time = self._nonce_cache[address]
            if current_time - cache_time < self.max_nonce_cache_age:
                return cached_nonce

        # Get on-chain nonce
        nonce = await self.w3.eth.get_transaction_count(address, "pending")
        self._nonce_cache[address] = (nonce + 1, current_time)
        return nonce

    async def _get_optimal_gas_price(self) -> Wei:
        """Calculate optimal gas price based on network conditions."""
        current_time = asyncio.get_event_loop().time()

        if (
            self._gas_price_cache is None
            or current_time - self._last_gas_update > self.gas_price_update_interval
        ):
            base_fee = await self.w3.eth.get_block("latest")["baseFeePerGas"]
            suggested_price = await self.w3.eth.generate_gas_price()

            # Calculate optimal price considering base fee and network congestion
            optimal_price = min(
                max(base_fee * 2, suggested_price), self.config.max_gas_price
            )

            self._gas_price_cache = optimal_price
            self._last_gas_update = current_time

        return self._gas_price_cache

    async def _simulate_transaction(self, transaction: TxParams) -> None:
        """Simulate transaction execution to verify it will succeed."""
        try:
            await self.w3.eth.call(transaction)
        except Exception as e:
            raise Exception(f"Transaction simulation failed: {str(e)}")

    async def wait_for_transaction(
        self,
        tx_hash: Union[str, HexStr],
        timeout: Optional[int] = None,
        confirmation_blocks: Optional[int] = None,
    ) -> Any:
        """
        Wait for transaction confirmation with timeout and reorg protection.

        Args:
            tx_hash: Transaction hash
            timeout: Maximum wait time in seconds
            confirmation_blocks: Number of confirmation blocks to wait for

        Returns:
            Transaction receipt
        """
        start_time = time.time()
        try:
            receipt = await self._wait_for_transaction_impl(
                tx_hash, timeout, confirmation_blocks
            )
            
            status = "success" if receipt.status == 1 else "failed"
            await self._record_operation_metric(
                "transaction_confirmation",
                tx_hash=tx_hash,
                status=status,
                block_number=str(receipt.blockNumber)
            )
            await self._record_operation_duration(
                "transaction_confirmation",
                start_time,
                tx_hash=tx_hash
            )
            
            if self.monitor:
                self.monitor.record_metric(
                    "transaction_gas_used",
                    float(receipt.gasUsed),
                    {"tx_hash": tx_hash}
                )
            
            return receipt
        except Exception as e:
            if self.monitor:
                self.monitor.record_metric(
                    "blockchain_operation_error",
                    1,
                    {
                        "operation": "wait_for_transaction",
                        "error_type": type(e).__name__,
                        "tx_hash": tx_hash
                    }
                )
            raise

    async def _monitor_pending_transactions(self) -> None:
        """Monitor and resubmit stuck transactions."""
        while True:
            try:
                current_block = await self.w3.eth.block_number
                
                if self.monitor:
                    self.monitor.record_metric(
                        "current_block_number",
                        float(current_block),
                        {"network": self.config.network_type.value}
                    )
                    
                    self.monitor.record_metric(
                        "pending_transactions",
                        float(len(self._pending_transactions)),
                        {"network": self.config.network_type.value}
                    )

                for tx_hash, status in list(self._pending_transactions.items()):
                    if status == TransactionStatus.PENDING:
                        try:
                            receipt = await self.w3.eth.get_transaction_receipt(tx_hash)
                            if receipt:
                                if receipt.status == 1:
                                    self._pending_transactions[tx_hash] = TransactionStatus.CONFIRMED
                                    if self.monitor:
                                        self.monitor.record_metric(
                                            "transaction_confirmed",
                                            1,
                                            {"tx_hash": tx_hash}
                                        )
                                else:
                                    self._pending_transactions[tx_hash] = TransactionStatus.FAILED
                                    if self.monitor:
                                        self.monitor.record_metric(
                                            "transaction_failed",
                                            1,
                                            {"tx_hash": tx_hash}
                                        )
                            else:
                                # Check if transaction is stuck
                                tx = await self.w3.eth.get_transaction(tx_hash)
                                if tx and current_block - tx.blockNumber > 10:
                                    await self._handle_stuck_transaction(tx_hash)
                                    if self.monitor:
                                        self.monitor.record_metric(
                                            "transaction_stuck",
                                            1,
                                            {"tx_hash": tx_hash}
                                        )
                        except TransactionNotFound:
                            self._pending_transactions[tx_hash] = TransactionStatus.FAILED
                            if self.monitor:
                                self.monitor.record_metric(
                                    "transaction_not_found",
                                    1,
                                    {"tx_hash": tx_hash}
                                )

            except Exception as e:
                logger.error(f"Error monitoring transactions: {str(e)}")
                if self.monitor:
                    self.monitor.record_metric(
                        "monitoring_error",
                        1,
                        {"error_type": type(e).__name__}
                    )

            await asyncio.sleep(60)

    async def _handle_stuck_transaction(self, tx_hash: str) -> None:
        """Handle stuck transaction by resubmitting with higher gas price."""
        try:
            tx = await self.w3.eth.get_transaction(tx_hash)
            if tx:
                # Prepare replacement transaction with higher gas price
                new_gas_price = int(tx["gasPrice"] * 1.2)
                if new_gas_price <= self.config.max_gas_price:
                    replacement_tx = {
                        "from": tx["from"],
                        "to": tx["to"],
                        "value": tx["value"],
                        "data": tx["input"],
                        "nonce": tx["nonce"],
                        "gasPrice": new_gas_price,
                    }

                    # Submit replacement transaction
                    new_tx_hash = await self.send_transaction(replacement_tx)

                    # Update tracking
                    self._pending_transactions[tx_hash] = TransactionStatus.STUCK
                    self._pending_transactions[new_tx_hash] = TransactionStatus.PENDING

        except Exception as e:
            logger.error(f"Error handling stuck transaction: {str(e)}")

    async def _update_gas_price_loop(self) -> None:
        """Periodically update cached gas price."""
        while True:
            try:
                gas_price = await self._get_optimal_gas_price()
                if self.monitor:
                    self.monitor.record_metric(
                        "optimal_gas_price",
                        float(gas_price),
                        {"network": self.config.network_type.value}
                    )
            except Exception as e:
                logger.error(f"Error updating gas price: {str(e)}")
                if self.monitor:
                    self.monitor.record_metric(
                        "gas_price_update_error",
                        1,
                        {"error_type": type(e).__name__}
                    )
            await asyncio.sleep(self.gas_price_update_interval)

    async def _verify_contract(
        self,
        address: str,
        abi: List[Dict[str, Any]],
        bytecode: str,
        constructor_args: Optional[Tuple] = None,
    ) -> None:
        """Verify deployed contract bytecode matches expected."""
        deployed_code = await self.w3.eth.get_code(address)
        expected_code = bytecode

        if constructor_args:
            # Append encoded constructor arguments to bytecode
            constructor_types = [
                input["type"] for input in abi if input.get("type") == "constructor"
            ][0]
            encoded_args = self.w3.eth.contract(abi=abi).encodeParameters(
                constructor_types, constructor_args
            )
            expected_code += encoded_args[2:]  # Remove '0x' prefix

        if deployed_code.hex() != expected_code:
            raise Exception("Deployed bytecode does not match expected bytecode")

    def create_contract(self, address: str, abi: List[Dict[str, Any]]) -> Contract:
        """Create contract instance from existing deployment."""
        return self.w3.eth.contract(address=address, abi=abi)

    async def estimate_gas(self, transaction: TxParams) -> int:
        """Estimate gas cost for transaction."""
        return await self.w3.eth.estimate_gas(transaction)

    def encode_function_data(
        self, contract: Contract, fn_name: str, args: Optional[Tuple] = None
    ) -> HexStr:
        """Encode function call data according to ABI."""
        fn = contract.get_function_by_name(fn_name)
        return fn.encode_input(*(args or ()))

    async def get_events(
        self,
        contract: Contract,
        event_name: str,
        from_block: Optional[BlockNumber] = None,
        to_block: Optional[BlockNumber] = None,
        argument_filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get filtered contract events.

        Args:
            contract: Contract instance
            event_name: Name of event to filter
            from_block: Starting block number
            to_block: Ending block number
            argument_filters: Event argument filters

        Returns:
            List of decoded events
        """
        event = getattr(contract.events, event_name)

        # Create event filter
        event_filter = event.create_filter(
            fromBlock=from_block or "latest",
            toBlock=to_block or "latest",
            argument_filters=argument_filters or {},
        )

        # Get events
        events = await event_filter.get_all_entries()

        # Decode events
        decoded_events = []
        for event in events:
            decoded = dict(event)
            decoded.update(event["args"])
            decoded_events.append(decoded)

        return decoded_events
