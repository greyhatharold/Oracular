"""
Data source adapter system for Oracular.
Provides a flexible interface for connecting to diverse external data sources
with consistent validation, normalization, and security patterns.
"""

import asyncio
import json
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Type
from urllib.parse import urlparse

import aiohttp
import aiomysql
import websockets
from aiohttp import ClientSession, ClientTimeout
import numpy as np

from backend.monitoring.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)


@dataclass
class AdapterConfig:
    """Configuration for data source adapters"""

    source_id: str
    source_type: str
    endpoint: str
    auth_config: Optional[Dict[str, Any]] = None
    rate_limit: Optional[Dict[str, int]] = None
    cache_ttl: int = 60
    timeout: int = 30
    retry_config: Dict[str, Any] = None
    validation_rules: Dict[str, Any] = None
    normalization_rules: Dict[str, Any] = None


class RateLimiter:
    """Rate limiting implementation for API calls"""

    def __init__(self, calls: int, period: int):
        self.calls = calls
        self.period = period
        self.timestamps: List[float] = []
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Acquire permission to make an API call"""
        async with self._lock:
            now = time.time()
            # Remove timestamps outside the window
            self.timestamps = [ts for ts in self.timestamps if now - ts <= self.period]

            if len(self.timestamps) >= self.calls:
                sleep_time = self.timestamps[0] + self.period - now
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)

            self.timestamps.append(now)


class CacheManager:
    """Manages caching of source data"""

    def __init__(self, ttl: int):
        self.ttl = ttl
        self.cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Get cached data if not expired"""
        async with self._lock:
            if key in self.cache:
                entry = self.cache[key]
                if time.time() - entry["timestamp"] < self.ttl:
                    return entry["data"]
                del self.cache[key]
        return None

    async def set(self, key: str, data: Any):
        """Cache data with timestamp"""
        async with self._lock:
            self.cache[key] = {"data": data, "timestamp": time.time()}


