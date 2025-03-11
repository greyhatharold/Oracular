"""
LangChain Service for Oracle Designer

This module provides a sophisticated integration layer that orchestrates LangChain 
components to transform conversational inputs into formal oracle specifications and
implementation guidance. It interfaces with the existing oracle_designer.py module
to enhance the specification creation process with advanced language model capabilities.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from enum import Enum
from datetime import datetime
from pathlib import Path
import os
import json

# LangChain imports
from langchain.prompts import (
    ChatPromptTemplate, 
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    AIMessagePromptTemplate,
    MessagesPlaceholder
)
from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.chains import LLMChain, SequentialChain, ConversationChain
from langchain.chains.router import MultiPromptRouter
from langchain.output_parsers import PydanticOutputParser, StructuredOutputParser
from langchain.schema import Document, BaseMessage
from langchain.callbacks import get_openai_callback
from langchain.prompts.few_shot import FewShotPromptTemplate
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain.memory.chat_message_histories import RedisChatMessageHistory

# Local imports
from src.backend.ai.oracle_designer import (
    OracleSpecification, 
    OracleDesigner,
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

class ModelType(Enum):
    """Types of models for different tasks"""
    CREATIVE = "creative"       # For brainstorming and generating creative solutions
    TECHNICAL = "technical"     # For technical implementation details
    SECURITY = "security"       # For security analysis and vulnerability detection
    SUMMARIZATION = "summary"   # For summarizing conversations
    DEFAULT = "default"         # Default model

class ProcessingPhase(Enum):
    """Phases of the oracle design process"""
    REQUIREMENT_ELICITATION = "requirement_elicitation"
    ARCHITECTURE_DESIGN = "architecture_design"
    SECURITY_ANALYSIS = "security_analysis"
    IMPLEMENTATION_PLANNING = "implementation_planning"
    VALIDATION = "validation"
    REFINEMENT = "refinement"

class LangChainService:
    """
    Orchestrates LangChain components to transform conversational inputs 
    into formal oracle specifications and implementation guidance.
    """
    
    def __init__(
        self, 
        oracle_designer: OracleDesigner,
        model_providers: Dict[str, Any] = None,
        prompt_templates_dir: str = None,
        few_shot_examples_dir: str = None
    ):
        """
        Initialize the LangChain Service.
        
        Args:
            oracle_designer: Instance of OracleDesigner to integrate with
            model_providers: Dictionary mapping model types to LLM instances
            prompt_templates_dir: Directory containing prompt templates
            few_shot_examples_dir: Directory containing few-shot examples
        """
        self.oracle_designer = oracle_designer
        self.model_providers = model_providers or {}
        self.current_phase = ProcessingPhase.REQUIREMENT_ELICITATION
        
        # Set up directories for templates and examples
        self.prompt_templates_dir = prompt_templates_dir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 
            "prompt_templates"
        )
        self.few_shot_examples_dir = few_shot_examples_dir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "few_shot_examples"
        )
        
        # Initialize memory systems
        self.setup_memory_systems()
        
        # Load prompt templates and few-shot examples
        self.prompt_library = self.load_prompt_templates()
        self.few_shot_examples = self.load_few_shot_examples()
        
        # Setup chains for different phases
        self.setup_chains()
        
        # Setup output parsers
        self.setup_output_parsers()
        
        logger.info("LangChain Service initialized")
    
    def setup_memory_systems(self):
        """Initialize different memory systems for different purposes"""
        # Short-term memory for immediate context
        self.conversation_memory = ConversationBufferMemory(
            memory_key="conversation_history",
            return_messages=True,
            input_key="input",
            output_key="output"
        )
        
        # Summarized memory for longer context
        self.summary_memory = ConversationSummaryMemory(
            llm=self.get_model(ModelType.SUMMARIZATION),
            memory_key="conversation_summary",
            return_messages=True
        )
        
        # Phase-specific memories to maintain context for each design phase
        self.phase_memories = {
            phase: ConversationBufferMemory(
                memory_key=f"{phase.value}_history",
                return_messages=True
            ) for phase in ProcessingPhase
        }
    
    def load_prompt_templates(self) -> Dict[str, Any]:
        """
        Load prompt templates from files
        
        Returns:
            Dictionary mapping template names to loaded templates
        """
        templates = {}
        
        # Define core prompts directly in code for essential functionality
        # System prompts for different processing phases
        templates["requirement_elicitation_system"] = SystemMessagePromptTemplate.from_template(
            "You are an expert oracle designer specialized in eliciting clear requirements. "
            "Focus on understanding the data sources, update frequency, validation methods, "
            "and aggregation techniques needed. Ask clarifying questions about any ambiguous aspects."
        )
        
        templates["architecture_design_system"] = SystemMessagePromptTemplate.from_template(
            "You are an expert blockchain oracle architect. Based on the requirements, "
            "design a robust oracle solution considering security, reliability, and efficiency. "
            "Focus on the technical architecture while maintaining clarity for non-technical users."
        )
        
        templates["security_analysis_system"] = SystemMessagePromptTemplate.from_template(
            "You are a security expert specializing in blockchain oracles. "
            "Analyze the proposed design for potential vulnerabilities, attack vectors, "
            "and failure modes. Suggest specific mitigations for each identified risk."
        )
        
        templates["implementation_planning_system"] = SystemMessagePromptTemplate.from_template(
            "You are an experienced blockchain developer. Create a detailed implementation plan "
            "for the oracle design. Include specific code structures, libraries, testing approaches, "
            "and deployment considerations. Focus on practical implementation details."
        )
        
        # Try to load additional templates from files if they exist
        if os.path.exists(self.prompt_templates_dir):
            for template_file in Path(self.prompt_templates_dir).glob("*.json"):
                try:
                    with open(template_file, 'r') as f:
                        template_data = json.load(f)
                        templates[template_file.stem] = template_data
                    logger.info(f"Loaded template: {template_file.stem}")
                except Exception as e:
                    logger.error(f"Failed to load template {template_file}: {str(e)}")
        
        return templates
    
    def load_few_shot_examples(self) -> Dict[str, List[Dict[str, str]]]:
        """
        Load few-shot examples from files
        
        Returns:
            Dictionary mapping example categories to lists of examples
        """
        examples = {
            "data_source_identification": [],
            "validation_method_selection": [],
            "aggregation_strategy": [],
            "update_frequency": [],
            "security_vulnerabilities": [],
            "implementation_patterns": []
        }
        
        # Add default examples for critical functionality
        examples["data_source_identification"].append({
            "user_input": "I need price data for Ethereum.",
            "analysis": "This request mentions Ethereum price data but doesn't specify data sources.",
            "clarification": "Which specific data sources would you like to use for Ethereum price data? Common options include Coinbase, Binance, Kraken, or decentralized exchanges."
        })
        
        # Try to load additional examples from files if they exist
        if os.path.exists(self.few_shot_examples_dir):
            for example_file in Path(self.few_shot_examples_dir).glob("*.json"):
                try:
                    with open(example_file, 'r') as f:
                        example_data = json.load(f)
                        category = example_file.stem
                        if category in examples:
                            examples[category].extend(example_data)
                        else:
                            examples[category] = example_data
                    logger.info(f"Loaded examples for: {category}")
                except Exception as e:
                    logger.error(f"Failed to load examples {example_file}: {str(e)}")
        
        return examples
    
    def setup_chains(self):
        """Set up LangChain chains for different processing phases"""
        self.chains = {}
        
        # Create chains for each processing phase
        for phase in ProcessingPhase:
            system_template = self.prompt_library.get(f"{phase.value}_system")
            model_type = self.get_appropriate_model_type(phase)
            
            if system_template:
                prompt = ChatPromptTemplate.from_messages([
                    system_template,
                    MessagesPlaceholder(variable_name=f"{phase.value}_history"),
                    HumanMessagePromptTemplate.from_template("{input}")
                ])
                
                self.chains[phase] = LLMChain(
                    llm=self.get_model(model_type),
                    prompt=prompt,
                    memory=self.phase_memories[phase],
                    output_key="output"
                )
        
        # Create specialized validation chain with structured output
        validation_system_prompt = SystemMessagePromptTemplate.from_template(
            "You are a validation expert for blockchain oracle designs. "
            "Analyze the proposed design against technical feasibility, security best practices, "
            "and gas efficiency. Provide a structured assessment with scores and recommendations."
        )
        
        validation_prompt = ChatPromptTemplate.from_messages([
            validation_system_prompt,
            MessagesPlaceholder(variable_name="validation_history"),
            HumanMessagePromptTemplate.from_template(
                "Please validate the following oracle design:\n{design_json}\n\n"
                "Analyze for: 1) Technical feasibility, 2) Security vulnerabilities, "
                "3) Gas efficiency, 4) Decentralization, and 5) Maintainability."
            )
        ])
        
        self.chains[ProcessingPhase.VALIDATION] = LLMChain(
            llm=self.get_model(ModelType.SECURITY),
            prompt=validation_prompt,
            memory=self.phase_memories[ProcessingPhase.VALIDATION],
            output_key="validation_result"
        )
    
    def setup_output_parsers(self):
        """Set up output parsers for structured extraction"""
        # Simple parser for extracting key fields from narrative text
        self.output_parsers = {}
        
        # More complex structured parsers could be added here, potentially using Pydantic models
    
    def get_appropriate_model_type(self, phase: ProcessingPhase) -> ModelType:
        """
        Determine the appropriate model type for a given processing phase
        
        Args:
            phase: The processing phase
            
        Returns:
            The appropriate model type
        """
        phase_to_model_mapping = {
            ProcessingPhase.REQUIREMENT_ELICITATION: ModelType.DEFAULT,
            ProcessingPhase.ARCHITECTURE_DESIGN: ModelType.TECHNICAL,
            ProcessingPhase.SECURITY_ANALYSIS: ModelType.SECURITY,
            ProcessingPhase.IMPLEMENTATION_PLANNING: ModelType.TECHNICAL,
            ProcessingPhase.VALIDATION: ModelType.SECURITY,
            ProcessingPhase.REFINEMENT: ModelType.CREATIVE
        }
        
        return phase_to_model_mapping.get(phase, ModelType.DEFAULT)
    
    def get_model(self, model_type: ModelType = ModelType.DEFAULT) -> Any:
        """
        Get the appropriate language model for the given type
        
        Args:
            model_type: Type of model to use
            
        Returns:
            Language model instance
        """
        # Default to the DEFAULT model if the specified type isn't available
        return self.model_providers.get(model_type.value, self.model_providers.get(ModelType.DEFAULT.value))
    
    def build_context_rich_query(self, user_input: str, phase: ProcessingPhase) -> Dict[str, Any]:
        """
        Build a context-rich query with appropriate system instructions and context
        
        Args:
            user_input: Raw user input
            phase: Current processing phase
            
        Returns:
            Dictionary with input and context for the chain
        """
        # Get current oracle specification
        current_spec = self.oracle_designer.get_specification()
        
        # Build context based on phase
        if phase == ProcessingPhase.REQUIREMENT_ELICITATION:
            context = {
                "input": user_input,
                f"{phase.value}_history": self.phase_memories[phase].buffer
            }
        else:
            # For later phases, include the current specification
            context = {
                "input": user_input,
                "current_spec": json.dumps(current_spec) if current_spec else "{}",
                f"{phase.value}_history": self.phase_memories[phase].buffer
            }
            
        return context
    
    def determine_processing_phase(self, user_input: str, current_spec: Optional[Dict[str, Any]]) -> ProcessingPhase:
        """
        Determine the appropriate processing phase based on the current state and user input
        
        Args:
            user_input: Raw user input
            current_spec: Current oracle specification
            
        Returns:
            Appropriate processing phase
        """
        # If no specification exists or it's minimal, we're in requirements elicitation
        if not current_spec or current_spec.get("confidence_score", 0) < 0.3:
            return ProcessingPhase.REQUIREMENT_ELICITATION
        
        # Check for keywords indicating security concerns
        security_keywords = ["secure", "vulnerability", "attack", "risk", "exploit", "threat"]
        if any(keyword in user_input.lower() for keyword in security_keywords):
            return ProcessingPhase.SECURITY_ANALYSIS
        
        # Check for implementation-focused keywords
        implementation_keywords = ["implement", "code", "develop", "build", "deploy"]
        if any(keyword in user_input.lower() for keyword in implementation_keywords):
            return ProcessingPhase.IMPLEMENTATION_PLANNING
        
        # Check for architecture keywords
        architecture_keywords = ["design", "architecture", "structure", "framework"]
        if any(keyword in user_input.lower() for keyword in architecture_keywords):
            return ProcessingPhase.ARCHITECTURE_DESIGN
        
        # Default to the current phase if none of the above apply
        return self.current_phase
    
    def process_input(self, user_input: str) -> Dict[str, Any]:
        """
        Process user input through the appropriate chains
        
        Args:
            user_input: Raw user input from the user
            
        Returns:
            Processed response and updated specification
        """
        logger.info(f"Processing input: {user_input[:50]}...")
        
        # Get current specification
        current_spec = self.oracle_designer.get_specification()
        
        # Determine the appropriate processing phase
        phase = self.determine_processing_phase(user_input, current_spec)
        self.current_phase = phase
        logger.info(f"Selected processing phase: {phase.value}")
        
        # Build context-rich query
        context = self.build_context_rich_query(user_input, phase)
        
        # Process through the appropriate chain
        chain = self.chains.get(phase)
        if not chain:
            logger.warning(f"No chain available for phase {phase.value}, falling back to oracle designer")
            return self.oracle_designer.process_input(user_input)
        
        # Execute the chain
        with get_openai_callback() as cb:
            try:
                result = chain(context)
                logger.info(f"LLM usage: Tokens={cb.total_tokens}, Cost=${cb.total_cost:.6f}")
            except Exception as e:
                logger.error(f"Error executing chain: {str(e)}")
                # Fall back to oracle designer in case of error
                return self.oracle_designer.process_input(user_input)
        
        # Extract structured data from the result if needed
        extracted_data = self.extract_structured_data(result["output"], phase)
        
        # Update the oracle specification using oracle_designer
        updated_spec = self.update_oracle_specification(user_input, extracted_data)
        
        # Prepare response
        response = {
            "response": result["output"],
            "phase": phase.value,
            "specification": updated_spec,
            "extracted_data": extracted_data
        }
        
        # Update memories
        self.update_memories(user_input, result["output"], phase)
        
        return response
    
    def extract_structured_data(self, llm_output: str, phase: ProcessingPhase) -> Dict[str, Any]:
        """
        Extract structured data from narrative language model output
        
        Args:
            llm_output: Raw output from the language model
            phase: Current processing phase
            
        Returns:
            Dictionary of extracted structured data
        """
        extracted_data = {}
        
        # Simple keyword-based extraction for key oracle components
        if phase == ProcessingPhase.REQUIREMENT_ELICITATION:
            # Extract data sources
            data_sources = []
            data_source_indicators = ["data source", "api", "feed", "provider"]
            for line in llm_output.split("\n"):
                if any(indicator in line.lower() for indicator in data_source_indicators):
                    # Simple extraction - would need more sophisticated parsing in production
                    data_sources.append(line.strip())
            
            if data_sources:
                extracted_data["data_sources"] = data_sources
            
            # Extract other components with similar approach
            # This is simplified - a production system would use more robust extraction methods
        
        # For architecture design phase, extract components
        elif phase == ProcessingPhase.ARCHITECTURE_DESIGN:
            # Simplified extraction of architectural components
            components = []
            component_indicators = ["component", "module", "service", "contract"]
            capture = False
            current_component = ""
            
            for line in llm_output.split("\n"):
                if any(indicator in line.lower() for indicator in component_indicators):
                    if current_component:
                        components.append(current_component.strip())
                    current_component = line
                    capture = True
                elif capture and line.strip():
                    current_component += "\n" + line
            
            if current_component:
                components.append(current_component.strip())
            
            if components:
                extracted_data["components"] = components
        
        return extracted_data
    
    def update_oracle_specification(self, user_input: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update the oracle specification using the oracle designer
        
        Args:
            user_input: Original user input
            extracted_data: Structured data extracted from LLM output
            
        Returns:
            Updated specification dictionary
        """
        # Use the oracle designer to update the specification
        # This ensures we maintain compatibility with the existing system
        result = self.oracle_designer.process_input(user_input)
        
        # Get the updated specification
        updated_spec = self.oracle_designer.get_specification()
        
        return updated_spec
    
    def update_memories(self, user_input: str, response: str, phase: ProcessingPhase):
        """
        Update memory systems with the latest interaction
        
        Args:
            user_input: User's input
            response: System's response
            phase: Current processing phase
        """
        # Update the main conversation memory
        self.conversation_memory.save_context(
            {"input": user_input},
            {"output": response}
        )
        
        # Update the summary memory
        self.summary_memory.save_context(
            {"input": user_input},
            {"output": response}
        )
        
        # Filter noise and extract key information before saving to phase-specific memory
        filtered_input = self.filter_memory_noise(user_input)
        filtered_response = self.filter_memory_noise(response)
        
        # Update the phase-specific memory
        self.phase_memories[phase].save_context(
            {"input": filtered_input},
            {"output": filtered_response}
        )
    
    def filter_memory_noise(self, text: str) -> str:
        """
        Filter out noise from text to be stored in memory
        
        Args:
            text: Raw text to filter
            
        Returns:
            Filtered text
        """
        # In a production system, this would implement sophisticated filtering
        # For now, we'll use a simple approach to remove pleasantries and keep content
        
        # Remove common pleasantries
        pleasantries = [
            "hello", "hi there", "thanks", "thank you", "good morning", 
            "good afternoon", "good evening", "appreciate it"
        ]
        
        filtered_text = text
        for phrase in pleasantries:
            filtered_text = filtered_text.replace(phrase, "")
        
        # Remove excessive whitespace
        filtered_text = " ".join(filtered_text.split())
        
        return filtered_text
    
    def validate_design(self, design_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a proposed oracle design using the validation chain
        
        Args:
            design_json: JSON representation of the oracle design
            
        Returns:
            Validation results
        """
        validation_chain = self.chains.get(ProcessingPhase.VALIDATION)
        if not validation_chain:
            logger.warning("Validation chain not available")
            return {"error": "Validation chain not available"}
        
        context = {
            "design_json": json.dumps(design_json),
            "validation_history": self.phase_memories[ProcessingPhase.VALIDATION].buffer
        }
        
        try:
            result = validation_chain(context)
            return {
                "result": result["validation_result"],
                "success": True
            }
        except Exception as e:
            logger.error(f"Error in validation: {str(e)}")
            return {"error": str(e), "success": False}
    
    def cross_verify_design(self, design_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cross-verify a design by comparing outputs from multiple reasoning paths
        
        Args:
            design_json: JSON representation of the oracle design
            
        Returns:
            Cross-verification results
        """
        # Get models for different perspectives
        security_model = self.get_model(ModelType.SECURITY)
        technical_model = self.get_model(ModelType.TECHNICAL)
        
        # Create separate prompts for each perspective
        security_prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(
                "You are a security expert specializing in blockchain oracles. "
                "Analyze this design ONLY for security vulnerabilities and risks."
            ),
            HumanMessagePromptTemplate.from_template(
                "Analyze this oracle design from a security perspective ONLY:\n{design}"
            )
        ])
        
        technical_prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(
                "You are a senior blockchain developer specializing in oracle implementation. "
                "Analyze this design ONLY for technical feasibility and efficiency."
            ),
            HumanMessagePromptTemplate.from_template(
                "Analyze this oracle design from a technical implementation perspective ONLY:\n{design}"
            )
        ])
        
        # Create chains
        security_chain = LLMChain(
            llm=security_model,
            prompt=security_prompt,
            output_key="security_analysis"
        )
        
        technical_chain = LLMChain(
            llm=technical_model,
            prompt=technical_prompt,
            output_key="technical_analysis"
        )
        
        # Execute chains
        try:
            security_result = security_chain({"design": json.dumps(design_json)})
            technical_result = technical_chain({"design": json.dumps(design_json)})
            
            # Compare results to find inconsistencies
            comparison_prompt = ChatPromptTemplate.from_messages([
                SystemMessagePromptTemplate.from_template(
                    "You are an expert at identifying inconsistencies between different perspectives. "
                    "Compare the security analysis and technical analysis of an oracle design and "
                    "identify any conflicts, oversights, or areas where the perspectives disagree."
                ),
                HumanMessagePromptTemplate.from_template(
                    "Security Analysis:\n{security_analysis}\n\n"
                    "Technical Analysis:\n{technical_analysis}\n\n"
                    "Identify any inconsistencies, conflicts, or areas where these perspectives may be "
                    "overlooking important considerations."
                )
            ])
            
            comparison_chain = LLMChain(
                llm=self.get_model(ModelType.DEFAULT),
                prompt=comparison_prompt,
                output_key="comparison"
            )
            
            comparison_result = comparison_chain({
                "security_analysis": security_result["security_analysis"],
                "technical_analysis": technical_result["technical_analysis"]
            })
            
            return {
                "security_analysis": security_result["security_analysis"],
                "technical_analysis": technical_result["technical_analysis"],
                "comparison": comparison_result["comparison"],
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error in cross-verification: {str(e)}")
            return {"error": str(e), "success": False}


def create_langchain_service(oracle_designer: OracleDesigner, model_providers: Dict[str, Any] = None) -> LangChainService:
    """
    Factory function to create and configure a LangChain service instance
    
    Args:
        oracle_designer: OracleDesigner instance to integrate with
        model_providers: Dictionary of model providers
        
    Returns:
        Configured LangChainService instance
    """
    return LangChainService(oracle_designer=oracle_designer, model_providers=model_providers) 