from typing import Any, Dict, Optional, Union
import aiohttp
import asyncio
from pydantic import BaseModel
import logging
from datetime import datetime, timedelta
from .exceptions import APIError, APITimeoutError, APIConnectionError
from .config import APIConfig

logger = logging.getLogger(__name__)

class APIClient:
    """
    Core API client for handling external communication.
    Implements retry logic, error handling, and connection pooling.
    """
    def __init__(
        self,
        config: APIConfig,
        session: Optional[aiohttp.ClientSession] = None,
        max_retries: int = 3,
        timeout: int = 30,
    ):
        self.config = config
        self._session = session
        self.max_retries = max_retries
        self.timeout = timeout
        self._rate_limit_remaining = None
        self._rate_limit_reset = None

    async def __aenter__(self):
        if self._session is None:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout),
                headers=self.config.default_headers,
            )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            await self._session.close()
            self._session = None

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Makes an HTTP request with retry logic and error handling.
        """
        url = f"{self.config.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        merged_headers = {**self.config.default_headers, **(headers or {})}
        
        for attempt in range(self.max_retries):
            try:
                if self._should_wait_for_rate_limit():
                    await self._wait_for_rate_limit()

                async with self._session.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    headers=merged_headers,
                ) as response:
                    self._update_rate_limits(response)
                    
                    if response.status == 429:  # Rate limited
                        await self._handle_rate_limit(response)
                        continue
                        
                    response.raise_for_status()
                    return await response.json()

            except aiohttp.ClientResponseError as e:
                if attempt == self.max_retries - 1:
                    raise APIError(f"Request failed: {str(e)}", status_code=e.status)
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

            except aiohttp.ClientTimeout:
                if attempt == self.max_retries - 1:
                    raise APITimeoutError("Request timed out")
                await asyncio.sleep(2 ** attempt)

            except aiohttp.ClientError as e:
                if attempt == self.max_retries - 1:
                    raise APIConnectionError(f"Connection error: {str(e)}")
                await asyncio.sleep(2 ** attempt)

    def _should_wait_for_rate_limit(self) -> bool:
        """Check if we should wait due to rate limiting."""
        if self._rate_limit_remaining is None or self._rate_limit_reset is None:
            return False
        return (
            self._rate_limit_remaining <= 1
            and datetime.now() < self._rate_limit_reset
        )

    async def _wait_for_rate_limit(self):
        """Wait until rate limit reset."""
        if self._rate_limit_reset:
            wait_time = (self._rate_limit_reset - datetime.now()).total_seconds()
            if wait_time > 0:
                await asyncio.sleep(wait_time)

    def _update_rate_limits(self, response: aiohttp.ClientResponse):
        """Update rate limit information from response headers."""
        remaining = response.headers.get('X-RateLimit-Remaining')
        reset = response.headers.get('X-RateLimit-Reset')
        
        if remaining is not None:
            self._rate_limit_remaining = int(remaining)
        if reset is not None:
            self._rate_limit_reset = datetime.fromtimestamp(int(reset))

    async def _handle_rate_limit(self, response: aiohttp.ClientResponse):
        """Handle rate limit response."""
        reset_after = response.headers.get('Retry-After')
        if reset_after:
            await asyncio.sleep(int(reset_after))
        else:
            await asyncio.sleep(60)  # Default wait time

    async def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Perform GET request."""
        return await self._make_request("GET", endpoint, params=params)

    async def post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform POST request."""
        return await self._make_request("POST", endpoint, json=data)

    async def put(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform PUT request."""
        return await self._make_request("PUT", endpoint, json=data)

    async def delete(self, endpoint: str) -> Dict[str, Any]:
        """Perform DELETE request."""
        return await self._make_request("DELETE", endpoint) 