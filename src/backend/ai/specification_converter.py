"""
Specification Converter for Oracle Designer

This module provides a sophisticated translation system that transforms natural language
oracle specifications into formal, structured representations suitable for technical
implementation. It handles schema extraction, normalization, validation, constraint
resolution, and format conversion.
"""

import json
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple, Set, Union, Type
import yaml
import networkx as nx
from pydantic import BaseModel, Field, validator
import jsonschema
from graphviz import Digraph

# Local imports
from src.backend.ai.oracle_designer import (
    OracleSpecification,
    DataSourceSpec,
    ValidationSpec,
    AggregationSpec,
    UpdateSpec,
    SpecificationConfidence,
    AggregationMethod,
    UpdateFrequency,
    ValidationMethod
)

logger = logging.getLogger(__name__)

class SpecificationFormat(Enum):
    """Supported specification output formats"""
    JSON = "json"
    YAML = "yaml"
    DIAGRAM = "diagram"
    CONTRACT = "contract"
    CONFIG = "config"

class SpecificationStage(Enum):
    """Stages of specification development"""
    DRAFT = "draft"
    NORMALIZED = "normalized"
    VALIDATED = "validated"
    FINALIZED = "finalized"

@dataclass
class SpecificationVersion:
    """Version information for a specification"""
    version: int
    timestamp: datetime
    author: str
    changes: List[str]
    confidence: float
    stage: SpecificationStage
    parent_version: Optional[int] = None

class SpecificationSchema(BaseModel):
    """Pydantic model for oracle specification validation"""
    name: str = Field(..., description="Oracle name")
    description: str = Field(..., description="Oracle description")
    data_type: str = Field(..., description="Type of data provided")
    data_sources: List[Dict[str, Any]] = Field(..., min_items=1)
    validation: List[Dict[str, Any]] = Field(..., min_items=1)
    aggregation: Dict[str, Any] = Field(...)
    update_behavior: Dict[str, Any] = Field(...)
    access_control: Dict[str, Any] = Field(
        default_factory=lambda: {"type": "public"}
    )
    security_parameters: Dict[str, Any] = Field(
        default_factory=lambda: {"minimum_confirmations": 1}
    )
    
    @validator("data_sources")
    def validate_data_sources(cls, v):
        """Validate data source configuration"""
        for source in v:
            if "type" not in source:
                raise ValueError("Data source must specify type")
            if source["type"] == "api" and "endpoint" not in source:
                raise ValueError("API data source must specify endpoint")
        return v
    
    @validator("update_behavior")
    def validate_update_frequency(cls, v):
        """Validate update frequency configuration"""
        if "frequency" not in v:
            raise ValueError("Update behavior must specify frequency")
        if v.get("value", 0) < 0:
            raise ValueError("Update frequency value cannot be negative")
        return v

