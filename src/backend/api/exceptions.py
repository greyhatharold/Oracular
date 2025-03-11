class APIError(Exception):
    """Base exception for API errors."""
    def __init__(self, message: str, status_code: int = None):
        super().__init__(message)
        self.status_code = status_code

class APITimeoutError(APIError):
    """Raised when an API request times out."""
    def __init__(self, message: str = "Request timed out"):
        super().__init__(message, status_code=408)

class APIConnectionError(APIError):
    """Raised when there's a network connection error."""
    def __init__(self, message: str = "Connection error"):
        super().__init__(message, status_code=503)

class APIAuthenticationError(APIError):
    """Raised when there's an authentication error."""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)

class APIRateLimitError(APIError):
    """Raised when rate limit is exceeded and retry attempts are exhausted."""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, status_code=429) 