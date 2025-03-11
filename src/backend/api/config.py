from typing import Dict, Optional
from pydantic import BaseModel, HttpUrl, field_validator
import os

class APIConfig(BaseModel):
    """
    Configuration for API client.
    Handles environment variables and provides type-safe configuration.
    """
    base_url: HttpUrl
    api_key: Optional[str] = None
    timeout: int = 30
    default_headers: Dict[str, str] = {}

    @field_validator('default_headers', pre=True, always=True)
    def set_default_headers(cls, v, values):
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        if 'api_key' in values and values['api_key']:
            headers['Authorization'] = f"Bearer {values['api_key']}"
            
        headers.update(v or {})
        return headers

    @classmethod
    def from_env(cls) -> 'APIConfig':
        """
        Create configuration from environment variables.
        """
        return cls(
            base_url=os.getenv('API_BASE_URL', 'http://localhost:8000'),
            api_key=os.getenv('API_KEY'),
            timeout=int(os.getenv('API_TIMEOUT', '30')),
        ) 