class SchemaExtractor:
    """Extracts structured schema from natural language specifications"""
    
    def __init__(self):
        self.parameter_patterns = {
            'data_sources': [
                r'(?:use|from|source)\s+(?:data\s+)?from\s+([^,.]+)',
                r'(?:api|feed|source):\s*([^,.]+)',
                r'data\s+provided\s+by\s+([^,.]+)'
            ],
            'update_frequency': [
                r'update(?:d|s)?\s+every\s+(\d+\s+[a-z]+)',
                r'frequency:\s*(\d+\s+[a-z]+)',
                r'refresh(?:ed)?\s+(\w+)'
            ],
            'validation_rules': [
                r'validate(?:d)?\s+(?:using|with|by)\s+([^,.]+)',
                r'validation:\s*([^,.]+)',
                r'check(?:ed)?\s+(?:using|with|by)\s+([^,.]+)'
            ],
            'access_control': [
                r'access(?:ible)?\s+(?:by|to)\s+([^,.]+)',
                r'permission(?:s)?:\s*([^,.]+)',
                r'restricted\s+to\s+([^,.]+)'
            ]
        }
    
    def extract_schema(self, text: str) -> Dict[str, Any]:
        """
        Extract schema parameters from natural language text
        
        Args:
            text: Natural language specification
            
        Returns:
            Dictionary of extracted parameters
        """
        schema = {}
        
        # Extract each parameter type
        for param_type, patterns in self.parameter_patterns.items():
            extracted = self._extract_parameter(text, patterns)
            if extracted:
                schema[param_type] = extracted
        
        # Extract implicit parameters
        schema.update(self._extract_implicit_parameters(text))
        
        return schema
    
    def _extract_parameter(self, text: str, patterns: List[str]) -> List[str]:
        """Extract parameter values using regex patterns"""
        results = []
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                value = match.group(1).strip()
                if value and value not in results:
                    results.append(value)
        return results
    
    def _extract_implicit_parameters(self, text: str) -> Dict[str, Any]:
        """Extract parameters implied by context"""
        implicit = {}
        
        # Detect data type
        data_types = {
            'price': r'\b(?:price|cost|value)\b',
            'weather': r'\b(?:weather|temperature|precipitation)\b',
            'sports': r'\b(?:sports?|game|score|match)\b',
            'financial': r'\b(?:financial|stock|market|index)\b'
        }
        
        for dtype, pattern in data_types.items():
            if re.search(pattern, text, re.IGNORECASE):
                implicit['data_type'] = dtype
                break
        
        # Detect security requirements
        security_patterns = {
            'high': r'\b(?:secure|critical|sensitive)\b',
            'medium': r'\b(?:important|significant)\b',
            'low': r'\b(?:basic|simple)\b'
        }
        
        for level, pattern in security_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                implicit['security_level'] = level
                break
        
        return implicit

