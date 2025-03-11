"""
Monitoring service for Oracular system.
Provides comprehensive monitoring, alerting, and self-healing capabilities.
"""

import asyncio
import json
import logging
import statistics
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

import aioredis
import numpy as np
from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync
from prometheus_client import Counter, Gauge, Histogram, start_http_server
from scipy import stats

from backend.blockchain.eth_service import EthereumService
from backend.utils.notification import EmailNotifier, SMSNotifier, WebhookNotifier

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics collected"""

    COUNTER = auto()
    GAUGE = auto()
    HISTOGRAM = auto()


class AlertSeverity(Enum):
    """Alert severity levels"""

    CRITICAL = auto()
    HIGH = auto()
    MEDIUM = auto()
    LOW = auto()
    INFO = auto()


class ComponentType(Enum):
    """System component types"""

    ORACLE = auto()
    SCHEDULER = auto()
    DATA_SOURCE = auto()
    BLOCKCHAIN = auto()
    CONTRACT = auto()
    API = auto()


@dataclass
class AlertRule:
    """Alert rule definition"""

    rule_id: UUID
    name: str
    description: str
    severity: AlertSeverity
    component: ComponentType
    condition: str  # Python expression
    lookback_window: int  # seconds
    cooldown_period: int  # seconds
    channels: Set[str]
    enabled: bool = True
    last_triggered: Optional[datetime] = None


@dataclass
class Alert:
    """Alert instance"""

    alert_id: UUID
    rule_id: UUID
    severity: AlertSeverity
    component: ComponentType
    message: str
    details: Dict[str, Any]
    created_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None


@dataclass
class MetricDefinition:
    """Metric definition"""

    name: str
    type: MetricType
    description: str
    unit: str
    labels: List[str]


@dataclass
class AnomalyDetector:
    """Anomaly detection configuration"""

    metric_name: str
    algorithm: str  # zscore, iqr, or ewma
    sensitivity: float
    training_window: int  # seconds
    detection_window: int  # seconds
    threshold: float


class MonitoringService:
    """Main monitoring service"""

    def __init__(
        self,
        redis_url: str,
        influxdb_url: str,
        influxdb_token: str,
        influxdb_org: str,
        eth_service: EthereumService,
        notification_config: Dict[str, Any],
        prometheus_port: int = 9090,
    ):
        """
        Initialize monitoring service.

        Args:
            redis_url: Redis connection URL
            influxdb_url: InfluxDB connection URL
            influxdb_token: InfluxDB authentication token
            influxdb_org: InfluxDB organization
            eth_service: Ethereum service instance
            notification_config: Notification channel configuration
            prometheus_port: Prometheus metrics port
        """
        self.redis = aioredis.from_url(redis_url)
        self.influxdb = InfluxDBClientAsync(
            url=influxdb_url, token=influxdb_token, org=influxdb_org
        )
        self.eth_service = eth_service

        # Initialize notification channels
        self.notifiers = {
            "email": EmailNotifier(notification_config.get("email", {})),
            "sms": SMSNotifier(notification_config.get("sms", {})),
            "webhook": WebhookNotifier(notification_config.get("webhook", {})),
        }

        # Initialize Prometheus metrics
        self.metrics = self._setup_metrics()
        start_http_server(prometheus_port)

        # Alert management
        self._alert_rules: Dict[UUID, AlertRule] = {}
        self._active_alerts: Dict[UUID, Alert] = {}

        # Anomaly detection
        self._anomaly_detectors: Dict[str, AnomalyDetector] = {}
        self._baseline_data: Dict[str, List[float]] = {}

        # Component health tracking
        self._component_health: Dict[str, Dict[str, Any]] = {}
        self._last_heartbeat: Dict[str, datetime] = {}

        # Performance tracking
        self._performance_baselines: Dict[str, Dict[str, float]] = {}

    def _setup_metrics(self) -> Dict[str, Any]:
        """Setup Prometheus metrics"""
        return {
            # Oracle metrics
            "oracle_updates": Counter(
                "oracle_updates_total",
                "Total number of oracle updates",
                ["contract_id", "status"],
            ),
            "oracle_update_duration": Histogram(
                "oracle_update_duration_seconds",
                "Oracle update duration",
                ["contract_id"],
            ),
            "oracle_price": Gauge(
                "oracle_price", "Current oracle price", ["contract_id", "pair"]
            ),
            # Data source metrics
            "source_latency": Histogram(
                "source_latency_seconds", "Data source response latency", ["source_id"]
            ),
            "source_errors": Counter(
                "source_errors_total", "Data source errors", ["source_id", "error_type"]
            ),
            # Task metrics
            "task_executions": Counter(
                "task_executions_total", "Task execution count", ["task_id", "status"]
            ),
            "task_duration": Histogram(
                "task_duration_seconds", "Task execution duration", ["task_id"]
            ),
            # System metrics
            "system_memory": Gauge("system_memory_bytes", "System memory usage"),
            "system_cpu": Gauge("system_cpu_percent", "System CPU usage"),
        }

    async def initialize(self):
        """Initialize monitoring service"""
        await self._load_alert_rules()
        await self._load_anomaly_detectors()
        await self._load_performance_baselines()

        # Start background tasks
        asyncio.create_task(self._monitor_component_health())
        asyncio.create_task(self._process_alerts())
        asyncio.create_task(self._cleanup_old_data())
        asyncio.create_task(self._update_performance_baselines())

    async def _load_alert_rules(self):
        """Load alert rules from storage"""
        rules_data = await self.redis.hgetall("alert_rules")
        for rule_id, data in rules_data.items():
            rule = AlertRule(**json.loads(data))
            self._alert_rules[rule.rule_id] = rule

    async def _load_anomaly_detectors(self):
        """Load anomaly detector configurations"""
        detector_data = await self.redis.hgetall("anomaly_detectors")
        for metric_name, data in detector_data.items():
            detector = AnomalyDetector(**json.loads(data))
            self._anomaly_detectors[metric_name] = detector

    async def _load_performance_baselines(self):
        """Load performance baseline data"""
        baseline_data = await self.redis.hgetall("performance_baselines")
        for metric_name, data in baseline_data.items():
            self._performance_baselines[metric_name] = json.loads(data)

    async def record_metric(
        self,
        name: str,
        value: float,
        labels: Dict[str, str] = None,
        timestamp: Optional[datetime] = None,
    ):
        """
        Record metric value.

        Args:
            name: Metric name
            value: Metric value
            labels: Metric labels
            timestamp: Optional timestamp
        """
        # Update Prometheus metric
        if name in self.metrics:
            metric = self.metrics[name]
            if labels:
                metric.labels(**labels).observe(value)
            else:
                metric.observe(value)

        # Store in InfluxDB
        point = {
            "measurement": name,
            "tags": labels or {},
            "fields": {"value": value},
            "time": timestamp or datetime.utcnow(),
        }

        async with self.influxdb.write_api() as writer:
            await writer.write("oracle_metrics", "oracular", [point])

        # Check for anomalies
        if name in self._anomaly_detectors:
            await self._check_anomaly(name, value, labels)

    async def _check_anomaly(
        self, metric_name: str, value: float, labels: Dict[str, str]
    ):
        """Check for metric anomalies"""
        detector = self._anomaly_detectors[metric_name]

        # Get historical data
        if metric_name not in self._baseline_data:
            self._baseline_data[metric_name] = []

        data = self._baseline_data[metric_name]
        data.append(value)

        # Trim old data
        cutoff_time = time.time() - detector.training_window
        while data and data[0] < cutoff_time:
            data.pop(0)

        # Detect anomalies based on algorithm
        is_anomaly = False

        if detector.algorithm == "zscore":
            if len(data) >= 30:  # Minimum sample size for z-score
                z_score = abs(stats.zscore(data)[-1])
                is_anomaly = z_score > detector.threshold

        elif detector.algorithm == "iqr":
            if len(data) >= 10:  # Minimum sample size for IQR
                q1, q3 = np.percentile(data, [25, 75])
                iqr = q3 - q1
                lower_bound = q1 - detector.threshold * iqr
                upper_bound = q3 + detector.threshold * iqr
                is_anomaly = value < lower_bound or value > upper_bound

        elif detector.algorithm == "ewma":
            if len(data) >= 10:
                ewma = data[0]
                alpha = 0.1  # Smoothing factor
                for x in data[1:]:
                    ewma = alpha * x + (1 - alpha) * ewma
                deviation = abs(value - ewma)
                is_anomaly = deviation > detector.threshold

        if is_anomaly:
            await self._create_alert(
                severity=AlertSeverity.HIGH,
                component=ComponentType.ORACLE,
                message=f"Anomaly detected in {metric_name}",
                details={
                    "metric_name": metric_name,
                    "value": value,
                    "labels": labels,
                    "algorithm": detector.algorithm,
                    "threshold": detector.threshold,
                },
            )

    async def _create_alert(
        self,
        severity: AlertSeverity,
        component: ComponentType,
        message: str,
        details: Dict[str, Any],
    ):
        """Create and process new alert"""
        alert = Alert(
            alert_id=UUID.uuid4(),
            rule_id=None,  # For anomaly-based alerts
            severity=severity,
            component=component,
            message=message,
            details=details,
            created_at=datetime.utcnow(),
        )

        self._active_alerts[alert.alert_id] = alert

        # Send notifications
        for channel in ["email", "sms", "webhook"]:
            if channel in self.notifiers:
                await self.notifiers[channel].send_alert(alert)

    async def _monitor_component_health(self):
        """Monitor health of system components"""
        while True:
            try:
                now = datetime.utcnow()

                # Check component heartbeats
                for component, last_beat in self._last_heartbeat.items():
                    if now - last_beat > timedelta(minutes=5):
                        await self._create_alert(
                            severity=AlertSeverity.CRITICAL,
                            component=ComponentType.ORACLE,
                            message=f"Component {component} is not responding",
                            details={"last_heartbeat": last_beat.isoformat()},
                        )

                # Check system resources
                memory_usage = await self._get_system_memory()
                cpu_usage = await self._get_system_cpu()

                self.metrics["system_memory"].set(memory_usage)
                self.metrics["system_cpu"].set(cpu_usage)

                if memory_usage > 90:  # 90% memory usage
                    await self._create_alert(
                        severity=AlertSeverity.HIGH,
                        component=ComponentType.ORACLE,
                        message="High memory usage detected",
                        details={"memory_usage": memory_usage},
                    )

                # Attempt self-healing
                await self._attempt_self_healing()

            except Exception as e:
                logger.error(f"Error in health monitoring: {str(e)}")

            await asyncio.sleep(60)

    async def _attempt_self_healing(self):
        """Attempt to recover from known failure conditions"""
        try:
            # Check for stuck tasks
            task_data = await self.redis.hgetall("task_executions")
            for exec_id, data in task_data.items():
                execution = json.loads(data)
                if execution["status"] in ["RUNNING", "PENDING"]:
                    start_time = datetime.fromisoformat(execution["start_time"])
                    if datetime.utcnow() - start_time > timedelta(hours=1):
                        # Attempt to restart stuck task
                        await self.redis.hdel("task_executions", exec_id)
                        logger.info(f"Cleaned up stuck task execution: {exec_id}")

            # Check for disconnected data sources
            source_data = await self.redis.hgetall("data_sources")
            for source_id, data in source_data.items():
                source = json.loads(data)
                if not source.get("connected", True):
                    # Attempt to reconnect
                    try:
                        # Implementation depends on data source type
                        pass
                    except Exception as e:
                        logger.error(
                            f"Failed to reconnect source {source_id}: {str(e)}"
                        )

        except Exception as e:
            logger.error(f"Error in self-healing: {str(e)}")

    async def _process_alerts(self):
        """Process and update alert status"""
        while True:
            try:
                now = datetime.utcnow()

                # Check alert rules
                for rule in self._alert_rules.values():
                    if not rule.enabled:
                        continue

                    if rule.last_triggered and now - rule.last_triggered < timedelta(
                        seconds=rule.cooldown_period
                    ):
                        continue

                    # Evaluate rule condition
                    try:
                        if await self._evaluate_alert_condition(rule):
                            await self._create_alert(
                                severity=rule.severity,
                                component=rule.component,
                                message=rule.description,
                                details={"rule_id": str(rule.rule_id)},
                            )
                            rule.last_triggered = now
                    except Exception as e:
                        logger.error(
                            f"Error evaluating alert rule {rule.rule_id}: {str(e)}"
                        )

                # Update alert status
                for alert in list(self._active_alerts.values()):
                    if alert.resolved_at:
                        if now - alert.resolved_at > timedelta(hours=24):
                            del self._active_alerts[alert.alert_id]

            except Exception as e:
                logger.error(f"Error in alert processing: {str(e)}")

            await asyncio.sleep(10)

    async def _evaluate_alert_condition(self, rule: AlertRule) -> bool:
        """Evaluate alert rule condition"""
        try:
            # Query metric data
            query = f"""
                from(bucket: "oracle_metrics")
                    |> range(start: -{rule.lookback_window}s)
                    |> filter(fn: (r) => r["_measurement"] == "{rule.name}")
            """

            result = await self.influxdb.query_api().query(query)

            # Convert to Python data structure
            data = []
            for table in result:
                for record in table.records:
                    data.append(record.get_value())

            # Evaluate condition
            locals_dict = {
                "data": data,
                "np": np,
                "stats": stats,
                "len": len,
                "sum": sum,
                "min": min,
                "max": max,
                "avg": statistics.mean,
                "std": statistics.stdev if len(data) > 1 else lambda x: 0,
            }

            return eval(rule.condition, {"__builtins__": {}}, locals_dict)

        except Exception as e:
            logger.error(f"Error evaluating condition: {str(e)}")
            return False

    async def _cleanup_old_data(self):
        """Clean up old monitoring data"""
        while True:
            try:
                # Clean up old metrics
                retention_days = 30
                delete_query = f"""
                    from(bucket: "oracle_metrics")
                        |> range(start: -inf, stop: -{retention_days}d)
                        |> drop()
                """
                await self.influxdb.delete_api().delete(delete_query)

                # Clean up old alerts
                for alert_id, alert in list(self._active_alerts.items()):
                    if (
                        alert.resolved_at
                        and datetime.utcnow() - alert.resolved_at > timedelta(days=7)
                    ):
                        del self._active_alerts[alert_id]

            except Exception as e:
                logger.error(f"Error in data cleanup: {str(e)}")

            await asyncio.sleep(3600 * 24)  # Run daily

    async def _update_performance_baselines(self):
        """Update performance baseline metrics"""
        while True:
            try:
                # Calculate new baselines
                for metric_name in self._performance_baselines.keys():
                    query = f"""
                        from(bucket: "oracle_metrics")
                            |> range(start: -7d)
                            |> filter(fn: (r) => r["_measurement"] == "{metric_name}")
                            |> mean()
                    """

                    result = await self.influxdb.query_api().query(query)

                    if result:
                        new_baseline = result[0].records[0].get_value()
                        old_baseline = self._performance_baselines[metric_name].get(
                            "value", 0
                        )

                        # Check for significant changes
                        if (
                            abs(new_baseline - old_baseline) / old_baseline > 0.1
                        ):  # 10% change
                            await self._create_alert(
                                severity=AlertSeverity.MEDIUM,
                                component=ComponentType.ORACLE,
                                message=f"Performance baseline shift detected for {metric_name}",
                                details={
                                    "old_baseline": old_baseline,
                                    "new_baseline": new_baseline,
                                    "change_percent": (new_baseline - old_baseline)
                                    / old_baseline
                                    * 100,
                                },
                            )

                        self._performance_baselines[metric_name] = {
                            "value": new_baseline,
                            "updated_at": datetime.utcnow().isoformat(),
                        }

                # Save updated baselines
                for metric_name, baseline in self._performance_baselines.items():
                    await self.redis.hset(
                        "performance_baselines", metric_name, json.dumps(baseline)
                    )

            except Exception as e:
                logger.error(f"Error updating performance baselines: {str(e)}")

            await asyncio.sleep(3600 * 24)  # Run daily

    async def _get_system_memory(self) -> float:
        """Get system memory usage percentage"""
        # Implementation depends on system
        return 0.0

    async def _get_system_cpu(self) -> float:
        """Get system CPU usage percentage"""
        # Implementation depends on system
        return 0.0

    async def record_heartbeat(self, component: str):
        """Record component heartbeat"""
        self._last_heartbeat[component] = datetime.utcnow()

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for system dashboard"""
        return {
            "active_alerts": len(self._active_alerts),
            "component_health": self._component_health,
            "performance_metrics": self._performance_baselines,
            "system_metrics": {
                "memory": self.metrics["system_memory"]._value.get(),
                "cpu": self.metrics["system_cpu"]._value.get(),
            },
        }