class AuthHandler:
    """Handles various authentication methods"""

    def __init__(self, auth_config: Dict[str, Any]):
        self.auth_config = auth_config
        self.token_cache: Dict[str, Dict[str, Any]] = {}

    async def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers based on config"""
        auth_type = self.auth_config.get("type", "none")

        if auth_type == "api_key":
            return {self.auth_config["header_name"]: self.auth_config["api_key"]}
        elif auth_type == "oauth2":
            token = await self._get_oauth_token()
            return {"Authorization": f"Bearer {token}"}
        elif auth_type == "client_cert":
            # Client cert auth is handled at connection level
            return {}

        return {}

    async def _get_oauth_token(self) -> str:
        """Get or refresh OAuth token"""
        now = time.time()
        cache_key = self.auth_config["client_id"]

        if cache_key in self.token_cache:
            token_data = self.token_cache[cache_key]
            if token_data["expires_at"] - now > 300:  # 5 min buffer
                return token_data["access_token"]

        async with aiohttp.ClientSession() as session:
            token_url = self.auth_config["token_url"]
            data = {
                "grant_type": "client_credentials",
                "client_id": self.auth_config["client_id"],
                "client_secret": self.auth_config["client_secret"],
                "scope": self.auth_config.get("scope", ""),
            }

            async with session.post(token_url, data=data) as resp:
                if resp.status != 200:
                    raise Exception(f"OAuth token request failed: {await resp.text()}")

                token_data = await resp.json()
                self.token_cache[cache_key] = {
                    "access_token": token_data["access_token"],
                    "expires_at": now + token_data["expires_in"],
                }
                return token_data["access_token"]


class BaseAdapter(ABC):
    """Base class for all data source adapters"""

    def __init__(
        self, config: AdapterConfig, monitor: Optional[MonitoringService] = None
    ):
        self.config = config
        self.monitor = monitor
        self.auth_handler = (
            AuthHandler(config.auth_config) if config.auth_config else None
        )
        self.rate_limiter = (
            RateLimiter(**config.rate_limit) if config.rate_limit else None
        )
        self.cache = CacheManager(config.cache_ttl)

        # Initialize retry configuration
        self.retry_config = {
            "max_attempts": 3,
            "backoff_factor": 2,
            "initial_delay": 1,
            **(config.retry_config or {}),
        }

        # Initialize monitoring metrics
        if self.monitor:
            self.monitor.record_metric(
                f"adapter_initialized_{self.config.source_type}",
                1,
                {"source_id": self.config.source_id}
            )

    async def _record_latency(self, start_time: float, operation: str):
        """Record operation latency if monitoring is enabled"""
        if self.monitor:
            latency = time.time() - start_time
            self.monitor.record_metric(
                "source_latency",
                latency,
                {
                    "source_id": self.config.source_id,
                    "operation": operation,
                    "source_type": self.config.source_type
                }
            )

    async def _record_error(self, error_type: str, error_msg: str):
        """Record error metrics if monitoring is enabled"""
        if self.monitor:
            self.monitor.record_metric(
                "source_errors",
                1,
                {
                    "source_id": self.config.source_id,
                    "error_type": error_type,
                    "source_type": self.config.source_type
                }
            )
            logger.error(f"Data source error - {self.config.source_id}: {error_msg}")

    async def _record_data_point(self, data: Dict[str, Any]):
        """Record data point metrics if monitoring is enabled"""
        if self.monitor and isinstance(data.get("value"), (int, float)):
            self.monitor.record_metric(
                "source_value",
                float(data["value"]),
                {
                    "source_id": self.config.source_id,
                    "source_type": self.config.source_type
                }
            )

    @abstractmethod
    async def connect(self):
        """Establish connection to data source"""
        start_time = time.time()
        try:
            await self._connect_impl()
            await self._record_latency(start_time, "connect")
        except Exception as e:
            await self._record_error("connection", str(e))
            raise

    @abstractmethod
    async def _connect_impl(self):
        """Implementation of connection logic"""
        pass

    @abstractmethod
    async def disconnect(self):
        """Close connection to data source"""
        start_time = time.time()
        try:
            await self._disconnect_impl()
            await self._record_latency(start_time, "disconnect")
        except Exception as e:
            await self._record_error("disconnect", str(e))
            raise

    @abstractmethod
    async def _disconnect_impl(self):
        """Implementation of disconnection logic"""
        pass

    @abstractmethod
    async def fetch_data(self) -> Dict[str, Any]:
        """Fetch data from the source"""
        start_time = time.time()
        try:
            data = await self._fetch_data_impl()
            await self._record_latency(start_time, "fetch")
            await self._record_data_point(data)
            return data
        except Exception as e:
            await self._record_error("fetch", str(e))
            raise

    @abstractmethod
    async def _fetch_data_impl(self) -> Dict[str, Any]:
        """Implementation of data fetching logic"""
        pass

    async def _handle_request(self, request_func: callable) -> Any:
        """Handle request with retries and rate limiting"""
        if self.rate_limiter:
            await self.rate_limiter.acquire()

        attempt = 0
        delay = self.retry_config["initial_delay"]

        while attempt < self.retry_config["max_attempts"]:
            try:
                return await request_func()
            except Exception as e:
                attempt += 1
                if attempt == self.retry_config["max_attempts"]:
                    if self.monitor:
                        self.monitor.record_source_error(
                            self.config.source_id, str(type(e).__name__)
                        )
                    raise

                await asyncio.sleep(delay)
                delay *= self.retry_config["backoff_factor"]

    def _validate_data(self, data: Dict[str, Any]) -> bool:
        """Validate data against rules"""
        if not self.config.validation_rules:
            return True

        rules = self.config.validation_rules
        try:
            if not isinstance(data, dict) or "value" not in data:
                return False

            value = data["value"]

            if rules.get("type") == "numeric":
                if not isinstance(value, (int, float)):
                    return False
                return (
                    rules.get("min", float("-inf"))
                    <= value
                    <= rules.get("max", float("inf"))
                )

            elif rules.get("type") == "categorical":
                return value in rules.get("allowed_values", [])

            elif rules.get("type") == "binary":
                return isinstance(value, bool)

        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return False

        return True

    def _normalize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize data according to rules"""
        if not self.config.normalization_rules:
            return data

        rules = self.config.normalization_rules
        try:
            if rules.get("type") == "numeric":
                value = float(data["value"])
                if "scale" in rules:
                    value *= rules["scale"]
                if "decimals" in rules:
                    value = round(value, rules["decimals"])
                data["value"] = value

            elif rules.get("type") == "categorical":
                mapping = rules.get("mapping", {})
                data["value"] = mapping.get(data["value"], data["value"])

        except Exception as e:
            logger.error(f"Normalization error: {str(e)}")

        return data


