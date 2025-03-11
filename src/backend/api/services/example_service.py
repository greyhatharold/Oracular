from typing import Dict, List, Optional
from pydantic import BaseModel

from ..client import APIClient
from ..config import APIConfig

class ExampleResource(BaseModel):
    """Example resource model."""
    id: int
    name: str
    description: Optional[str] = None

class ExampleService:
    """
    Example service demonstrating API client usage.
    Use this as a template for creating other service classes.
    """
    def __init__(self, client: APIClient):
        self.client = client
        self._base_endpoint = "examples"  # Base endpoint for this service

    async def list_resources(self, page: int = 1, limit: int = 10) -> List[ExampleResource]:
        """Get a list of resources."""
        response = await self.client.get(
            self._base_endpoint,
            params={"page": page, "limit": limit}
        )
        return [ExampleResource(**item) for item in response["items"]]

    async def get_resource(self, resource_id: int) -> ExampleResource:
        """Get a single resource by ID."""
        response = await self.client.get(f"{self._base_endpoint}/{resource_id}")
        return ExampleResource(**response)

    async def create_resource(self, data: Dict) -> ExampleResource:
        """Create a new resource."""
        response = await self.client.post(self._base_endpoint, data=data)
        return ExampleResource(**response)

    async def update_resource(self, resource_id: int, data: Dict) -> ExampleResource:
        """Update an existing resource."""
        response = await self.client.put(
            f"{self._base_endpoint}/{resource_id}",
            data=data
        )
        return ExampleResource(**response)

    async def delete_resource(self, resource_id: int) -> None:
        """Delete a resource."""
        await self.client.delete(f"{self._base_endpoint}/{resource_id}")

# Example usage:
async def example_usage():
    config = APIConfig.from_env()
    async with APIClient(config) as client:
        service = ExampleService(client)
        
        # List resources
        resources = await service.list_resources(page=1, limit=10)
        
        # Get single resource
        resource = await service.get_resource(1)
        
        # Create resource
        new_resource = await service.create_resource({
            "name": "New Resource",
            "description": "A new resource created via API"
        })
        
        # Update resource
        updated_resource = await service.update_resource(
            new_resource.id,
            {"description": "Updated description"}
        )
        
        # Delete resource
        await service.delete_resource(new_resource.id) 