class SpecificationNormalizer:
    """Normalizes and resolves ambiguities in specifications"""
    
    def __init__(self):
        self.default_values = {
            'update_frequency': UpdateFrequency.HOURLY,
            'aggregation_method': AggregationMethod.MEAN,
            'validation_method': ValidationMethod.RANGE_CHECK,
            'minimum_sources': 1,
            'minimum_confirmations': 1
        }
        
        self.precedence_rules = {
            'update_frequency': [
                UpdateFrequency.REAL_TIME,
                UpdateFrequency.SECONDS,
                UpdateFrequency.MINUTES,
                UpdateFrequency.HOURLY,
                UpdateFrequency.DAILY,
                UpdateFrequency.WEEKLY,
                UpdateFrequency.MONTHLY
            ],
            'validation_method': [
                ValidationMethod.CRYPTOGRAPHIC_PROOF,
                ValidationMethod.SOURCE_CONSENSUS,
                ValidationMethod.HISTORICAL_CONSISTENCY,
                ValidationMethod.OUTLIER_DETECTION,
                ValidationMethod.RANGE_CHECK
            ]
        }
    
    def normalize_specification(
        self,
        spec: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Normalize a specification by resolving ambiguities and applying defaults
        
        Args:
            spec: Raw specification dictionary
            context: Optional context for normalization
            
        Returns:
            Normalized specification
        """
        normalized = spec.copy()
        
        # Apply default values for missing fields
        self._apply_defaults(normalized)
        
        # Resolve conflicts using precedence rules
        self._resolve_conflicts(normalized)
        
        # Normalize values to standard formats
        self._normalize_values(normalized)
        
        # Apply context-specific adjustments
        if context:
            self._apply_context(normalized, context)
        
        return normalized
    
    def _apply_defaults(self, spec: Dict[str, Any]):
        """Apply default values for missing fields"""
        for field, default in self.default_values.items():
            if field not in spec or not spec[field]:
                spec[field] = default
    
    def _resolve_conflicts(self, spec: Dict[str, Any]):
        """Resolve conflicts using precedence rules"""
        for field, precedence in self.precedence_rules.items():
            if field in spec and isinstance(spec[field], list):
                # Keep highest precedence value
                values = spec[field]
                highest_precedence = None
                highest_index = float('inf')
                
                for value in values:
                    try:
                        index = precedence.index(value)
                        if index < highest_index:
                            highest_index = index
                            highest_precedence = value
                    except ValueError:
                        continue
                
                if highest_precedence:
                    spec[field] = highest_precedence
    
    def _normalize_values(self, spec: Dict[str, Any]):
        """Normalize values to standard formats"""
        # Normalize update frequency
        if 'update_frequency' in spec:
            freq = spec['update_frequency']
            if isinstance(freq, str):
                spec['update_frequency'] = self._parse_frequency(freq)
        
        # Normalize data sources
        if 'data_sources' in spec:
            sources = spec['data_sources']
            spec['data_sources'] = [
                self._normalize_data_source(source)
                for source in sources
            ]
    
    def _apply_context(self, spec: Dict[str, Any], context: Dict[str, Any]):
        """Apply context-specific adjustments"""
        # Adjust based on data type
        if 'data_type' in context:
            self._adjust_for_data_type(spec, context['data_type'])
        
        # Adjust based on security requirements
        if 'security_level' in context:
            self._adjust_for_security(spec, context['security_level'])
    
    def _parse_frequency(self, freq_str: str) -> UpdateFrequency:
        """Parse frequency string to UpdateFrequency enum"""
        freq_str = freq_str.lower()
        
        if 'real' in freq_str or 'live' in freq_str:
            return UpdateFrequency.REAL_TIME
        elif 'second' in freq_str:
            return UpdateFrequency.SECONDS
        elif 'minute' in freq_str:
            return UpdateFrequency.MINUTES
        elif 'hour' in freq_str:
            return UpdateFrequency.HOURLY
        elif 'day' in freq_str:
            return UpdateFrequency.DAILY
        elif 'week' in freq_str:
            return UpdateFrequency.WEEKLY
        elif 'month' in freq_str:
            return UpdateFrequency.MONTHLY
        else:
            return self.default_values['update_frequency']
    
    def _normalize_data_source(self, source: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Normalize data source specification"""
        if isinstance(source, str):
            return {
                'name': source,
                'type': 'api',
                'confidence': SpecificationConfidence.LOW.value
            }
        return source
    
    def _adjust_for_data_type(self, spec: Dict[str, Any], data_type: str):
        """Adjust specification based on data type"""
        # Implementation of data type specific adjustments
        pass
    
    def _adjust_for_security(self, spec: Dict[str, Any], security_level: str):
        """Adjust specification based on security requirements"""
        # Implementation of security level adjustments
        pass

class SpecificationBuilder:
    """Builds hierarchical representations of oracle specifications"""
    
    def __init__(self):
        self.dependency_graph = nx.DiGraph()
        self.component_registry: Dict[str, Any] = {}
    
    def build_specification(
        self,
        components: Dict[str, Any],
        relationships: Optional[List[Tuple[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Build a hierarchical specification from components
        
        Args:
            components: Dictionary of specification components
            relationships: Optional list of component relationships
            
        Returns:
            Structured specification
        """
        # Reset state
        self.dependency_graph.clear()
        self.component_registry.clear()
        
        # Register components
        for name, component in components.items():
            self.register_component(name, component)
        
        # Add relationships
        if relationships:
            for source, target in relationships:
                self.add_relationship(source, target)
        
        # Validate graph
        self._validate_graph()
        
        # Build hierarchical structure
        return self._build_hierarchy()
    
    def register_component(self, name: str, component: Any):
        """Register a component in the builder"""
        self.component_registry[name] = component
        self.dependency_graph.add_node(name)
    
    def add_relationship(self, source: str, target: str):
        """Add a relationship between components"""
        if source not in self.component_registry:
            raise ValueError(f"Unknown source component: {source}")
        if target not in self.component_registry:
            raise ValueError(f"Unknown target component: {target}")
            
        self.dependency_graph.add_edge(source, target)
    
    def _validate_graph(self):
        """Validate the dependency graph"""
        # Check for cycles
        if not nx.is_directed_acyclic_graph(self.dependency_graph):
            cycles = list(nx.simple_cycles(self.dependency_graph))
            raise ValueError(f"Circular dependencies detected: {cycles}")
        
        # Check for disconnected components
        if not nx.is_weakly_connected(self.dependency_graph):
            components = list(nx.weakly_connected_components(self.dependency_graph))
            logger.warning(f"Disconnected components detected: {components}")
    
    def _build_hierarchy(self) -> Dict[str, Any]:
        """Build hierarchical structure from graph"""
        # Find root nodes (no incoming edges)
        roots = [n for n in self.dependency_graph.nodes()
                if self.dependency_graph.in_degree(n) == 0]
        
        if not roots:
            raise ValueError("No root components found")
        
        # Build hierarchy from each root
        hierarchy = {}
        for root in roots:
            hierarchy[root] = self._build_subtree(root)
        
        return hierarchy
    
    def _build_subtree(self, node: str) -> Dict[str, Any]:
        """Recursively build subtree from node"""
        subtree = {
            'component': self.component_registry[node],
            'children': {}
        }
        
        for child in self.dependency_graph.successors(node):
            subtree['children'][child] = self._build_subtree(child)
        
        return subtree

class SpecificationValidator:
    """Validates specification completeness and correctness"""
    
    def __init__(self):
        self.validators = {
            'schema': self._validate_schema,
            'dependencies': self._validate_dependencies,
            'security': self._validate_security,
            'performance': self._validate_performance
        }
    
    def validate_specification(
        self,
        spec: Dict[str, Any],
        validation_types: Optional[List[str]] = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate a specification
        
        Args:
            spec: Specification to validate
            validation_types: Optional list of validation types to perform
            
        Returns:
            Tuple of (is_valid, list of validation messages)
        """
        messages = []
        is_valid = True
        
        # Determine which validations to run
        if validation_types is None:
            validation_types = list(self.validators.keys())
        
        # Run validations
        for vtype in validation_types:
            if vtype in self.validators:
                valid, msgs = self.validators[vtype](spec)
                messages.extend(msgs)
                is_valid = is_valid and valid
        
        return is_valid, messages
    
    def _validate_schema(
        self,
        spec: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate schema completeness"""
        messages = []
        is_valid = True
        
        try:
            SpecificationSchema(**spec)
        except Exception as e:
            messages.append(f"Schema validation failed: {str(e)}")
            is_valid = False
        
        return is_valid, messages
    
    def _validate_dependencies(
        self,
        spec: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate component dependencies"""
        messages = []
        is_valid = True
        
        # Build dependency graph
        graph = nx.DiGraph()
        
        # Add data source dependencies
        for source in spec.get('data_sources', []):
            graph.add_node(f"source:{source['name']}")
            if 'depends_on' in source:
                for dep in source['depends_on']:
                    graph.add_edge(f"source:{source['name']}", f"source:{dep}")
        
        # Check for cycles
        try:
            cycles = list(nx.simple_cycles(graph))
            if cycles:
                messages.append(f"Circular dependencies detected: {cycles}")
                is_valid = False
        except Exception as e:
            messages.append(f"Dependency validation failed: {str(e)}")
            is_valid = False
        
        return is_valid, messages
    
    def _validate_security(
        self,
        spec: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate security requirements"""
        messages = []
        is_valid = True
        
        # Check minimum confirmations
        min_conf = spec.get('security_parameters', {}).get('minimum_confirmations', 0)
        if min_conf < 1:
            messages.append("Minimum confirmations must be at least 1")
            is_valid = False
        
        # Check access control
        access = spec.get('access_control', {})
        if access.get('type') == 'restricted' and not access.get('allowed_addresses'):
            messages.append("Restricted access requires allowed addresses")
            is_valid = False
        
        return is_valid, messages
    
    def _validate_performance(
        self,
        spec: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate performance characteristics"""
        messages = []
        is_valid = True
        
        # Check update frequency
        update_behavior = spec.get('update_behavior', {})
        if update_behavior.get('frequency') == UpdateFrequency.REAL_TIME:
            if len(spec.get('data_sources', [])) > 5:
                messages.append(
                    "Real-time updates with many data sources may impact performance"
                )
        
        # Check data source count
        if len(spec.get('data_sources', [])) < 1:
            messages.append("At least one data source is required")
            is_valid = False
        
        return is_valid, messages

class FormatConverter:
    """Converts specifications between different formats"""
    
    def __init__(self):
        self.formatters = {
            SpecificationFormat.JSON: self._to_json,
            SpecificationFormat.YAML: self._to_yaml,
            SpecificationFormat.DIAGRAM: self._to_diagram,
            SpecificationFormat.CONTRACT: self._to_contract,
            SpecificationFormat.CONFIG: self._to_config
        }
    
    def convert_specification(
        self,
        spec: Dict[str, Any],
        output_format: SpecificationFormat
    ) -> Any:
        """
        Convert specification to desired format
        
        Args:
            spec: Specification to convert
            output_format: Desired output format
            
        Returns:
            Converted specification
        """
        if output_format not in self.formatters:
            raise ValueError(f"Unsupported format: {output_format}")
        
        return self.formatters[output_format](spec)
    
    def _to_json(self, spec: Dict[str, Any]) -> str:
        """Convert to JSON format"""
        return json.dumps(spec, indent=2)
    
    def _to_yaml(self, spec: Dict[str, Any]) -> str:
        """Convert to YAML format"""
        return yaml.dump(spec, default_flow_style=False)
    
    def _to_diagram(self, spec: Dict[str, Any]) -> Digraph:
        """Convert to visual diagram"""
        dot = Digraph(comment='Oracle Specification')
        
        # Add nodes for components
        dot.node('oracle', spec.get('name', 'Oracle'))
        
        # Add data sources
        for source in spec.get('data_sources', []):
            source_name = source['name']
            dot.node(source_name, source_name)
            dot.edge(source_name, 'oracle')
        
        # Add validation methods
        for validation in spec.get('validation', []):
            method = validation['method']
            dot.node(method, method)
            dot.edge('oracle', method)
        
        return dot
    
    def _to_contract(self, spec: Dict[str, Any]) -> str:
        """Convert to smart contract template"""
        contract = f"""
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract {spec.get('name', 'Oracle')} {{
    // Data structure
    struct OracleData {{
        uint256 value;
        uint256 timestamp;
        address updater;
    }}
    
    // State variables
    OracleData public latestData;
    mapping(address => bool) public authorizedUpdaters;
    uint256 public constant MIN_UPDATE_INTERVAL = {self._get_update_interval(spec)};
    
    // Events
    event DataUpdated(uint256 value, uint256 timestamp, address updater);
    
    // Constructor
    constructor() {{
        authorizedUpdaters[msg.sender] = true;
    }}
    
    // Update function
    function updateData(uint256 _value) external {{
        require(authorizedUpdaters[msg.sender], "Unauthorized updater");
        require(
            block.timestamp >= latestData.timestamp + MIN_UPDATE_INTERVAL,
            "Too early to update"
        );
        
        latestData = OracleData(
            _value,
            block.timestamp,
            msg.sender
        );
        
        emit DataUpdated(_value, block.timestamp, msg.sender);
    }}
    
    // Read function
    function getData() external view returns (
        uint256 value,
        uint256 timestamp,
        address updater
    ) {{
        return (
            latestData.value,
            latestData.timestamp,
            latestData.updater
        );
    }}
}}
"""
        return contract
    
    def _to_config(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Convert to service configuration"""
        config = {
            'service': {
                'name': spec.get('name', 'oracle'),
                'type': 'oracle',
                'version': '1.0.0'
            },
            'data_sources': [
                {
                    'name': source['name'],
                    'type': source['type'],
                    'endpoint': source.get('endpoint'),
                    'auth': source.get('authentication_method')
                }
                for source in spec.get('data_sources', [])
            ],
            'update_schedule': {
                'frequency': spec.get('update_behavior', {}).get('frequency'),
                'value': spec.get('update_behavior', {}).get('value', 0)
            },
            'validation': {
                'methods': [
                    v['method'] for v in spec.get('validation', [])
                ],
                'parameters': {
                    v['method']: v.get('parameters', {})
                    for v in spec.get('validation', [])
                }
            },
            'security': {
                'access_control': spec.get('access_control', {}),
                'min_confirmations': spec.get('security_parameters', {}).get(
                    'minimum_confirmations', 1
                )
            }
        }
        return config
    
    def _get_update_interval(self, spec: Dict[str, Any]) -> int:
        """Calculate update interval in seconds"""
        update_behavior = spec.get('update_behavior', {})
        frequency = update_behavior.get('frequency')
        value = update_behavior.get('value', 0)
        
        if frequency == UpdateFrequency.REAL_TIME:
            return 1
        elif frequency == UpdateFrequency.SECONDS:
            return value
        elif frequency == UpdateFrequency.MINUTES:
            return value * 60
        elif frequency == UpdateFrequency.HOURLY:
            return value * 3600
        elif frequency == UpdateFrequency.DAILY:
            return value * 86400
        elif frequency == UpdateFrequency.WEEKLY:
            return value * 604800
        elif frequency == UpdateFrequency.MONTHLY:
            return value * 2592000
        else:
            return 3600  # Default to 1 hour

class SpecificationConverter:
    """
    Main class for converting natural language specifications to formal representations
    """
    
    def __init__(self):
        self.schema_extractor = SchemaExtractor()
        self.normalizer = SpecificationNormalizer()
        self.builder = SpecificationBuilder()
        self.validator = SpecificationValidator()
        self.format_converter = FormatConverter()
        
        # Version tracking
        self.versions: Dict[str, List[SpecificationVersion]] = {}
    
    def convert_specification(
        self,
        text: str,
        output_format: SpecificationFormat = SpecificationFormat.JSON,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[Any, List[str]]:
        """
        Convert natural language specification to formal representation
        
        Args:
            text: Natural language specification
            output_format: Desired output format
            context: Optional conversion context
            
        Returns:
            Tuple of (converted specification, validation messages)
        """
        # Extract schema
        schema = self.schema_extractor.extract_schema(text)
        
        # Normalize specification
        normalized = self.normalizer.normalize_specification(schema, context)
        
        # Build hierarchical representation
        built = self.builder.build_specification(
            normalized,
            context.get('relationships') if context else None
        )
        
        # Validate specification
        is_valid, messages = self.validator.validate_specification(built)
        
        if not is_valid:
            logger.warning("Specification validation failed")
            for msg in messages:
                logger.warning(f"Validation: {msg}")
        
        # Convert to desired format
        result = self.format_converter.convert_specification(built, output_format)
        
        # Track version
        self._track_version(built, messages)
        
        return result, messages
    
    def _track_version(
        self,
        spec: Dict[str, Any],
        messages: List[str]
    ):
        """Track specification version"""
        spec_id = spec.get('name', 'default')
        
        if spec_id not in self.versions:
            self.versions[spec_id] = []
        
        version_list = self.versions[spec_id]
        current_version = len(version_list) + 1
        
        # Calculate confidence based on validation messages
        confidence = 1.0 - (len(messages) * 0.1)
        confidence = max(0.0, min(1.0, confidence))
        
        # Determine stage based on confidence
        if confidence < 0.3:
            stage = SpecificationStage.DRAFT
        elif confidence < 0.6:
            stage = SpecificationStage.NORMALIZED
        elif confidence < 0.9:
            stage = SpecificationStage.VALIDATED
        else:
            stage = SpecificationStage.FINALIZED
        
        version = SpecificationVersion(
            version=current_version,
            timestamp=datetime.utcnow(),
            author="system",
            changes=messages,
            confidence=confidence,
            stage=stage,
            parent_version=current_version - 1 if current_version > 1 else None
        )
        
        version_list.append(version)

def create_specification_converter() -> SpecificationConverter:
    """
    Factory function to create and configure a SpecificationConverter instance
    
    Returns:
        Configured SpecificationConverter instance
    """
    return SpecificationConverter() 