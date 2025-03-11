from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends
from starlette.status import HTTP_200_OK, HTTP_429_TOO_MANY_REQUESTS, HTTP_503_SERVICE_UNAVAILABLE

from backend.monitoring.monitoring_service import MonitoringService
from backend.scheduler.task_scheduler import TaskScheduler
from backend.blockchain.eth_service import EthereumService

router = APIRouter()

async def get_services(
    monitoring: MonitoringService = Depends(),
    scheduler: TaskScheduler = Depends(),
    eth_service: EthereumService = Depends(),
):
    return {
        "monitoring": monitoring,
        "scheduler": scheduler,
        "eth_service": eth_service
    }

@router.get("/health", 
    response_model=Dict[str, Any],
    responses={
        200: {"description": "System is healthy"},
        429: {"description": "System is degraded"},
        503: {"description": "System is unhealthy"},
    }
)
async def health_check(services: Dict[str, Any] = Depends(get_services)):
    """
    Comprehensive health check endpoint that returns detailed system health metrics.
    Returns:
        - 200: System is healthy
        - 429: System is degraded (high load or partial component failure)
        - 503: System is unhealthy (critical component failure)
    """
    monitoring = services["monitoring"]
    scheduler = services["scheduler"]
    eth_service = services["eth_service"]

    # Get dashboard data from monitoring service
    dashboard_data = monitoring.get_dashboard_data()
    
    # Get scheduler health metrics
    scheduler_metrics = {
        "running_tasks": len(scheduler._running_tasks),
        "total_tasks": len(scheduler._tasks),
        "node_count": len(await scheduler.redis.hgetall("scheduler_nodes"))
    }

    # Get blockchain metrics
    blockchain_metrics = {
        "pending_transactions": len(eth_service._pending_transactions),
        "network_status": "connected" if eth_service.w3.isConnected() else "disconnected"
    }

    # Aggregate all health metrics
    health_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "system_metrics": dashboard_data["system_metrics"],
        "component_health": dashboard_data["component_health"],
        "performance_metrics": dashboard_data["performance_metrics"],
        "active_alerts": dashboard_data["active_alerts"],
        "scheduler_metrics": scheduler_metrics,
        "blockchain_metrics": blockchain_metrics
    }

    # Determine system health status
    status_code = HTTP_200_OK
    critical_components = ["monitoring_service", "eth_service", "task_scheduler"]
    
    # Check for critical component failures
    if any(not dashboard_data["component_health"].get(comp, False) for comp in critical_components):
        status_code = HTTP_503_SERVICE_UNAVAILABLE
    # Check for system degradation
    elif (dashboard_data["system_metrics"]["memory"] > 80 or 
          dashboard_data["system_metrics"]["cpu"] > 80 or
          dashboard_data["active_alerts"] > 5):
        status_code = HTTP_429_TOO_MANY_REQUESTS

    return health_data, status_code 