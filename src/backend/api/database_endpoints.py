from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging

from backend.db.database import db
from backend.db.models import (
    User, Oracle, DataSource, Task, Role, Alert,
    ContractEvent, AssetPrice, PerformanceMetric, AuditLog,
    ValidationRule, UserRole, TaskStatus, AlertSeverity
)
from backend.db.repository import (
    user_repository, oracle_repository, data_source_repository,
    task_repository, role_repository, alert_repository,
    contract_event_repository, asset_price_repository,
    performance_metric_repository, validation_rule_repository,
    audit_log_repository
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/database", tags=["database"])

async def get_db_session():
    """Dependency for database session."""
    with db.session() as session:
        yield session

@router.get("/health")
async def check_database_health() -> Dict[str, Any]:
    """Check database health status and connection pool metrics."""
    try:
        with db.session() as session:
            # Check basic connection
            session.execute("SELECT 1")
            
            # Get connection pool stats
            engine_status = {
                "pool_size": db.engine.pool.size(),
                "checkedin": db.engine.pool.checkedin(),
                "checkedout": db.engine.pool.checkedout(),
                "overflow": db.engine.pool.overflow()
            }
            
            return {
                "status": "healthy",
                "message": "Database connection successful",
                "timestamp": datetime.utcnow().isoformat(),
                "pool_metrics": engine_status
            }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"status": "unhealthy", "message": str(e)}
        )

