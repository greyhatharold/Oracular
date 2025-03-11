"""
Context Manager for Oracle Design Discussions

This module provides a sophisticated conversation management system that maintains
semantic understanding of oracle design discussions across extended interactions.
It implements hierarchical memory structures, context windowing, entity tracking,
and conversation management features.
"""

import logging
from typing import Dict, List, Optional, Any, Set, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime
import json
from enum import Enum
import networkx as nx
from pydantic import BaseModel, Field
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import tiktoken

# Local imports
from src.backend.ai.oracle_designer import (
    OracleSpecification,
    DataSourceSpec,
    ValidationSpec,
    AggregationSpec,
    UpdateSpec
)

logger = logging.getLogger(__name__)

class ConversationTopic(Enum):
    """Topics in oracle design discussions"""
    DATA_SOURCES = "data_sources"
    VALIDATION = "validation"
    SECURITY = "security"
    IMPLEMENTATION = "implementation"
    ARCHITECTURE = "architecture"
    REQUIREMENTS = "requirements"
    GENERAL = "general"

class ConversationPhase(Enum):
    """Phases of the design discussion"""
    INITIAL_REQUIREMENTS = "initial_requirements"
    CLARIFICATION = "clarification"
    DESIGN = "design"
    VALIDATION = "validation"
    IMPLEMENTATION = "implementation"
    REFINEMENT = "refinement"

@dataclass
class ConversationMilestone:
    """Represents a significant point in the design discussion"""
    timestamp: datetime
    phase: ConversationPhase
    description: str
    specification_snapshot: Dict[str, Any]
    context_snapshot: Dict[str, Any]
    importance: float = 1.0

@dataclass
class ConversationEntity:
    """Tracks an entity (component, concept, requirement) in the discussion"""
    name: str
    aliases: Set[str]
    entity_type: str
    first_mention: datetime
    last_mention: datetime
    importance: float = 1.0
    references: List[Dict[str, Any]] = field(default_factory=list)

class MessageMetadata(BaseModel):
    """Metadata enriching conversation messages"""
    timestamp: datetime
    topic: ConversationTopic
    phase: ConversationPhase
    entities: List[str] = Field(default_factory=list)
    importance: float = 1.0
    technical_context: Dict[str, Any] = Field(default_factory=dict)
    security_context: Dict[str, Any] = Field(default_factory=dict)
    implementation_context: Dict[str, Any] = Field(default_factory=dict)

@dataclass
class ConversationMessage:
    """Represents a message in the design discussion"""
    role: str
    content: str
    metadata: MessageMetadata
    references: Dict[str, Any] = field(default_factory=dict)

class ConversationThread:
    """Manages a conceptual thread of discussion"""
    
    def __init__(self, topic: ConversationTopic):
        self.topic = topic
        self.messages: List[ConversationMessage] = []
        self.entities: Dict[str, ConversationEntity] = {}
        self.importance: float = 1.0
        self.last_active: datetime = datetime.utcnow()
    
    def add_message(self, message: ConversationMessage):
        """Add a message to the thread"""
        self.messages.append(message)
        self.last_active = message.metadata.timestamp
        self._update_entities(message)
        self._update_importance()
    
    def _update_entities(self, message: ConversationMessage):
        """Update entity tracking based on new message"""
        now = datetime.utcnow()
        
        for entity_name in message.metadata.entities:
            if entity_name in self.entities:
                entity = self.entities[entity_name]
                entity.last_mention = now
                entity.references.append({
                    'message_index': len(self.messages) - 1,
                    'timestamp': now
                })
            else:
                self.entities[entity_name] = ConversationEntity(
                    name=entity_name,
                    aliases=set(),
                    entity_type='unknown',
                    first_mention=now,
                    last_mention=now,
                    references=[{
                        'message_index': len(self.messages) - 1,
                        'timestamp': now
                    }]
                )
    
    def _update_importance(self):
        """Update thread importance based on recency and content"""
        time_decay = 0.1
        self.importance *= (1 - time_decay)
        self.importance = max(0.1, self.importance)