class RestAdapter(BaseAdapter):
    """Adapter for REST API data sources"""

    def __init__(
        self, config: AdapterConfig, monitor: Optional[MonitoringService] = None
    ):
        super().__init__(config, monitor)
        self.session: Optional[ClientSession] = None

    async def _connect_impl(self):
        """Create aiohttp session"""
        if self.session is None or self.session.closed:
            timeout = ClientTimeout(total=self.config.timeout)
            self.session = ClientSession(timeout=timeout)

    async def _disconnect_impl(self):
        """Close aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()

    async def _fetch_data_impl(self) -> Dict[str, Any]:
        """Fetch data from REST API"""
        # Check cache first
        cached_data = await self.cache.get(self.config.endpoint)
        if cached_data:
            return cached_data

        if not self.session or self.session.closed:
            await self.connect()

        headers = {}
        if self.auth_handler:
            headers.update(await self.auth_handler.get_auth_headers())

        async def make_request():
            async with self.session.get(
                self.config.endpoint, headers=headers
            ) as response:
                if response.status != 200:
                    raise Exception(f"API request failed: {response.status}")
                data = await response.json()
                return self._process_response(data)

        result = await self._handle_request(make_request)
        await self.cache.set(self.config.endpoint, result)
        return result

    def _process_response(self, response: Any) -> Dict[str, Any]:
        """Process and validate API response"""
        if isinstance(response, dict):
            data = response
        else:
            data = {"value": response}

        if not self._validate_data(data):
            raise ValueError("Invalid data format")

        return self._normalize_data(data)


class WebSocketAdapter(BaseAdapter):
    """Adapter for WebSocket data sources"""

    def __init__(
        self, config: AdapterConfig, monitor: Optional[MonitoringService] = None
    ):
        super().__init__(config, monitor)
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self._latest_data: Optional[Dict[str, Any]] = None
        self._connected = asyncio.Event()
        self._task: Optional[asyncio.Task] = None

    async def _connect_impl(self):
        """Establish WebSocket connection"""
        if not self.ws:
            self.ws = await websockets.connect(
                self.config.endpoint,
                extra_headers=(
                    await self.auth_handler.get_auth_headers()
                    if self.auth_handler
                    else {}
                ),
            )
            self._task = asyncio.create_task(self._listen())
            await self._connected.wait()

    async def _disconnect_impl(self):
        """Close WebSocket connection"""
        if self.ws:
            await self.ws.close()
            self.ws = None
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _fetch_data_impl(self) -> Dict[str, Any]:
        """Get latest data from WebSocket"""
        if not self.ws:
            await self.connect()

        if not self._latest_data:
            raise Exception("No data received yet")

        return self._latest_data

    async def _listen(self):
        """Listen for WebSocket messages"""
        try:
            self._connected.set()
            async for message in self.ws:
                try:
                    data = json.loads(message)
                    if self._validate_data(data):
                        self._latest_data = self._normalize_data(data)
                except json.JSONDecodeError:
                    logger.error("Failed to parse WebSocket message")
                except Exception as e:
                    logger.error(f"Error processing WebSocket message: {str(e)}")
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
            self._connected.clear()
            await self.disconnect()
            await asyncio.sleep(5)
            await self.connect()


class DatabaseAdapter(BaseAdapter):
    """Adapter for database data sources"""

    def __init__(
        self, config: AdapterConfig, monitor: Optional[MonitoringService] = None
    ):
        super().__init__(config, monitor)
        self.pool: Optional[aiomysql.Pool] = None
        self._parse_connection_string()

    def _parse_connection_string(self):
        """Parse database connection string"""
        url = urlparse(self.config.endpoint)
        self.db_config = {
            "host": url.hostname,
            "port": url.port or 3306,
            "user": url.username,
            "password": url.password,
            "db": url.path.lstrip("/"),
            "charset": "utf8mb4",
        }

    async def _connect_impl(self):
        """Create database connection pool"""
        if not self.pool:
            self.pool = await aiomysql.create_pool(**self.db_config)

    async def _disconnect_impl(self):
        """Close database connection pool"""
        if self.pool:
            self.pool.close()
            await self.pool.wait_closed()
            self.pool = None

    async def _fetch_data_impl(self) -> Dict[str, Any]:
        """Execute query and fetch data"""
        if not self.pool:
            await self.connect()

        cached_data = await self.cache.get(self.config.endpoint)
        if cached_data:
            return cached_data

        async def execute_query():
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(self.config.endpoint)
                    result = await cur.fetchone()
                    if not result:
                        raise ValueError("No data returned")
                    return {"value": result[0]}

        result = await self._handle_request(execute_query)
        if self._validate_data(result):
            normalized = self._normalize_data(result)
            await self.cache.set(self.config.endpoint, normalized)
            return normalized
        raise ValueError("Invalid data format")


class FileSystemAdapter(BaseAdapter):
    """Adapter for file system data sources"""

    async def _connect_impl(self):
        """Verify file exists and is accessible"""
        if not os.path.exists(self.config.endpoint):
            raise FileNotFoundError(f"File not found: {self.config.endpoint}")

    async def _disconnect_impl(self):
        """No cleanup needed for file system"""
        pass

    async def _fetch_data_impl(self) -> Dict[str, Any]:
        """Read and parse file data"""
        cached_data = await self.cache.get(self.config.endpoint)
        if cached_data:
            return cached_data

        async def read_file():
            with open(self.config.endpoint, "r") as f:
                content = f.read().strip()
                try:
                    data = json.loads(content)
                except json.JSONDecodeError:
                    # Try parsing as plain number
                    data = {"value": float(content)}
                return data

        result = await self._handle_request(read_file)
        if self._validate_data(result):
            normalized = self._normalize_data(result)
            await self.cache.set(self.config.endpoint, normalized)
            return normalized
        raise ValueError("Invalid data format")


class AdapterFactory:
    """Factory for creating data source adapters"""

    _adapter_types: Dict[str, Type[BaseAdapter]] = {
        "rest": RestAdapter,
        "websocket": WebSocketAdapter,
        "database": DatabaseAdapter,
        "filesystem": FileSystemAdapter,
    }

    @classmethod
    def register_adapter(cls, name: str, adapter_class: Type[BaseAdapter]):
        """Register a new adapter type"""
        cls._adapter_types[name] = adapter_class

    @classmethod
    def create_adapter(
            cls, config: AdapterConfig, monitor: Optional[MonitoringService] = None
    ) -> BaseAdapter:
        """Create adapter instance based on configuration"""
        adapter_class = cls._adapter_types.get(config.source_type)
        if not adapter_class:
            raise ValueError(f"Unknown adapter type: {config.source_type}")
        return adapter_class(config, monitor)


class AdapterPlugin:
    """Base class for community-contributed adapters"""

    @classmethod
    @abstractmethod
    def get_adapter_class(cls) -> Type[BaseAdapter]:
        """Get the adapter class implementation"""
        pass

    @classmethod
    @abstractmethod
    def get_adapter_name(cls) -> str:
        """Get the name for this adapter type"""
        pass

    @classmethod
    def register(cls):
        """Register this adapter with the factory"""
        AdapterFactory.register_adapter(cls.get_adapter_name(), cls.get_adapter_class())
