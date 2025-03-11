"""
Task scheduler for Oracular system.
Manages distributed oracle update tasks with resilience, priority, and dynamic scheduling.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Any, Dict, List, Optional, Set, Union
from uuid import UUID, uuid4

import aioredis
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from backend.blockchain.eth_service import EthereumService
from backend.blockchain.contract_manager import ContractManager
from backend.adapters.data_source_adapter import AdapterFactory, AdapterConfig
from backend.services.oracle_service import OracleService, DataValidator
from backend.monitoring.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)


class TaskPriority(Enum):
    """Task priority levels"""

    CRITICAL = auto()
    HIGH = auto()
    MEDIUM = auto()
    LOW = auto()


class TaskStatus(Enum):
    """Task execution status"""

    PENDING = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()
    RETRYING = auto()
    CANCELLED = auto()


class FailureReason(Enum):
    """Categorized failure reasons"""

    NETWORK_ERROR = auto()
    DATA_SOURCE_ERROR = auto()
    VALIDATION_ERROR = auto()
    BLOCKCHAIN_ERROR = auto()
    RESOURCE_ERROR = auto()
    UNKNOWN_ERROR = auto()


@dataclass
class RetryPolicy:
    """Retry configuration based on failure reason"""

    max_attempts: int
    backoff_base: float
    backoff_multiplier: float
    max_delay: int
    failure_types: Set[FailureReason]


@dataclass
class MaintenanceWindow:
    """Scheduled maintenance window"""

    window_id: UUID
    start_time: datetime
    end_time: datetime
    description: str
    affected_tasks: Set[UUID]


@dataclass
class TaskDefinition:
    """Oracle update task definition"""

    task_id: UUID
    name: str
    priority: TaskPriority
    schedule: Union[CronTrigger, IntervalTrigger]
    data_sources: List[AdapterConfig]
    validation_rules: Dict[str, Any]
    min_sources: int
    max_concurrent: int
    timeout: int
    retry_policy: RetryPolicy
    contracts: List[UUID]
    created_at: datetime
    updated_at: datetime
    owner_id: UUID


@dataclass
class TaskExecution:
    """Task execution record"""

    execution_id: UUID
    task_id: UUID
    start_time: datetime
    end_time: Optional[datetime]
    status: TaskStatus
    node_id: str
    data_points: List[Dict[str, Any]]
    aggregated_value: Optional[Dict[str, Any]]
    error: Optional[str]
    retry_count: int
    performance_metrics: Dict[str, float]


class TaskScheduler:
    """Distributed task scheduler for oracle updates"""

    def __init__(
        self,
        redis_url: str,
        eth_service: EthereumService,
        contract_manager: ContractManager,
        adapter_factory: AdapterFactory,
        monitor: Optional[MonitoringService] = None,
        node_id: Optional[str] = None,
    ):
        """
        Initialize the task scheduler.

        Args:
            redis_url: Redis connection URL
            eth_service: Ethereum service instance
            contract_manager: Contract manager instance
            adapter_factory: Data source adapter factory
            monitor: Performance monitoring instance
            node_id: Unique identifier for this scheduler node
        """
        self.redis = aioredis.from_url(redis_url)
        self.eth_service = eth_service
        self.contract_manager = contract_manager
        self.adapter_factory = adapter_factory
        self.monitor = monitor
        self.node_id = node_id or str(uuid4())

        # Initialize APScheduler with Redis job store
        self.scheduler = AsyncIOScheduler(
            jobstores={
                "default": RedisJobStore(
                    jobs_key="oracle_jobs",
                    run_times_key="oracle_running",
                    url=redis_url,
                )
            },
            executors={"default": AsyncIOExecutor()},
        )

        # Task management
        self._tasks: Dict[UUID, TaskDefinition] = {}
        self._executions: Dict[UUID, TaskExecution] = {}
        self._maintenance_windows: Dict[UUID, MaintenanceWindow] = {}

        # Concurrency control
        self._running_tasks: Set[UUID] = set()
        self._task_locks: Dict[UUID, asyncio.Lock] = {}

        # Load default retry policies
        self._retry_policies = {
            TaskPriority.CRITICAL: RetryPolicy(
                max_attempts=5,
                backoff_base=1,
                backoff_multiplier=2,
                max_delay=300,
                failure_types={fr for fr in FailureReason},
            ),
            TaskPriority.HIGH: RetryPolicy(
                max_attempts=3,
                backoff_base=2,
                backoff_multiplier=2,
                max_delay=600,
                failure_types={
                    FailureReason.NETWORK_ERROR,
                    FailureReason.DATA_SOURCE_ERROR,
                    FailureReason.BLOCKCHAIN_ERROR,
                },
            ),
            TaskPriority.MEDIUM: RetryPolicy(
                max_attempts=2,
                backoff_base=5,
                backoff_multiplier=2,
                max_delay=1800,
                failure_types={
                    FailureReason.NETWORK_ERROR,
                    FailureReason.DATA_SOURCE_ERROR,
                },
            ),
            TaskPriority.LOW: RetryPolicy(
                max_attempts=1,
                backoff_base=10,
                backoff_multiplier=2,
                max_delay=3600,
                failure_types={FailureReason.NETWORK_ERROR},
            ),
        }

    async def initialize(self):
        """Initialize scheduler and load existing tasks"""
        await self._load_tasks()
        await self._load_maintenance_windows()
        self.scheduler.start()
        asyncio.create_task(self._monitor_node_health())
        asyncio.create_task(self._cleanup_stale_executions())

    async def _load_tasks(self):
        """Load tasks from persistent storage"""
        task_data = await self.redis.hgetall("oracle_tasks")
        for task_id, data in task_data.items():
            task = TaskDefinition(**json.loads(data))
            self._tasks[task.task_id] = task
            await self._schedule_task(task)

    async def _load_maintenance_windows(self):
        """Load maintenance windows from storage"""
        window_data = await self.redis.hgetall("maintenance_windows")
        for window_id, data in window_data.items():
            window = MaintenanceWindow(**json.loads(data))
            if window.end_time > datetime.utcnow():
                self._maintenance_windows[window.window_id] = window

    async def create_task(
        self,
        name: str,
        schedule: Union[str, int],
        data_sources: List[AdapterConfig],
        validation_rules: Dict[str, Any],
        contracts: List[UUID],
        priority: TaskPriority = TaskPriority.MEDIUM,
        min_sources: int = 1,
        max_concurrent: int = 1,
        timeout: int = 300,
        owner_id: UUID = None,
    ) -> TaskDefinition:
        """
        Create new oracle update task.

        Args:
            name: Task name
            schedule: Cron expression or interval in seconds
            data_sources: List of data source configurations
            validation_rules: Data validation rules
            contracts: List of contract IDs to update
            priority: Task priority level
            min_sources: Minimum required data sources
            max_concurrent: Maximum concurrent executions
            timeout: Task timeout in seconds
            owner_id: Task owner user ID

        Returns:
            Created task definition
        """
        # Create schedule trigger
        if isinstance(schedule, str):
            trigger = CronTrigger.from_crontab(schedule)
        else:
            trigger = IntervalTrigger(seconds=schedule)

        # Create task definition
        task = TaskDefinition(
            task_id=uuid4(),
            name=name,
            priority=priority,
            schedule=trigger,
            data_sources=data_sources,
            validation_rules=validation_rules,
            min_sources=min_sources,
            max_concurrent=max_concurrent,
            timeout=timeout,
            retry_policy=self._retry_policies[priority],
            contracts=contracts,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            owner_id=owner_id,
        )

        # Save and schedule task
        self._tasks[task.task_id] = task
        await self._save_task(task)
        await self._schedule_task(task)

        return task

    async def _schedule_task(self, task: TaskDefinition):
        """Schedule task execution"""
        self.scheduler.add_job(
            self._execute_task,
            trigger=task.schedule,
            args=[task.task_id],
            id=str(task.task_id),
            replace_existing=True,
            coalesce=True,
            misfire_grace_time=300,
        )

    async def _execute_task(self, task_id: UUID):
        """Execute scheduled task"""
        task = self._tasks.get(task_id)
        if not task:
            return

        # Check maintenance window
        if await self._is_in_maintenance(task_id):
            logger.info(f"Task {task_id} skipped due to maintenance window")
            return

        # Check concurrency limits
        if (
            len(
                [
                    e
                    for e in self._executions.values()
                    if e.task_id == task_id and e.status == TaskStatus.RUNNING
                ]
            )
            >= task.max_concurrent
        ):
            logger.warning(f"Task {task_id} skipped due to concurrency limit")
            return

        # Create execution record
        execution = TaskExecution(
            execution_id=uuid4(),
            task_id=task_id,
            start_time=datetime.utcnow(),
            end_time=None,
            status=TaskStatus.PENDING,
            node_id=self.node_id,
            data_points=[],
            aggregated_value=None,
            error=None,
            retry_count=0,
            performance_metrics={},
        )

        self._executions[execution.execution_id] = execution

        try:
            # Acquire task lock
            async with self._get_task_lock(task_id):
                execution.status = TaskStatus.RUNNING
                self._running_tasks.add(task_id)

                # Initialize data sources
                sources = [
                    self.adapter_factory.create_adapter(config, self.monitor)
                    for config in task.data_sources
                ]

                # Create oracle service instance
                oracle = OracleService(
                    data_sources=sources,
                    validator=DataValidator(task.validation_rules),
                    update_interval=0,  # Single update mode
                )

                # Execute update cycle
                start_time = time.time()
                await oracle._update_cycle()
                execution.performance_metrics["duration"] = (
                    time.time() - start_time
                )

                # Update contracts
                for contract_id in task.contracts:
                    contract = self.contract_manager.get_contract(contract_id)
                    if contract:
                        # TODO: Implement contract update logic
                        pass

                execution.status = TaskStatus.COMPLETED
                execution.end_time = datetime.utcnow()

        except Exception as e:
            execution.status = TaskStatus.FAILED
            execution.error = str(e)
            execution.end_time = datetime.utcnow()

            # Handle retry if applicable
            failure_reason = self._classify_failure(str(e))
            if await self._should_retry(task, execution, failure_reason):
                await self._schedule_retry(task, execution)

            logger.error(f"Task {task_id} failed: {str(e)}")

        finally:
            self._running_tasks.discard(task_id)
            await self._save_execution(execution)

            if self.monitor:
                self.monitor.record_task_execution(
                    task_id=str(task_id),
                    status=execution.status.name,
                    duration=execution.performance_metrics.get("duration", 0),
                )

    def _get_task_lock(self, task_id: UUID) -> asyncio.Lock:
        """Get or create task lock"""
        if task_id not in self._task_locks:
            self._task_locks[task_id] = asyncio.Lock()
        return self._task_locks[task_id]

    def _classify_failure(self, error: str) -> FailureReason:
        """Classify failure reason from error message"""
        error_lower = error.lower()
        if "network" in error_lower or "connection" in error_lower:
            return FailureReason.NETWORK_ERROR
        elif "data source" in error_lower:
            return FailureReason.DATA_SOURCE_ERROR
        elif "validation" in error_lower:
            return FailureReason.VALIDATION_ERROR
        elif "blockchain" in error_lower or "web3" in error_lower:
            return FailureReason.BLOCKCHAIN_ERROR
        elif "resource" in error_lower or "memory" in error_lower:
            return FailureReason.RESOURCE_ERROR
        return FailureReason.UNKNOWN_ERROR

    async def _should_retry(
        self,
        task: TaskDefinition,
        execution: TaskExecution,
        failure_reason: FailureReason,
    ) -> bool:
        """Determine if failed task should be retried"""
        if execution.retry_count >= task.retry_policy.max_attempts:
            return False

        if failure_reason not in task.retry_policy.failure_types:
            return False

        return True

    async def _schedule_retry(self, task: TaskDefinition, execution: TaskExecution):
        """Schedule task retry with exponential backoff"""
        execution.retry_count += 1
        delay = min(
            task.retry_policy.backoff_base
            * (task.retry_policy.backoff_multiplier ** (execution.retry_count - 1)),
            task.retry_policy.max_delay,
        )

        self.scheduler.add_job(
            self._execute_task,
            "date",
            run_date=datetime.utcnow() + timedelta(seconds=delay),
            args=[task.task_id],
            id=f"{task.task_id}_retry_{execution.retry_count}",
        )

        execution.status = TaskStatus.RETRYING

    async def create_maintenance_window(
        self,
        start_time: datetime,
        end_time: datetime,
        description: str,
        affected_tasks: Optional[Set[UUID]] = None,
    ) -> MaintenanceWindow:
        """Schedule system maintenance window"""
        window = MaintenanceWindow(
            window_id=uuid4(),
            start_time=start_time,
            end_time=end_time,
            description=description,
            affected_tasks=affected_tasks or set(),
        )

        self._maintenance_windows[window.window_id] = window
        await self._save_maintenance_window(window)

        return window

    async def _is_in_maintenance(self, task_id: UUID) -> bool:
        """Check if task is affected by active maintenance window"""
        now = datetime.utcnow()
        return any(
            window.start_time <= now <= window.end_time
            and (not window.affected_tasks or task_id in window.affected_tasks)
            for window in self._maintenance_windows.values()
        )

    async def update_task_schedule(
        self,
        task_id: UUID,
        schedule: Optional[Union[str, int]] = None,
        priority: Optional[TaskPriority] = None,
    ) -> TaskDefinition:
        """Update task schedule or priority"""
        task = self._tasks.get(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")

        if schedule is not None:
            if isinstance(schedule, str):
                task.schedule = CronTrigger.from_crontab(schedule)
            else:
                task.schedule = IntervalTrigger(seconds=schedule)

        if priority is not None:
            task.priority = priority
            task.retry_policy = self._retry_policies[priority]

        task.updated_at = datetime.utcnow()
        await self._save_task(task)
        await self._schedule_task(task)

        return task

    async def _save_task(self, task: TaskDefinition):
        """Save task to persistent storage"""
        await self.redis.hset(
            "oracle_tasks", str(task.task_id), json.dumps(task.__dict__)
        )

    async def _save_execution(self, execution: TaskExecution):
        """Save execution record to persistent storage"""
        await self.redis.hset(
            "task_executions",
            str(execution.execution_id),
            json.dumps(execution.__dict__),
        )

    async def _save_maintenance_window(self, window: MaintenanceWindow):
        """Save maintenance window to persistent storage"""
        await self.redis.hset(
            "maintenance_windows", str(window.window_id), json.dumps(window.__dict__)
        )

    async def get_task_history(
        self, task_id: UUID, limit: int = 100
    ) -> List[TaskExecution]:
        """Get execution history for task"""
        executions = await self.redis.hgetall("task_executions")

        task_executions = [
            TaskExecution(**json.loads(data))
            for data in executions.values()
            if UUID(json.loads(data)["task_id"]) == task_id
        ]

        return sorted(task_executions, key=lambda e: e.start_time, reverse=True)[:limit]

    async def _monitor_node_health(self):
        """Monitor and report node health metrics"""
        while True:
            try:
                metrics = {
                    "node_id": self.node_id,
                    "running_tasks": len(self._running_tasks),
                    "total_tasks": len(self._tasks),
                    "timestamp": datetime.utcnow().isoformat(),
                }

                await self.redis.hset(
                    "scheduler_nodes", self.node_id, json.dumps(metrics)
                )

                # Clean up disappeared nodes
                nodes = await self.redis.hgetall("scheduler_nodes")
                for node_id, node_data in nodes.items():
                    node_time = datetime.fromisoformat(
                        json.loads(node_data)["timestamp"]
                    )
                    if (
                        datetime.utcnow() - node_time
                        > timedelta(minutes=5)
                    ):
                        await self.redis.hdel("scheduler_nodes", node_id)

            except Exception as e:
                logger.error(f"Error in node health monitoring: {str(e)}")

            await asyncio.sleep(60)

    async def _cleanup_stale_executions(self):
        """Clean up stale execution records"""
        while True:
            try:
                executions = await self.redis.hgetall("task_executions")
                for exec_id, data in executions.items():
                    execution = TaskExecution(**json.loads(data))

                    # Clean up old completed executions
                    if execution.status in (
                        TaskStatus.COMPLETED,
                        TaskStatus.FAILED,
                    ) and datetime.utcnow() - execution.end_time > timedelta(days=7):
                        await self.redis.hdel("task_executions", exec_id)

                    # Clean up stuck executions
                    elif execution.status in (
                        TaskStatus.RUNNING,
                        TaskStatus.PENDING,
                    ) and (
                        datetime.utcnow() - execution.start_time
                        > timedelta(hours=1)
                    ):
                        execution.status = TaskStatus.FAILED
                        execution.error = "Execution timed out"
                        execution.end_time = datetime.utcnow()
                        await self._save_execution(execution)

            except Exception as e:
                logger.error(f"Error in execution cleanup: {str(e)}")

            await asyncio.sleep(3600)  # Run hourly