class ContextWindow:
    """Manages active context within model token limitations"""
    
    def __init__(self, max_tokens: int = 4096):
        self.max_tokens = max_tokens
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.active_messages: List[ConversationMessage] = []
        self.token_count: int = 0
    
    def add_message(self, message: ConversationMessage) -> bool:
        """
        Add message to context window if space allows
        
        Returns:
            bool: Whether message was added
        """
        message_tokens = len(self.tokenizer.encode(message.content))
        
        if self.token_count + message_tokens <= self.max_tokens:
            self.active_messages.append(message)
            self.token_count += message_tokens
            return True
        
        return False
    
    def make_space(self, needed_tokens: int):
        """Free up space in the context window"""
        while (self.token_count + needed_tokens > self.max_tokens and 
               len(self.active_messages) > 0):
            removed = self.active_messages.pop(0)
            self.token_count -= len(self.tokenizer.encode(removed.content))
    
    def get_context(self) -> List[ConversationMessage]:
        """Get current context window contents"""
        return self.active_messages.copy()

class ConversationSummarizer:
    """Generates concise summaries of conversation segments"""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer()
    
    def summarize_thread(
        self,
        messages: List[ConversationMessage],
        max_length: int = 500
    ) -> str:
        """Generate a concise summary of messages"""
        if not messages:
            return ""
        
        # Extract key messages based on importance and semantic similarity
        key_messages = self._extract_key_messages(messages)
        
        # Combine key messages into a summary
        summary = self._combine_messages(key_messages, max_length)
        
        return summary
    
    def _extract_key_messages(
        self,
        messages: List[ConversationMessage]
    ) -> List[ConversationMessage]:
        """Extract most important messages"""
        if len(messages) <= 3:
            return messages
        
        # Create message vectors
        texts = [msg.content for msg in messages]
        vectors = self.vectorizer.fit_transform(texts)
        
        # Calculate importance scores
        importance_scores = np.array([msg.metadata.importance for msg in messages])
        
        # Calculate semantic similarity
        similarities = cosine_similarity(vectors)
        
        # Select diverse, important messages
        selected_indices = []
        while len(selected_indices) < min(3, len(messages)):
            # Find most important unselected message
            remaining = set(range(len(messages))) - set(selected_indices)
            if not remaining:
                break
                
            scores = importance_scores.copy()
            
            # Penalize similarity to already selected messages
            for idx in selected_indices:
                scores -= np.mean([similarities[idx][j] for j in remaining])
            
            scores[list(selected_indices)] = -np.inf
            selected_indices.append(np.argmax(scores))
        
        return [messages[i] for i in sorted(selected_indices)]
    
    def _combine_messages(
        self,
        messages: List[ConversationMessage],
        max_length: int
    ) -> str:
        """Combine messages into a coherent summary"""
        summary_parts = []
        current_length = 0
        
        for msg in messages:
            content = msg.content
            if current_length + len(content) > max_length:
                # Truncate to fit
                available = max_length - current_length
                if available > 20:  # Only add if reasonable space remains
                    content = content[:available] + "..."
                    summary_parts.append(content)
                break
            
            summary_parts.append(content)
            current_length += len(content)
        
        return " ".join(summary_parts)

class ContextVisualizer:
    """Visualizes conversation context and influences"""
    
    def __init__(self):
        self.graph = nx.DiGraph()
    
    def update_visualization(
        self,
        threads: Dict[ConversationTopic, ConversationThread],
        entities: Dict[str, ConversationEntity],
        milestones: List[ConversationMilestone]
    ):
        """Update the context visualization"""
        self.graph.clear()
        
        # Add thread nodes
        for topic, thread in threads.items():
            self.graph.add_node(
                f"thread:{topic.value}",
                type="thread",
                importance=thread.importance
            )
        
        # Add entity nodes
        for name, entity in entities.items():
            self.graph.add_node(
                f"entity:{name}",
                type="entity",
                importance=entity.importance
            )
        
        # Add milestone nodes
        for i, milestone in enumerate(milestones):
            self.graph.add_node(
                f"milestone:{i}",
                type="milestone",
                phase=milestone.phase.value
            )
        
        # Add edges for entity references
        for name, entity in entities.items():
            for ref in entity.references:
                if 'thread' in ref:
                    self.graph.add_edge(
                        f"entity:{name}",
                        f"thread:{ref['thread']}"
                    )
    
    def get_visualization(self) -> Dict[str, Any]:
        """Get the current visualization state"""
        return {
            'nodes': [
                {
                    'id': node,
                    'type': self.graph.nodes[node]['type'],
                    'importance': self.graph.nodes[node].get('importance', 1.0)
                }
                for node in self.graph.nodes()
            ],
            'edges': [
                {
                    'source': source,
                    'target': target
                }
                for source, target in self.graph.edges()
            ]
        }