@router.get("/schema")
async def get_database_schema(session: Session = Depends(get_db_session)) -> Dict[str, Any]:
    """Get database schema information including tables, columns, and relationships."""
    try:
        schema_info = {}
        for table in db.engine.table_names():
            table_obj = db.engine.metadata.tables[table]
            schema_info[table] = {
                "columns": [
                    {
                        "name": col.name,
                        "type": str(col.type),
                        "nullable": col.nullable,
                        "primary_key": col.primary_key,
                    }
                    for col in table_obj.columns
                ],
                "foreign_keys": [
                    {
                        "column": fk.parent.name,
                        "references": f"{fk.column.table.name}.{fk.column.name}"
                    }
                    for fk in table_obj.foreign_keys
                ],
                "indexes": [
                    {"name": idx.name, "columns": [col.name for col in idx.columns]}
                    for idx in table_obj.indexes
                ]
            }
        return {"tables": schema_info}
    except Exception as e:
        logger.error(f"Failed to get schema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_database_stats(session: Session = Depends(get_db_session)) -> Dict[str, Any]:
    """Get comprehensive database statistics and metrics."""
    try:
        stats = {
            "table_counts": {},
            "recent_activity": {},
            "performance_metrics": {}
        }
        
        # Get record counts for each table
        for repo in [
            user_repository, oracle_repository, data_source_repository,
            task_repository, role_repository, alert_repository
        ]:
            stats["table_counts"][repo.model.__tablename__] = repo.count(session)
        
        # Get recent activity
        stats["recent_activity"] = {
            "recent_tasks": len(task_repository.get_pending_tasks(session)),
            "unread_alerts": len(alert_repository.get_unread_alerts(session, user_id=None)),
            "active_oracles": len(oracle_repository.get_active_oracles(session))
        }
        
        # Get performance metrics
        recent_metrics = performance_metric_repository.get_metrics_by_name(
            session, "database_query_duration", limit=100
        )
        if recent_metrics:
            stats["performance_metrics"] = {
                "avg_query_duration": sum(m.metric_value for m in recent_metrics) / len(recent_metrics),
                "total_metrics": len(recent_metrics)
            }
        
        return stats
    except Exception as e:
        logger.error(f"Failed to get database stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vacuum/{table_name}")
async def vacuum_table(
    table_name: Optional[str] = Path(None),
    session: Session = Depends(get_db_session)
) -> Dict[str, str]:
    """Perform VACUUM ANALYZE on specified table or entire database."""
    try:
        if table_name:
            # Validate table exists
            if table_name not in db.engine.table_names():
                raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
            
            session.execute(f"VACUUM ANALYZE {table_name}")
            message = f"VACUUM ANALYZE completed successfully on table {table_name}"
        else:
            session.execute("VACUUM ANALYZE")
            message = "VACUUM ANALYZE completed successfully on all tables"
        
        return {"status": "success", "message": message}
    except Exception as e:
        logger.error(f"Vacuum operation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def optimize_database(session: Session = Depends(get_db_session)) -> Dict[str, Any]:
    """Optimize database performance through various maintenance operations."""
    try:
        optimizations = []
        
        # Analyze all tables
        session.execute("ANALYZE VERBOSE")
        optimizations.append("Analyzed all tables")
        
        # Update table statistics
        session.execute("VACUUM ANALYZE")
        optimizations.append("Updated table statistics")
        
        # Reindex tables
        for table in db.engine.table_names():
            session.execute(f"REINDEX TABLE {table}")
            optimizations.append(f"Reindexed table {table}")
        
        return {
            "status": "success",
            "message": "Database optimization completed successfully",
            "optimizations": optimizations
        }
    except Exception as e:
        logger.error(f"Database optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def get_performance_metrics(
    metric_name: Optional[str] = Query(None),
    time_range: Optional[int] = Query(24, description="Time range in hours"),
    session: Session = Depends(get_db_session)
) -> Dict[str, Any]:
    """Get database performance metrics with optional filtering."""
    try:
        query = session.query(PerformanceMetric)
        
        if metric_name:
            query = query.filter(PerformanceMetric.metric_name == metric_name)
        
        if time_range:
            start_time = datetime.utcnow() - timedelta(hours=time_range)
            query = query.filter(PerformanceMetric.timestamp >= start_time)
        
        metrics = query.order_by(PerformanceMetric.timestamp.desc()).all()
        
        return {
            "metrics": [
                {
                    "name": metric.metric_name,
                    "value": metric.metric_value,
                    "timestamp": metric.timestamp.isoformat(),
                    "metadata": metric.metadata
                }
                for metric in metrics
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/metrics")
async def record_performance_metric(
    metric_data: Dict[str, Any],
    session: Session = Depends(get_db_session)
) -> Dict[str, str]:
    """Record a new performance metric."""
    try:
        new_metric = PerformanceMetric(
            metric_name=metric_data["name"],
            metric_value=metric_data["value"],
            timestamp=datetime.fromisoformat(metric_data["timestamp"]) if "timestamp" in metric_data else datetime.utcnow(),
            metadata=metric_data.get("labels", {})
        )
        
        session.add(new_metric)
        session.commit()
        
        return {"status": "success", "message": f"Recorded metric: {metric_data['name']}"}
    except Exception as e:
        logger.error(f"Error recording metric: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events")
async def record_event(
    event_data: Dict[str, Any],
    session: Session = Depends(get_db_session)
) -> Dict[str, str]:
    """Record a new system event."""
    try:
        new_log = AuditLog(
            action=event_data["name"],
            details=event_data.get("data", {}),
            metadata=event_data.get("labels", {}),
            timestamp=datetime.fromisoformat(event_data["timestamp"]) if "timestamp" in event_data else datetime.utcnow(),
            # Using a placeholder user ID if not provided
            user_id=event_data.get("labels", {}).get("user_id", None)
        )
        
        session.add(new_log)
        session.commit()
        
        return {"status": "success", "message": f"Recorded event: {event_data['name']}"}
    except Exception as e:
        logger.error(f"Error recording event: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit-logs")
async def get_audit_logs(
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    session: Session = Depends(get_db_session)
) -> Dict[str, Any]:
    """Get audit logs with optional filtering."""
    try:
        query = session.query(AuditLog)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        
        logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
        
        return {
            "logs": [
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "changes": log.changes,
                    "created_at": log.created_at.isoformat()
                }
                for log in logs
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 