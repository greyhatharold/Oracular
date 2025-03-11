"""
Oracle Designer - Conversational Architecture for Oracle Specification

This module provides a sophisticated conversational interface for translating
natural language intent into formal oracle specifications through an iterative 
dialogue process. It implements semantic parsing, conceptual model building,
clarification generation, context tracking, and other advanced NLP capabilities.
"""

import json
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple, Set, Union, Callable
from redis import Redis

from backend.validation.validation_service import ValidationService
from src.backend.ai.external_ai_service import ExternalAIService, ModelConfig
from src.backend.ai.langchain_service import LangChainService
from src.backend.ai.specification_converter import SpecificationConverter, SpecificationFormat

# Configure logging
logger = logging.getLogger(__name__)


class SpecificationConfidence(Enum):
    """Confidence levels for different aspects of oracle specifications"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNDEFINED = "undefined"


class AggregationMethod(Enum):
    """Supported data aggregation methods"""
    MEAN = "mean"
    MEDIAN = "median"
    MODE = "mode"
    MIN = "min"
    MAX = "max"
    WEIGHTED_AVERAGE = "weighted_average"
    CUSTOM = "custom"


class UpdateFrequency(Enum):
    """Standard update frequency options"""
    REAL_TIME = "real_time"
    SECONDS = "seconds"
    MINUTES = "minutes"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class ValidationMethod(Enum):
    """Validation methods for oracle data"""
    RANGE_CHECK = "range_check"
    OUTLIER_DETECTION = "outlier_detection"
    SOURCE_CONSENSUS = "source_consensus"
    HISTORICAL_CONSISTENCY = "historical_consistency"
    CRYPTOGRAPHIC_PROOF = "cryptographic_proof"
    CUSTOM = "custom"


@dataclass
class DataSourceSpec:
    """Specification for a data source"""
    name: str
    type: str
    endpoint: Optional[str] = None
    api_key_required: bool = False
    authentication_method: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    reputation_score: float = 0.0
    confidence: SpecificationConfidence = SpecificationConfidence.UNDEFINED


@dataclass
class ValidationSpec:
    """Specification for data validation"""
    method: ValidationMethod
    parameters: Dict[str, Any] = field(default_factory=dict)
    confidence: SpecificationConfidence = SpecificationConfidence.UNDEFINED


@dataclass
class AggregationSpec:
    """Specification for data aggregation"""
    method: AggregationMethod
    parameters: Dict[str, Any] = field(default_factory=dict)
    confidence: SpecificationConfidence = SpecificationConfidence.UNDEFINED


@dataclass
class UpdateSpec:
    """Specification for update behavior"""
    frequency: UpdateFrequency
    value: int = 0  # Value associated with the frequency (e.g., 5 for 5 minutes)
    conditions: List[str] = field(default_factory=list)
    confidence: SpecificationConfidence = SpecificationConfidence.UNDEFINED


@dataclass
class OracleSpecification:
    """Complete oracle specification built through conversation"""
    name: str
    description: str
    data_type: str
    data_sources: List[DataSourceSpec] = field(default_factory=list)
    validation: List[ValidationSpec] = field(default_factory=list)
    aggregation: AggregationSpec = field(default_factory=lambda: AggregationSpec(
        method=AggregationMethod.MEAN,
        confidence=SpecificationConfidence.UNDEFINED
    ))
    update_behavior: UpdateSpec = field(default_factory=lambda: UpdateSpec(
        frequency=UpdateFrequency.HOURLY,
        confidence=SpecificationConfidence.UNDEFINED
    ))
    custom_logic: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    version: int = 1
    status: str = "draft"
    confidence_score: float = 0.0  # Overall confidence in specification completeness

    def to_dict(self) -> Dict[str, Any]:
        """Convert specification to dictionary"""
        result = asdict(self)
        # Convert enum values to strings
        result['aggregation']['method'] = self.aggregation.method.value
        result['update_behavior']['frequency'] = self.update_behavior.frequency.value
        result['validation'] = [
            {**v, 'method': v['method'].value} 
            for v in result['validation']
        ]
        # Convert confidence values
        result['aggregation']['confidence'] = self.aggregation.confidence.value
        result['update_behavior']['confidence'] = self.update_behavior.confidence.value
        result['data_sources'] = [
            {**ds, 'confidence': ds['confidence'].value} 
            for ds in result['data_sources']
        ]
        # Convert datetime to ISO format
        result['created_at'] = self.created_at.isoformat()
        result['updated_at'] = self.updated_at.isoformat()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'OracleSpecification':
        """Create specification from dictionary"""
        # Convert string values to enums
        if 'aggregation' in data and 'method' in data['aggregation']:
            data['aggregation']['method'] = AggregationMethod(data['aggregation']['method'])
        if 'update_behavior' in data and 'frequency' in data['update_behavior']:
            data['update_behavior']['frequency'] = UpdateFrequency(data['update_behavior']['frequency'])
        
        # Convert confidence values
        if 'aggregation' in data and 'confidence' in data['aggregation']:
            data['aggregation']['confidence'] = SpecificationConfidence(data['aggregation']['confidence'])
        if 'update_behavior' in data and 'confidence' in data['update_behavior']:
            data['update_behavior']['confidence'] = SpecificationConfidence(data['update_behavior']['confidence'])
        
        # Convert validation methods
        if 'validation' in data:
            for v in data['validation']:
                if 'method' in v:
                    v['method'] = ValidationMethod(v['method'])
                if 'confidence' in v:
                    v['confidence'] = SpecificationConfidence(v['confidence'])
        
        # Convert data source confidence values
        if 'data_sources' in data:
            for ds in data['data_sources']:
                if 'confidence' in ds:
                    ds['confidence'] = SpecificationConfidence(ds['confidence'])
        
        # Convert datetime strings to datetime objects
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        
        return cls(**data)


class IntentParser:
    """
    Semantic parser that extracts key elements of oracle requests from natural language.
    Uses pattern matching and NLP techniques to identify relevant components.
    """
    
    def __init__(self):
        self.data_source_patterns = [
            r'(?:use|from|source|get|retrieve)\s+(?:data\s+)?(?:from|via|using)?\s+([a-zA-Z0-9\s]+)',
            r'([a-zA-Z0-9\s]+)\s+(?:api|feed|source|endpoint)'
        ]
        self.update_frequency_patterns = {
            UpdateFrequency.REAL_TIME: [r'real[-\s]time', r'continuous', r'live', r'streaming'],
            UpdateFrequency.SECONDS: [r'every\s+(\d+)\s+seconds', r'(\d+)\s+seconds'],
            UpdateFrequency.MINUTES: [r'every\s+(\d+)\s+minutes', r'(\d+)\s+minutes'],
            UpdateFrequency.HOURLY: [r'hourly', r'every\s+hour', r'each\s+hour'],
            UpdateFrequency.DAILY: [r'daily', r'every\s+day', r'each\s+day', r'once\s+a\s+day'],
            UpdateFrequency.WEEKLY: [r'weekly', r'every\s+week', r'each\s+week'],
            UpdateFrequency.MONTHLY: [r'monthly', r'every\s+month', r'each\s+month']
        }
        self.aggregation_patterns = {
            AggregationMethod.MEAN: [r'mean', r'average', r'avg'],
            AggregationMethod.MEDIAN: [r'median', r'middle'],
            AggregationMethod.MODE: [r'mode', r'most\s+common', r'most\s+frequent'],
            AggregationMethod.MIN: [r'minimum', r'min', r'lowest'],
            AggregationMethod.MAX: [r'maximum', r'max', r'highest'],
            AggregationMethod.WEIGHTED_AVERAGE: [r'weighted\s+average', r'weighted\s+mean']
        }
        self.validation_patterns = {
            ValidationMethod.RANGE_CHECK: [r'range\s+check', r'between', r'min.*max', r'lower.*upper'],
            ValidationMethod.OUTLIER_DETECTION: [r'outlier', r'anomaly', r'abnormal'],
            ValidationMethod.SOURCE_CONSENSUS: [r'consensus', r'agreement', r'majority'],
            ValidationMethod.HISTORICAL_CONSISTENCY: [r'historical', r'previous', r'past\s+data', r'time\s+series'],
            ValidationMethod.CRYPTOGRAPHIC_PROOF: [r'cryptographic', r'signed', r'verified', r'proof']
        }
    
    def parse_intent(self, text: str) -> Dict[str, Any]:
        """
        Parse natural language intent to extract key oracle components
        
        Args:
            text: Natural language description of oracle requirements
            
        Returns:
            Dictionary of extracted components
        """
        intent = {
            'data_sources': self._extract_data_sources(text),
            'update_frequency': self._extract_update_frequency(text),
            'aggregation_method': self._extract_aggregation_method(text),
            'validation_methods': self._extract_validation_methods(text),
            'data_type': self._extract_data_type(text),
            'description': text
        }
        
        return intent
    
    def _extract_data_sources(self, text: str) -> List[str]:
        """Extract potential data sources from text"""
        sources = []
        for pattern in self.data_source_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                source = match.group(1).strip()
                if source and len(source) > 2:  # Ignore very short matches
                    sources.append(source)
        return list(set(sources))  # Remove duplicates
    
    def _extract_update_frequency(self, text: str) -> Optional[Tuple[UpdateFrequency, int]]:
        """Extract update frequency information"""
        for freq, patterns in self.update_frequency_patterns.items():
            for pattern in patterns:
                matches = re.search(pattern, text, re.IGNORECASE)
                if matches:
                    # If pattern captures a number (e.g., "every 5 minutes")
                    if len(matches.groups()) > 0:
                        try:
                            value = int(matches.group(1))
                            return (freq, value)
                        except (IndexError, ValueError):
                            return (freq, 0)
                    else:
                        return (freq, 0)
        return None
    
    def _extract_aggregation_method(self, text: str) -> Optional[AggregationMethod]:
        """Extract aggregation method from text"""
        for method, patterns in self.aggregation_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return method
        return None
    
    def _extract_validation_methods(self, text: str) -> List[ValidationMethod]:
        """Extract validation methods from text"""
        methods = []
        for method, patterns in self.validation_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    methods.append(method)
        return methods
    
    def _extract_data_type(self, text: str) -> Optional[str]:
        """Attempt to extract the type of data being requested"""
        # Common data types in oracles
        data_types = {
            'price': [r'price', r'cost', r'value'],
            'weather': [r'weather', r'temperature', r'precipitation', r'forecast'],
            'sports': [r'sports', r'game', r'score', r'match'],
            'election': [r'election', r'vote', r'ballot', r'polling'],
            'financial': [r'financial', r'stock', r'market', r'index', r'exchange rate'],
            'random': [r'random', r'entropy', r'unpredictable']
        }
        
        for dtype, patterns in data_types.items():
            for pattern in patterns:
                if re.search(r'\b' + pattern + r'\b', text, re.IGNORECASE):
                    return dtype
        
        return None


class SpecificationBuilder:
    """
    Builds a structured oracle specification from conversation fragments
    across multiple dialogue turns.
    """
    
    def __init__(self, validation_service: Optional[ValidationService] = None):
        self.intent_parser = IntentParser()
        self.validation_service = validation_service
        self.current_spec: Optional[OracleSpecification] = None
    
    def initialize_spec(self, initial_request: str) -> OracleSpecification:
        """
        Initialize a new oracle specification from an initial request
        
        Args:
            initial_request: Natural language description of oracle requirements
            
        Returns:
            Initial oracle specification
        """
        intent = self.intent_parser.parse_intent(initial_request)
        
        # Create data source specifications
        data_sources = []
        for source_name in intent.get('data_sources', []):
            data_sources.append(DataSourceSpec(
                name=source_name,
                type="api",  # Default assumption
                confidence=SpecificationConfidence.LOW
            ))
        
        # Create validation specifications
        validations = []
        for validation_method in intent.get('validation_methods', []):
            validations.append(ValidationSpec(
                method=validation_method,
                confidence=SpecificationConfidence.LOW
            ))
        
        # Extract update frequency
        update_spec = UpdateSpec(
            frequency=UpdateFrequency.HOURLY,  # Default
            confidence=SpecificationConfidence.LOW
        )
        if intent.get('update_frequency'):
            freq, value = intent['update_frequency']
            update_spec = UpdateSpec(
                frequency=freq,
                value=value,
                confidence=SpecificationConfidence.MEDIUM
            )
        
        # Extract aggregation method
        agg_method = intent.get('aggregation_method', AggregationMethod.MEAN)
        if not agg_method:
            agg_method = AggregationMethod.MEAN
            
        aggregation_spec = AggregationSpec(
            method=agg_method,
            confidence=SpecificationConfidence.LOW
        )
        
        # Create initial specification
        self.current_spec = OracleSpecification(
            name=f"Oracle_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            description=intent.get('description', ''),
            data_type=intent.get('data_type', 'unknown'),
            data_sources=data_sources,
            validation=validations,
            aggregation=aggregation_spec,
            update_behavior=update_spec
        )
        
        # Calculate initial confidence score
        self._recalculate_confidence()
        
        return self.current_spec
    
    def update_spec(self, user_input: str) -> OracleSpecification:
        """
        Update specification based on new user input
        
        Args:
            user_input: New information from the user
            
        Returns:
            Updated oracle specification
        """
        if not self.current_spec:
            return self.initialize_spec(user_input)
        
        # Parse new intent from the latest user input
        new_intent = self.intent_parser.parse_intent(user_input)
        
        # Update the specification with new information
        self._update_data_sources(new_intent)
        self._update_validation(new_intent)
        self._update_aggregation(new_intent)
        self._update_update_behavior(new_intent)
        
        # Update metadata
        self.current_spec.updated_at = datetime.utcnow()
        self.current_spec.version += 1
        
        # Recalculate confidence
        self._recalculate_confidence()
        
        return self.current_spec
    
    def _update_data_sources(self, intent: Dict[str, Any]) -> None:
        """Update data sources based on new intent"""
        if not intent.get('data_sources'):
            return
            
        # Add new data sources
        existing_sources = {ds.name.lower() for ds in self.current_spec.data_sources}
        for source_name in intent.get('data_sources', []):
            if source_name.lower() not in existing_sources:
                self.current_spec.data_sources.append(DataSourceSpec(
                    name=source_name,
                    type="api",  # Default assumption
                    confidence=SpecificationConfidence.LOW
                ))
    
    def _update_validation(self, intent: Dict[str, Any]) -> None:
        """Update validation methods based on new intent"""
        if not intent.get('validation_methods'):
            return
            
        # Add new validation methods
        existing_methods = {v.method for v in self.current_spec.validation}
        for validation_method in intent.get('validation_methods', []):
            if validation_method not in existing_methods:
                self.current_spec.validation.append(ValidationSpec(
                    method=validation_method,
                    confidence=SpecificationConfidence.MEDIUM  # Higher confidence as it's explicitly requested
                ))
    
    def _update_aggregation(self, intent: Dict[str, Any]) -> None:
        """Update aggregation method based on new intent"""
        if not intent.get('aggregation_method'):
            return
            
        # Update aggregation method if explicitly mentioned
        self.current_spec.aggregation = AggregationSpec(
            method=intent['aggregation_method'],
            parameters=self.current_spec.aggregation.parameters,
            confidence=SpecificationConfidence.HIGH  # High confidence as it's explicitly requested
        )
    
    def _update_update_behavior(self, intent: Dict[str, Any]) -> None:
        """Update update behavior based on new intent"""
        if not intent.get('update_frequency'):
            return
            
        # Update frequency if explicitly mentioned
        freq, value = intent['update_frequency']
        self.current_spec.update_behavior = UpdateSpec(
            frequency=freq,
            value=value,
            conditions=self.current_spec.update_behavior.conditions,
            confidence=SpecificationConfidence.HIGH  # High confidence as it's explicitly requested
        )
    
    def _recalculate_confidence(self) -> None:
        """Recalculate the overall confidence score for the specification"""
        # Define weights for different components
        weights = {
            'data_sources': 0.3,
            'validation': 0.2,
            'aggregation': 0.2,
            'update_behavior': 0.2,
            'data_type': 0.1
        }
        
        # Calculate confidence for each component
        confidence_scores = {
            'data_sources': self._calculate_data_sources_confidence(),
            'validation': self._calculate_validation_confidence(),
            'aggregation': self._calculate_enum_confidence(self.current_spec.aggregation.confidence),
            'update_behavior': self._calculate_enum_confidence(self.current_spec.update_behavior.confidence),
            'data_type': 1.0 if self.current_spec.data_type != 'unknown' else 0.0
        }
        
        # Calculate weighted average
        weighted_sum = sum(weights[k] * confidence_scores[k] for k in weights)
        self.current_spec.confidence_score = weighted_sum
    
    def _calculate_data_sources_confidence(self) -> float:
        """Calculate confidence score for data sources"""
        if not self.current_spec.data_sources:
            return 0.0
            
        confidence_values = {
            SpecificationConfidence.HIGH: 1.0,
            SpecificationConfidence.MEDIUM: 0.6,
            SpecificationConfidence.LOW: 0.3,
            SpecificationConfidence.UNDEFINED: 0.0
        }
        
        total = sum(confidence_values[ds.confidence] for ds in self.current_spec.data_sources)
        return total / len(self.current_spec.data_sources)
    
    def _calculate_validation_confidence(self) -> float:
        """Calculate confidence score for validation methods"""
        if not self.current_spec.validation:
            return 0.0
            
        confidence_values = {
            SpecificationConfidence.HIGH: 1.0,
            SpecificationConfidence.MEDIUM: 0.6,
            SpecificationConfidence.LOW: 0.3,
            SpecificationConfidence.UNDEFINED: 0.0
        }
        
        total = sum(confidence_values[v.confidence] for v in self.current_spec.validation)
        return total / len(self.current_spec.validation)
    
    def _calculate_enum_confidence(self, confidence: SpecificationConfidence) -> float:
        """Convert enum confidence to float value"""
        confidence_values = {
            SpecificationConfidence.HIGH: 1.0,
            SpecificationConfidence.MEDIUM: 0.6,
            SpecificationConfidence.LOW: 0.3,
            SpecificationConfidence.UNDEFINED: 0.0
        }
        return confidence_values[confidence]


class ClarificationGenerator:
    """
    Generates targeted questions to resolve ambiguities or incompleteness
    in oracle specifications.
    """
    
    def __init__(self):
        self.clarification_templates = {
            'data_sources': [
                "Could you specify what data sources you'd like to use for this oracle?",
                "Which specific APIs or data feeds should this oracle pull data from?",
                "Do you have any preferred data providers for this {data_type} oracle?"
            ],
            'update_frequency': [
                "How often should this oracle update its data?",
                "What's the ideal update frequency for this {data_type} data?",
                "Do you need real-time updates or would periodic updates (hourly/daily) be sufficient?"
            ],
            'aggregation': [
                "How should data from multiple sources be aggregated?",
                "Would you prefer mean, median, or another method for combining data from different sources?",
                "Should some data sources be weighted more heavily than others?"
            ],
            'validation': [
                "What validation criteria should be applied to ensure data quality?",
                "How should the system handle outliers or potentially incorrect data?",
                "Are there specific bounds or constraints that valid {data_type} data should meet?"
            ],
            'data_type': [
                "Could you clarify what specific type of data this oracle will provide?",
                "What exact {data_type} metrics or values are you looking to track?",
                "Can you provide more details about the {data_type} data format and structure?"
            ]
        }
    
    def generate_clarifications(self, spec: OracleSpecification) -> List[str]:
        """
        Generate clarification questions based on specification gaps
        
        Args:
            spec: Current oracle specification
            
        Returns:
            List of clarification questions
        """
        clarifications = []
        
        # Check for missing or low-confidence components
        if not spec.data_sources or all(ds.confidence in [SpecificationConfidence.LOW, SpecificationConfidence.UNDEFINED] for ds in spec.data_sources):
            template = self._select_template('data_sources')
            clarifications.append(template.format(data_type=spec.data_type))
        
        if spec.update_behavior.confidence in [SpecificationConfidence.LOW, SpecificationConfidence.UNDEFINED]:
            template = self._select_template('update_frequency')
            clarifications.append(template.format(data_type=spec.data_type))
        
        if spec.aggregation.confidence in [SpecificationConfidence.LOW, SpecificationConfidence.UNDEFINED]:
            template = self._select_template('aggregation')
            clarifications.append(template.format(data_type=spec.data_type))
        
        if not spec.validation or all(v.confidence in [SpecificationConfidence.LOW, SpecificationConfidence.UNDEFINED] for v in spec.validation):
            template = self._select_template('validation')
            clarifications.append(template.format(data_type=spec.data_type))
        
        if spec.data_type == 'unknown':
            template = self._select_template('data_type')
            # Use a generic term since data_type is unknown
            clarifications.append(template.format(data_type='requested'))
        
        return clarifications
    
    def _select_template(self, category: str) -> str:
        """Select a random template from the given category"""
        import random
        templates = self.clarification_templates.get(category, [])
        return random.choice(templates) if templates else "Could you provide more details?"


class ExplanationGenerator:
    """
    Generates explanations for technical decisions in the oracle design
    that are accessible to users with varying technical backgrounds.
    """
    
    def __init__(self):
        self.explanation_templates = {
            'data_sources': {
                'api': "APIs provide structured data through web services, making them reliable sources for oracle data.",
                'blockchain': "Blockchain data sources provide cryptographically verifiable data directly from on-chain transactions and state.",
                'database': "Database sources allow for complex queries and access to historical data with high reliability."
            },
            'update_frequency': {
                UpdateFrequency.REAL_TIME: "Real-time updates provide the most current data but require more resources and may increase costs.",
                UpdateFrequency.SECONDS: "Second-level updates offer near real-time data while being slightly more efficient than continuous updates.",
                UpdateFrequency.MINUTES: "Minute-level updates balance freshness and efficiency for data that doesn't change extremely rapidly.",
                UpdateFrequency.HOURLY: "Hourly updates are efficient for data that changes relatively slowly while maintaining reasonable timeliness.",
                UpdateFrequency.DAILY: "Daily updates are ideal for slower-changing data where freshness within 24 hours is sufficient.",
                UpdateFrequency.WEEKLY: "Weekly updates minimize resource usage for very slowly changing data or historical trends.",
                UpdateFrequency.MONTHLY: "Monthly updates are appropriate for long-term trends or data that rarely changes."
            },
            'aggregation': {
                AggregationMethod.MEAN: "The mean (average) is useful for continuous numerical data where outliers are not a major concern.",
                AggregationMethod.MEDIAN: "The median provides robustness against outliers by selecting the middle value.",
                AggregationMethod.MODE: "The mode identifies the most common value, useful for categorical or discrete numerical data.",
                AggregationMethod.MIN: "Selecting the minimum value is useful for scenarios where the lowest value is critical.",
                AggregationMethod.MAX: "Selecting the maximum value is useful for scenarios where the highest value is critical.",
                AggregationMethod.WEIGHTED_AVERAGE: "Weighted averages allow more reliable or important sources to have greater influence."
            },
            'validation': {
                ValidationMethod.RANGE_CHECK: "Range checks ensure values fall within expected bounds, filtering out clearly invalid data.",
                ValidationMethod.OUTLIER_DETECTION: "Outlier detection identifies and handles unusual values that could indicate errors or manipulation.",
                ValidationMethod.SOURCE_CONSENSUS: "Source consensus requires agreement across multiple sources, reducing reliance on any single provider.",
                ValidationMethod.HISTORICAL_CONSISTENCY: "Historical consistency validates new data against historical patterns to detect anomalies.",
                ValidationMethod.CRYPTOGRAPHIC_PROOF: "Cryptographic proof ensures data integrity and authenticity through digital signatures or other mechanisms."
            }
        }
    
    def generate_explanation(self, component_type: str, component_value: Any) -> str:
        """
        Generate an explanation for a specific component choice
        
        Args:
            component_type: Type of component (data_sources, update_frequency, etc.)
            component_value: The specific value or method chosen
            
        Returns:
            Explanation text
        """
        if component_type not in self.explanation_templates:
            return "This is a standard approach for oracle design."
            
        templates = self.explanation_templates[component_type]
        
        if component_value in templates:
            return templates[component_value]
        else:
            return "This is a common approach for this type of oracle component."


class OracleDesigner:
    """
    Main class that coordinates the conversational architecture for
    translating natural language into formal oracle specifications.
    """
    
    def __init__(
        self,
        validation_service: Optional[ValidationService] = None,
        model_configs: Optional[Dict[str, ModelConfig]] = None,
        redis_client: Optional[Redis] = None,
        model_providers: Optional[Dict[str, Any]] = None
    ):
        self.specification_builder = SpecificationBuilder(validation_service)
        self.clarification_generator = ClarificationGenerator()
        self.explanation_generator = ExplanationGenerator()
        self.conversation_history: List[Dict[str, Any]] = []
        
        # Initialize new services
        self.external_ai_service = ExternalAIService(
            model_configs or {},
            redis_client or Redis(),
            self
        )
        self.langchain_service = LangChainService(
            self,
            model_providers
        )
        self.specification_converter = SpecificationConverter()
    
    async def process_input(self, user_input: str, session_id: str = None) -> Dict[str, Any]:
        """
        Process user input and generate an appropriate response using available services
        
        Args:
            user_input: Natural language input from the user
            session_id: Optional session identifier for context tracking
            
        Returns:
            Response including updated specification, clarifications, and explanations
        """
        # Add user input to conversation history
        self.conversation_history.append({
            'role': 'user',
            'content': user_input,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        try:
            # Process through LangChain service first
            langchain_response = self.langchain_service.process_input(user_input)
            
            # If LangChain provides a valid response, use it
            if langchain_response and not langchain_response.get('error'):
                processed_response = langchain_response
            else:
                # Fall back to external AI service
                processed_response = await self.external_ai_service.process_design_request(
                    user_input,
                    session_id or 'default',
                    self._build_context()
                )
            
            # Update or initialize specification
            if not hasattr(self, 'current_spec') or not self.specification_builder.current_spec:
                spec = self.specification_builder.initialize_spec(user_input)
                is_new = True
            else:
                spec = self.specification_builder.update_spec(user_input)
                is_new = False
            
            # Convert specification to formal representation
            formal_spec, validation_messages = self.specification_converter.convert_specification(
                processed_response.get('raw_response', user_input),
                SpecificationFormat.JSON
            )
            
            # Generate clarifications
            clarifications = self.clarification_generator.generate_clarifications(spec)
            
            # Generate explanations
            explanations = self._generate_component_explanations(spec)
            
            # Create response
            response = {
                'specification': spec.to_dict(),
                'formal_specification': formal_spec,
                'clarifications': clarifications,
                'explanations': explanations,
                'confidence_score': spec.confidence_score,
                'is_new_specification': is_new,
                'validation_messages': validation_messages,
                'processed_response': processed_response
            }
            
            # Add response to conversation history
            self.conversation_history.append({
                'role': 'system',
                'content': response,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing input: {str(e)}")
            # Fall back to basic processing if services fail
            return super().process_input(user_input)
    
    def _build_context(self) -> Dict[str, Any]:
        """Build context for AI services"""
        context = {
            'conversation_history': self.conversation_history,
            'current_specification': self.get_specification(),
            'confidence_score': self.specification_builder.current_spec.confidence_score if self.specification_builder.current_spec else 0.0
        }
        return context
    
    def _generate_component_explanations(self, spec: OracleSpecification) -> Dict[str, List[str]]:
        """Generate explanations for various components of the specification"""
        explanations = {}
        
        # Explain data sources
        if spec.data_sources:
            source_explanations = []
            for ds in spec.data_sources:
                if ds.type:
                    explanation = self.explanation_generator.generate_explanation('data_sources', ds.type)
                    source_explanations.append(f"{ds.name}: {explanation}")
            if source_explanations:
                explanations['data_sources'] = source_explanations
        
        # Explain update frequency
        update_explanation = self.explanation_generator.generate_explanation(
            'update_frequency', spec.update_behavior.frequency
        )
        explanations['update_frequency'] = [update_explanation]
        
        # Explain aggregation method
        agg_explanation = self.explanation_generator.generate_explanation(
            'aggregation', spec.aggregation.method
        )
        explanations['aggregation'] = [agg_explanation]
        
        # Explain validation methods
        if spec.validation:
            validation_explanations = []
            for validation in spec.validation:
                explanation = self.explanation_generator.generate_explanation(
                    'validation', validation.method
                )
                validation_explanations.append(explanation)
            explanations['validation'] = validation_explanations
        
        return explanations
    
    def get_specification(self) -> Optional[Dict[str, Any]]:
        """
        Get the current specification as a dictionary
        
        Returns:
            Current specification or None if not initialized
        """
        if not self.specification_builder.current_spec:
            return None
        return self.specification_builder.current_spec.to_dict()
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """
        Get the conversation history
        
        Returns:
            List of conversation turns with timestamps
        """
        return self.conversation_history
    
    def generate_external_model_prompt(self, context: Dict[str, Any] = None) -> str:
        """
        Generate a prompt for an external language model to enhance or validate the specification
        
        Args:
            context: Additional context for prompt generation
            
        Returns:
            Formatted prompt text
        """
        if not self.specification_builder.current_spec:
            return "Please help design an oracle system based on the following requirements: [insert requirements]"
        
        spec = self.specification_builder.current_spec
        
        # Identify gaps and low confidence areas
        gaps = []
        if not spec.data_sources:
            gaps.append("appropriate data sources")
        if spec.update_behavior.confidence == SpecificationConfidence.UNDEFINED:
            gaps.append("optimal update frequency")
        if spec.aggregation.confidence == SpecificationConfidence.UNDEFINED:
            gaps.append("appropriate aggregation method")
        if not spec.validation:
            gaps.append("validation methods")
        
        # Generate the prompt
        prompt = (
            f"I'm designing an oracle for {spec.data_type} data with the following specifications:\n\n"
            f"- Description: {spec.description}\n"
        )
        
        if spec.data_sources:
            prompt += "- Data sources: " + ", ".join(ds.name for ds in spec.data_sources) + "\n"
        
        prompt += f"- Update frequency: {spec.update_behavior.frequency.value}"
        if spec.update_behavior.value > 0:
            prompt += f" ({spec.update_behavior.value})"
        prompt += "\n"
        
        prompt += f"- Aggregation method: {spec.aggregation.method.value}\n"
        
        if spec.validation:
            prompt += "- Validation methods: " + ", ".join(v.method.value for v in spec.validation) + "\n"
        
        if gaps:
            prompt += f"\nPlease suggest {', '.join(gaps)} for this oracle design, considering best practices and the specific use case."
        else:
            prompt += "\nPlease review this design and suggest any improvements or optimizations to make this oracle more reliable, efficient, and secure."
        
        if context:
            for key, value in context.items():
                prompt += f"\n\nAdditional context - {key}: {value}"
        
        return prompt
    
    def process_external_model_response(self, response: str) -> Dict[str, Any]:
        """
        Process response from an external language model to extract structured information
        
        Args:
            response: Text response from external model
            
        Returns:
            Dictionary of extracted information
        """
        # Basic extraction patterns
        data_source_pattern = r'(?:data sources?|sources?|providers?)[:\s]+([^\n]+)'
        update_pattern = r'(?:update frequency|frequency|refresh rate)[:\s]+([^\n]+)'
        aggregation_pattern = r'(?:aggregation|aggregation method)[:\s]+([^\n]+)'
        validation_pattern = r'(?:validation|validation methods?)[:\s]+([^\n]+)'
        
        # Extract information
        extracted = {}
        
        data_source_match = re.search(data_source_pattern, response, re.IGNORECASE)
        if data_source_match:
            data_sources = [
                ds.strip() for ds in re.split(r'[,;]', data_source_match.group(1))
                if ds.strip()
            ]
            extracted['data_sources'] = data_sources
        
        update_match = re.search(update_pattern, response, re.IGNORECASE)
        if update_match:
            extracted['update_frequency'] = update_match.group(1).strip()
        
        aggregation_match = re.search(aggregation_pattern, response, re.IGNORECASE)
        if aggregation_match:
            extracted['aggregation_method'] = aggregation_match.group(1).strip()
        
        validation_match = re.search(validation_pattern, response, re.IGNORECASE)
        if validation_match:
            validations = [
                v.strip() for v in re.split(r'[,;]', validation_match.group(1))
                if v.strip()
            ]
            extracted['validation_methods'] = validations
        
        # Add the raw response for reference
        extracted['raw_response'] = response
        
        return extracted


def create_oracle_designer(
    validation_service: Optional[ValidationService] = None,
    model_configs: Optional[Dict[str, ModelConfig]] = None,
    redis_client: Optional[Redis] = None,
    model_providers: Optional[Dict[str, Any]] = None
) -> OracleDesigner:
    """
    Factory function to create and configure an OracleDesigner instance
    
    Args:
        validation_service: Optional validation service instance
        model_configs: Optional model configurations for external AI service
        redis_client: Optional Redis client for caching
        model_providers: Optional model providers for LangChain service
        
    Returns:
        Configured OracleDesigner instance
    """
    return OracleDesigner(
        validation_service=validation_service,
        model_configs=model_configs,
        redis_client=redis_client,
        model_providers=model_providers
    ) 