class ContextManager:
    """
    Main class for managing oracle design conversations
    """
    
    def __init__(self):
        self.threads: Dict[ConversationTopic, ConversationThread] = {
            topic: ConversationThread(topic) for topic in ConversationTopic
        }
        self.context_window = ContextWindow()
        self.summarizer = ConversationSummarizer()
        self.visualizer = ContextVisualizer()
        self.milestones: List[ConversationMilestone] = []
        
        # Global entity tracking
        self.entities: Dict[str, ConversationEntity] = {}
        
        # Current phase tracking
        self.current_phase = ConversationPhase.INITIAL_REQUIREMENTS
    
    def process_message(
        self,
        role: str,
        content: str,
        topic: Optional[ConversationTopic] = None
    ) -> Dict[str, Any]:
        """
        Process a new conversation message
        
        Args:
            role: Message role (user/assistant)
            content: Message content
            topic: Optional specific topic
            
        Returns:
            Processing results including updated context
        """
        # Analyze message content
        metadata = self._analyze_message(content)
        if topic:
            metadata.topic = topic
        
        # Create message object
        message = ConversationMessage(
            role=role,
            content=content,
            metadata=metadata
        )
        
        # Add to appropriate thread(s)
        self._add_to_threads(message)
        
        # Update context window
        self._update_context_window(message)
        
        # Update visualization
        self.visualizer.update_visualization(
            self.threads,
            self.entities,
            self.milestones
        )
        
        return {
            'message': message,
            'context': self.get_current_context(),
            'visualization': self.visualizer.get_visualization()
        }
    
    def _analyze_message(self, content: str) -> MessageMetadata:
        """Analyze message content for metadata"""
        # Extract entities
        entities = self._extract_entities(content)
        
        # Determine topic
        topic = self._determine_topic(content)
        
        # Create metadata
        metadata = MessageMetadata(
            timestamp=datetime.utcnow(),
            topic=topic,
            phase=self.current_phase,
            entities=list(entities),
            importance=self._calculate_importance(content),
            technical_context=self._extract_technical_context(content),
            security_context=self._extract_security_context(content),
            implementation_context=self._extract_implementation_context(content)
        )
        
        return metadata
    
    def _extract_entities(self, content: str) -> Set[str]:
        """Extract entity references from content"""
        entities = set()
        
        # Add existing entities if referenced
        for entity in self.entities.values():
            if entity.name.lower() in content.lower():
                entities.add(entity.name)
            for alias in entity.aliases:
                if alias.lower() in content.lower():
                    entities.add(entity.name)
        
        # TODO: Extract new entities using NLP
        
        return entities
    
    def _determine_topic(self, content: str) -> ConversationTopic:
        """Determine the primary topic of the message"""
        # Simple keyword-based topic detection
        topic_keywords = {
            ConversationTopic.DATA_SOURCES: [
                "data source", "api", "feed", "input"
            ],
            ConversationTopic.VALIDATION: [
                "validate", "verify", "check", "confirm"
            ],
            ConversationTopic.SECURITY: [
                "security", "risk", "threat", "vulnerability"
            ],
            ConversationTopic.IMPLEMENTATION: [
                "implement", "code", "develop", "build"
            ],
            ConversationTopic.ARCHITECTURE: [
                "architecture", "design", "structure", "pattern"
            ],
            ConversationTopic.REQUIREMENTS: [
                "requirement", "need", "must", "should"
            ]
        }
        
        max_matches = 0
        best_topic = ConversationTopic.GENERAL
        
        for topic, keywords in topic_keywords.items():
            matches = sum(1 for kw in keywords if kw.lower() in content.lower())
            if matches > max_matches:
                max_matches = matches
                best_topic = topic
        
        return best_topic
    
    def _calculate_importance(self, content: str) -> float:
        """Calculate message importance score"""
        importance = 1.0
        
        # Adjust based on content indicators
        importance_indicators = {
            "critical": 0.3,
            "important": 0.2,
            "must": 0.2,
            "should": 0.1,
            "maybe": -0.1,
            "might": -0.1
        }
        
        for indicator, adjustment in importance_indicators.items():
            if indicator in content.lower():
                importance += adjustment
        
        # Ensure valid range
        return max(0.1, min(1.0, importance))
    
    def _extract_technical_context(self, content: str) -> Dict[str, Any]:
        """Extract technical context from message"""
        context = {}
        
        # Extract technical parameters
        if "update frequency" in content.lower():
            context["update_frequency"] = True
        if "validation method" in content.lower():
            context["validation_method"] = True
        
        return context
    
    def _extract_security_context(self, content: str) -> Dict[str, Any]:
        """Extract security context from message"""
        context = {}
        
        # Extract security considerations
        if "access control" in content.lower():
            context["access_control"] = True
        if "authentication" in content.lower():
            context["authentication"] = True
        
        return context
    
    def _extract_implementation_context(self, content: str) -> Dict[str, Any]:
        """Extract implementation context from message"""
        context = {}
        
        # Extract implementation details
        if "smart contract" in content.lower():
            context["smart_contract"] = True
        if "api" in content.lower():
            context["api_integration"] = True
        
        return context
    
    def _add_to_threads(self, message: ConversationMessage):
        """Add message to appropriate thread(s)"""
        # Always add to the primary topic thread
        primary_thread = self.threads[message.metadata.topic]
        primary_thread.add_message(message)
        
        # Add to general thread if significant
        if message.metadata.importance > 0.7:
            general_thread = self.threads[ConversationTopic.GENERAL]
            general_thread.add_message(message)
        
        # Update entity tracking
        self._update_entities(message)
    
    def _update_entities(self, message: ConversationMessage):
        """Update global entity tracking"""
        now = datetime.utcnow()
        
        for entity_name in message.metadata.entities:
            if entity_name in self.entities:
                entity = self.entities[entity_name]
                entity.last_mention = now
                entity.references.append({
                    'message': message,
                    'thread': message.metadata.topic,
                    'timestamp': now
                })
            else:
                self.entities[entity_name] = ConversationEntity(
                    name=entity_name,
                    aliases=set(),
                    entity_type='unknown',
                    first_mention=now,
                    last_mention=now,
                    references=[{
                        'message': message,
                        'thread': message.metadata.topic,
                        'timestamp': now
                    }]
                )
    
    def _update_context_window(self, message: ConversationMessage):
        """Update the active context window"""
        # Try to add the new message
        if not self.context_window.add_message(message):
            # Need to make space
            needed_tokens = len(self.context_window.tokenizer.encode(message.content))
            self.context_window.make_space(needed_tokens)
            self.context_window.add_message(message)
    
    def create_milestone(self, description: str):
        """Create a conversation milestone"""
        milestone = ConversationMilestone(
            timestamp=datetime.utcnow(),
            phase=self.current_phase,
            description=description,
            specification_snapshot=self._create_specification_snapshot(),
            context_snapshot=self._create_context_snapshot(),
            importance=1.0
        )
        
        self.milestones.append(milestone)
        return milestone
    
    def _create_specification_snapshot(self) -> Dict[str, Any]:
        """Create a snapshot of current specification state"""
        # Extract specification from threads
        spec = {
            'data_sources': self._extract_thread_summary(ConversationTopic.DATA_SOURCES),
            'validation': self._extract_thread_summary(ConversationTopic.VALIDATION),
            'security': self._extract_thread_summary(ConversationTopic.SECURITY),
            'implementation': self._extract_thread_summary(ConversationTopic.IMPLEMENTATION)
        }
        
        return spec
    
    def _create_context_snapshot(self) -> Dict[str, Any]:
        """Create a snapshot of current context state"""
        return {
            'active_entities': [
                {
                    'name': entity.name,
                    'importance': entity.importance,
                    'last_mention': entity.last_mention.isoformat()
                }
                for entity in self.entities.values()
            ],
            'thread_states': {
                topic.value: {
                    'importance': thread.importance,
                    'last_active': thread.last_active.isoformat()
                }
                for topic, thread in self.threads.items()
            }
        }
    
    def _extract_thread_summary(self, topic: ConversationTopic) -> str:
        """Extract a summary of a thread's current state"""
        thread = self.threads[topic]
        return self.summarizer.summarize_thread(thread.messages)
    
    def get_current_context(self) -> Dict[str, Any]:
        """Get the current conversation context"""
        return {
            'active_messages': self.context_window.get_context(),
            'current_phase': self.current_phase.value,
            'active_topics': [
                {
                    'topic': topic.value,
                    'importance': thread.importance,
                    'entity_count': len(thread.entities)
                }
                for topic, thread in self.threads.items()
                if thread.importance > 0.2
            ],
            'key_entities': [
                {
                    'name': entity.name,
                    'importance': entity.importance,
                    'mentions': len(entity.references)
                }
                for entity in self.entities.values()
                if entity.importance > 0.5
            ]
        }
    
    def export_conversation(
        self,
        format: str = "markdown"
    ) -> Union[str, Dict[str, Any]]:
        """Export conversation as documentation"""
        if format == "markdown":
            return self._export_markdown()
        elif format == "json":
            return self._export_json()
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def _export_markdown(self) -> str:
        """Export conversation as markdown documentation"""
        sections = []
        
        # Overview
        sections.append("# Oracle Design Discussion\n")
        sections.append("## Overview\n")
        sections.append(self._extract_thread_summary(ConversationTopic.GENERAL))
        sections.append("\n")
        
        # Key Topics
        for topic in ConversationTopic:
            if topic != ConversationTopic.GENERAL:
                thread = self.threads[topic]
                if thread.messages:
                    sections.append(f"## {topic.value.title()}\n")
                    sections.append(self.summarizer.summarize_thread(thread.messages))
                    sections.append("\n")
        
        # Milestones
        sections.append("## Design Milestones\n")
        for milestone in self.milestones:
            sections.append(f"### {milestone.description}\n")
            sections.append(f"Phase: {milestone.phase.value}\n")
            sections.append(f"Timestamp: {milestone.timestamp.isoformat()}\n")
            sections.append("\n")
        
        return "\n".join(sections)
    
    def _export_json(self) -> Dict[str, Any]:
        """Export conversation as structured JSON"""
        return {
            'topics': {
                topic.value: {
                    'messages': [
                        {
                            'role': msg.role,
                            'content': msg.content,
                            'metadata': msg.metadata.dict()
                        }
                        for msg in thread.messages
                    ],
                    'importance': thread.importance,
                    'entities': [
                        {
                            'name': entity.name,
                            'importance': entity.importance,
                            'references': len(entity.references)
                        }
                        for entity in thread.entities.values()
                    ]
                }
                for topic, thread in self.threads.items()
            },
            'milestones': [
                {
                    'description': milestone.description,
                    'phase': milestone.phase.value,
                    'timestamp': milestone.timestamp.isoformat(),
                    'importance': milestone.importance
                }
                for milestone in self.milestones
            ],
            'entities': [
                {
                    'name': entity.name,
                    'aliases': list(entity.aliases),
                    'importance': entity.importance,
                    'first_mention': entity.first_mention.isoformat(),
                    'last_mention': entity.last_mention.isoformat()
                }
                for entity in self.entities.values()
            ]
        }

def create_context_manager() -> ContextManager:
    """
    Factory function to create and configure a ContextManager instance
    
    Returns:
        Configured ContextManager instance
    """
    return ContextManager() 