"""
Validation service for Oracular.
Provides comprehensive data validation throughout the oracle pipeline with
multi-stage validation, source-specific rules, and advanced validation techniques.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import UUID, uuid4

import numpy as np
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from scipy import stats

from backend.monitoring.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)


class ValidationStage(Enum):
    """Validation pipeline stages"""

    SOURCE = auto()  # Individual source validation
    CROSS_SOURCE = auto()  # Cross-source comparison
    TEMPORAL = auto()  # Time-based validation
    CONSENSUS = auto()  # Multi-source consensus
    CRYPTOGRAPHIC = auto()  # Signature verification
    FORMAL = auto()  # Formal verification of transformations


class ValidationSeverity(Enum):
    """Validation finding severity levels"""

    CRITICAL = auto()  # Must block
    HIGH = auto()  # Should block
    MEDIUM = auto()  # Warning
    LOW = auto()  # Informational


class AnomalyType(Enum):
    """Types of data anomalies"""

    STATISTICAL_OUTLIER = auto()  # Statistical deviation
    RAPID_CHANGE = auto()  # Suspicious price movement
    VOLUME_MISMATCH = auto()  # Volume vs price inconsistency
    CONSENSUS_DEVIATION = auto()  # Deviation from consensus
    PATTERN_BREAK = auto()  # Break in historical pattern
    MANIPULATION_SUSPECT = auto()  # Potential manipulation


@dataclass
class ValidationRule:
    """Validation rule definition"""

    rule_id: UUID
    name: str
    description: str
    stage: ValidationStage
    severity: ValidationSeverity
    source_types: Set[str]  # Applicable source types
    condition: str  # Python expression
    parameters: Dict[str, Any]
    enabled: bool = True


@dataclass
class ValidationFinding:
    """Validation finding details"""

    finding_id: UUID
    rule_id: UUID
    source_id: str
    stage: ValidationStage
    severity: ValidationSeverity
    anomaly_type: Optional[AnomalyType]
    message: str
    details: Dict[str, Any]
    timestamp: datetime


@dataclass
class SourceStats:
    """Source-specific statistics"""

    mean: float
    std_dev: float
    min_value: float
    max_value: float
    last_update: datetime
    update_frequency: float
    confidence_score: float


class ValidationService:
    """Main validation service implementing multi-stage validation pipeline"""

    def __init__(
        self,
        monitor: Optional[MonitoringService] = None,
        history_window: int = 3600,  # 1 hour
        min_history_points: int = 10,
        confidence_threshold: float = 0.8,
        max_source_deviation: float = 0.1,  # 10%
        rapid_change_threshold: float = 0.05,  # 5%
        min_consensus_sources: int = 3,
    ):
        """
        Initialize validation service.

        Args:
            monitor: Performance monitoring instance
            history_window: Historical data window in seconds
            min_history_points: Minimum required history points
            confidence_threshold: Minimum required confidence score
            max_source_deviation: Maximum allowed source deviation
            rapid_change_threshold: Threshold for rapid change detection
            min_consensus_sources: Minimum sources for consensus
        """
        self.monitor = monitor
        self.history_window = history_window
        self.min_history_points = min_history_points
        self.confidence_threshold = confidence_threshold
        self.max_source_deviation = max_source_deviation
        self.rapid_change_threshold = rapid_change_threshold
        self.min_consensus_sources = min_consensus_sources

        # Validation state
        self._rules: Dict[UUID, ValidationRule] = {}
        self._findings: List[ValidationFinding] = []
        self._source_stats: Dict[str, SourceStats] = {}
        self._historical_data: Dict[str, List[Tuple[datetime, float]]] = {}
        self._source_signatures: Dict[str, RSAPublicKey] = {}

        # Initialize default rules
        self._initialize_default_rules()

    def _initialize_default_rules(self):
        """Initialize default validation rules"""
        rules = [
            ValidationRule(
                rule_id=uuid4(),
                name="basic_range_check",
                description="Validate value within allowed range",
                stage=ValidationStage.SOURCE,
                severity=ValidationSeverity.CRITICAL,
                source_types={"all"},
                condition="min_value <= value <= max_value",
                parameters={"min_value": 0, "max_value": float("inf")},
            ),
            ValidationRule(
                rule_id=uuid4(),
                name="statistical_outlier",
                description="Detect statistical outliers",
                stage=ValidationStage.SOURCE,
                severity=ValidationSeverity.HIGH,
                source_types={"price", "rate"},
                condition="abs(zscore) <= threshold",
                parameters={"threshold": 3.0},
            ),
            ValidationRule(
                rule_id=uuid4(),
                name="rapid_change",
                description="Detect suspicious rapid changes",
                stage=ValidationStage.TEMPORAL,
                severity=ValidationSeverity.HIGH,
                source_types={"price", "rate"},
                condition="abs(pct_change) <= threshold",
                parameters={"threshold": 0.05, "min_interval": 60},
            ),
            ValidationRule(
                rule_id=uuid4(),
                name="volume_weighted",
                description="Volume-weighted price validation",
                stage=ValidationStage.CROSS_SOURCE,
                severity=ValidationSeverity.MEDIUM,
                source_types={"price"},
                condition="abs(vwap_deviation) <= threshold",
                parameters={"threshold": 0.02},
            ),
            ValidationRule(
                rule_id=uuid4(),
                name="consensus_check",
                description="Multi-source consensus validation",
                stage=ValidationStage.CONSENSUS,
                severity=ValidationSeverity.HIGH,
                source_types={"all"},
                condition="consensus_deviation <= threshold",
                parameters={"threshold": 0.1, "min_sources": 3},
            ),
        ]

        for rule in rules:
            self._rules[rule.rule_id] = rule

    async def validate_data_point(
        self,
        source_id: str,
        source_type: str,
        value: float,
        timestamp: datetime,
        metadata: Optional[Dict[str, Any]] = None,
        signature: Optional[bytes] = None,
    ) -> Tuple[bool, List[ValidationFinding]]:
        """
        Validate single data point through all applicable stages.

        Args:
            source_id: Data source identifier
            source_type: Type of data source
            value: Data value
            timestamp: Data timestamp
            metadata: Optional metadata
            signature: Optional cryptographic signature

        Returns:
            Tuple of (is_valid, findings)
        """
        findings = []
        metadata = metadata or {}

        # Update historical data
        if source_id not in self._historical_data:
            self._historical_data[source_id] = []
        self._historical_data[source_id].append((timestamp, value))

        # Clean old data
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.history_window)
        self._historical_data[source_id] = [
            (ts, val)
            for ts, val in self._historical_data[source_id]
            if ts > cutoff_time
        ]

        # Stage 1: Source Validation
        source_valid = await self._validate_source(
            source_id, source_type, value, timestamp, metadata, findings
        )
        if not source_valid:
            return False, findings

        # Stage 2: Cross-Source Validation
        cross_valid = await self._validate_cross_source(
            source_id, source_type, value, findings
        )
        if not cross_valid:
            return False, findings

        # Stage 3: Temporal Validation
        temporal_valid = await self._validate_temporal(
            source_id, source_type, value, timestamp, findings
        )
        if not temporal_valid:
            return False, findings

        # Stage 4: Consensus Validation
        consensus_valid = await self._validate_consensus(
            source_id, source_type, value, findings
        )
        if not consensus_valid:
            return False, findings

        # Stage 5: Cryptographic Validation
        if signature:
            crypto_valid = await self._validate_cryptographic(
                source_id, value, timestamp, signature, findings
            )
            if not crypto_valid:
                return False, findings

        # Update source statistics
        await self._update_source_stats(source_id, value, timestamp)

        return True, findings

    async def _validate_source(
        self,
        source_id: str,
        source_type: str,
        value: float,
        timestamp: datetime,
        metadata: Dict[str, Any],
        findings: List[ValidationFinding],
    ) -> bool:
        """Validate individual source data"""
        is_valid = True

        # Get applicable rules
        rules = [
            rule
            for rule in self._rules.values()
            if rule.stage == ValidationStage.SOURCE
            and (rule.source_types == {"all"} or source_type in rule.source_types)
        ]

        for rule in rules:
            try:
                # Prepare validation context
                context = {
                    "value": value,
                    "timestamp": timestamp,
                    **metadata,
                    **rule.parameters,
                }

                # Evaluate rule condition
                if not eval(rule.condition, {"__builtins__": {}}, context):
                    finding = ValidationFinding(
                        finding_id=uuid4(),
                        rule_id=rule.rule_id,
                        source_id=source_id,
                        stage=ValidationStage.SOURCE,
                        severity=rule.severity,
                        anomaly_type=AnomalyType.STATISTICAL_OUTLIER,
                        message=f"Source validation failed: {rule.description}",
                        details={"value": value, "context": context},
                        timestamp=datetime.utcnow(),
                    )
                    findings.append(finding)

                    if rule.severity in (
                        ValidationSeverity.CRITICAL,
                        ValidationSeverity.HIGH,
                    ):
                        is_valid = False

            except Exception as e:
                logger.error(f"Error in source validation: {str(e)}")
                is_valid = False

        return is_valid

    async def _validate_cross_source(
        self,
        source_id: str,
        source_type: str,
        value: float,
        findings: List[ValidationFinding],
    ) -> bool:
        """Validate data against other sources"""
        if len(self._source_stats) < 2:
            return True

        is_valid = True
        other_sources = {
            sid: stats for sid, stats in self._source_stats.items() if sid != source_id
        }

        # Calculate cross-source statistics
        all_values = [stats.mean for stats in other_sources.values()]
        all_values.append(value)

        mean = np.mean(all_values)
        std = np.std(all_values)

        # Check for significant deviation
        if std > 0:
            z_score = abs((value - mean) / std)
            if z_score > 3.0:  # 3 sigma rule
                finding = ValidationFinding(
                    finding_id=uuid4(),
                    rule_id=uuid4(),  # Create specific rule
                    source_id=source_id,
                    stage=ValidationStage.CROSS_SOURCE,
                    severity=ValidationSeverity.HIGH,
                    anomaly_type=AnomalyType.CONSENSUS_DEVIATION,
                    message="Significant deviation from other sources",
                    details={
                        "value": value,
                        "mean": mean,
                        "std": std,
                        "z_score": z_score,
                    },
                    timestamp=datetime.utcnow(),
                )
                findings.append(finding)
                is_valid = False

        return is_valid

    async def _validate_temporal(
        self,
        source_id: str,
        source_type: str,
        value: float,
        timestamp: datetime,
        findings: List[ValidationFinding],
    ) -> bool:
        """Validate temporal characteristics of data"""
        if source_id not in self._historical_data:
            return True

        history = self._historical_data[source_id]
        if len(history) < self.min_history_points:
            return True

        is_valid = True

        # Check for rapid changes
        if len(history) >= 2:
            last_value = history[-2][1]
            time_diff = (timestamp - history[-2][0]).total_seconds()

            if time_diff > 0:
                change_rate = abs(value - last_value) / (last_value * time_diff)

                if change_rate > self.rapid_change_threshold:
                    finding = ValidationFinding(
                        finding_id=uuid4(),
                        rule_id=uuid4(),  # Create specific rule
                        source_id=source_id,
                        stage=ValidationStage.TEMPORAL,
                        severity=ValidationSeverity.HIGH,
                        anomaly_type=AnomalyType.RAPID_CHANGE,
                        message="Suspicious rapid value change",
                        details={
                            "value": value,
                            "last_value": last_value,
                            "change_rate": change_rate,
                            "time_diff": time_diff,
                        },
                        timestamp=datetime.utcnow(),
                    )
                    findings.append(finding)
                    is_valid = False

        # Check for pattern breaks using historical volatility
        values = [v for _, v in history]
        if len(values) >= 30:  # Need sufficient history
            volatility = np.std(np.diff(np.log(values)))
            current_return = np.log(value / values[-1])

            if abs(current_return) > 3 * volatility:  # 3 sigma rule
                finding = ValidationFinding(
                    finding_id=uuid4(),
                    rule_id=uuid4(),  # Create specific rule
                    source_id=source_id,
                    stage=ValidationStage.TEMPORAL,
                    severity=ValidationSeverity.MEDIUM,
                    anomaly_type=AnomalyType.PATTERN_BREAK,
                    message="Break in historical pattern detected",
                    details={
                        "value": value,
                        "volatility": volatility,
                        "return": current_return,
                    },
                    timestamp=datetime.utcnow(),
                )
                findings.append(finding)

        return is_valid

    async def _validate_consensus(
        self,
        source_id: str,
        source_type: str,
        value: float,
        findings: List[ValidationFinding],
    ) -> bool:
        """Validate consensus across multiple sources"""
        if len(self._source_stats) < self.min_consensus_sources:
            return True

        is_valid = True

        # Calculate median and MAD
        all_values = [stats.mean for stats in self._source_stats.values()]
        median = np.median(all_values)
        mad = stats.median_abs_deviation(all_values)

        if mad > 0:
            deviation = abs(value - median) / mad
            if deviation > 3.0:  # Modified z-score
                finding = ValidationFinding(
                    finding_id=uuid4(),
                    rule_id=uuid4(),  # Create specific rule
                    source_id=source_id,
                    stage=ValidationStage.CONSENSUS,
                    severity=ValidationSeverity.HIGH,
                    anomaly_type=AnomalyType.CONSENSUS_DEVIATION,
                    message="Significant deviation from consensus",
                    details={
                        "value": value,
                        "median": median,
                        "mad": mad,
                        "deviation": deviation,
                    },
                    timestamp=datetime.utcnow(),
                )
                findings.append(finding)
                is_valid = False

        return is_valid

    async def _validate_cryptographic(
        self,
        source_id: str,
        value: float,
        timestamp: datetime,
        signature: bytes,
        findings: List[ValidationFinding],
    ) -> bool:
        """Validate cryptographic signatures"""
        if source_id not in self._source_signatures:
            return True

        try:
            # Create message
            message = f"{source_id}:{value}:{timestamp.isoformat()}".encode()

            # Verify signature
            self._source_signatures[source_id].verify(
                signature,
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH,
                ),
                hashes.SHA256(),
            )
            return True

        except InvalidSignature:
            finding = ValidationFinding(
                finding_id=uuid4(),
                rule_id=uuid4(),  # Create specific rule
                source_id=source_id,
                stage=ValidationStage.CRYPTOGRAPHIC,
                severity=ValidationSeverity.CRITICAL,
                anomaly_type=None,
                message="Invalid cryptographic signature",
                details={"timestamp": timestamp.isoformat()},
                timestamp=datetime.utcnow(),
            )
            findings.append(finding)
            return False

        except Exception as e:
            logger.error(f"Error in cryptographic validation: {str(e)}")
            return False

    async def _update_source_stats(
        self, source_id: str, value: float, timestamp: datetime
    ):
        """Update source statistics"""
        if source_id not in self._historical_data:
            return

        history = self._historical_data[source_id]
        values = [v for _, v in history]

        if len(values) >= self.min_history_points:
            mean = np.mean(values)
            std_dev = np.std(values)
            min_value = min(values)
            max_value = max(values)

            # Calculate update frequency
            times = [ts for ts, _ in history]
            intervals = np.diff([t.timestamp() for t in times])
            update_frequency = np.mean(intervals) if len(intervals) > 0 else 0

            # Calculate confidence score
            recency = 1.0  # Decay factor for old data
            consistency = 1.0 - (std_dev / mean if mean != 0 else 0)
            update_regularity = 1.0 - (
                np.std(intervals) / update_frequency if update_frequency > 0 else 0
            )

            confidence_score = (recency + consistency + update_regularity) / 3

            self._source_stats[source_id] = SourceStats(
                mean=mean,
                std_dev=std_dev,
                min_value=min_value,
                max_value=max_value,
                last_update=timestamp,
                update_frequency=update_frequency,
                confidence_score=confidence_score,
            )

    async def register_source_key(self, source_id: str, public_key: RSAPublicKey):
        """Register source public key for signature verification"""
        self._source_signatures[source_id] = public_key

    async def add_validation_rule(self, rule: ValidationRule):
        """Add new validation rule"""
        self._rules[rule.rule_id] = rule

    async def update_rule_parameters(self, rule_id: UUID, parameters: Dict[str, Any]):
        """Update validation rule parameters"""
        if rule_id in self._rules:
            self._rules[rule_id].parameters.update(parameters)

    async def get_source_stats(self, source_id: str) -> Optional[SourceStats]:
        """Get statistics for specific source"""
        return self._source_stats.get(source_id)

    async def get_findings(
        self,
        source_id: Optional[str] = None,
        severity: Optional[ValidationSeverity] = None,
        stage: Optional[ValidationStage] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[ValidationFinding]:
        """Get filtered validation findings"""
        findings = self._findings

        if source_id:
            findings = [f for f in findings if f.source_id == source_id]

        if severity:
            findings = [f for f in findings if f.severity == severity]

        if stage:
            findings = [f for f in findings if f.stage == stage]

        if start_time:
            findings = [f for f in findings if f.timestamp >= start_time]

        if end_time:
            findings = [f for f in findings if f.timestamp <= end_time]

        return findings
