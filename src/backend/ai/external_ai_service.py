"""
External AI Service for Oracle Designer

This module provides a sophisticated service layer for managing interactions with external
language model APIs, optimizing for reliability, cost efficiency, and quality of oracle
design guidance. It implements connection management, retry policies, request throttling,
token optimization, streaming responses, caching, validation, and analytics.
"""

import asyncio
import json
import logging
import time
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import (
    Dict, List, Optional, Any, Tuple, Union, AsyncGenerator,
    Callable, Set, TypeVar, Generic
)
import hashlib
import aiohttp
import backoff
import tenacity
from redis import Redis
from prometheus_client import Counter, Histogram, Gauge

# Local imports
from src.backend.ai.oracle_designer import (
    OracleSpecification,
    OracleDesigner,
    SpecificationConfidence
)

logger = logging.getLogger(__name__)

class ModelProvider(Enum):
    """Supported external model providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    AZURE = "azure"
    LOCAL = "local"

class ModelTier(Enum):
    """Model capability tiers"""
    BASIC = "basic"
    STANDARD = "standard"
    ADVANCED = "advanced"
    EXPERT = "expert"

@dataclass
class ModelConfig:
    """Configuration for a specific model"""
    provider: ModelProvider
    model_id: str
    tier: ModelTier
    max_tokens: int
    cost_per_token: float
    supports_streaming: bool
    context_window: int
    typical_latency: float  # milliseconds
    rate_limits: Dict[str, int]  # requests per time window
    timeout: float  # seconds
    retry_limit: int
    backoff_factor: float
    jitter: bool = True

@dataclass
class RequestMetrics:
    """Metrics for a single request"""
    start_time: datetime
    end_time: Optional[datetime]
    tokens_used: int
    cost: float
    success: bool
    latency: float
    error: Optional[str]

class TokenOptimizer:
    """Optimizes prompts for token efficiency while preserving semantic content"""
    
    def __init__(self):
        self.compression_patterns = {
            r'\b(for example|e\.g\.,)\b': 'eg',
            r'\b(that is to say|i\.e\.,)\b': 'ie',
            r'\b(with respect to)\b': 're',
            r'\b(in order to)\b': 'to',
            r'\b(please note that)\b': 'note',
            r'\b(in addition to)\b': 'and',
            r'\b(as well as)\b': 'and',
        }
        
    def optimize_prompt(self, prompt: str) -> str:
        """
        Optimize a prompt for token efficiency
        
        Args:
            prompt: Original prompt text
            
        Returns:
            Optimized prompt text
        """
        optimized = prompt
        
        # Apply compression patterns
        for pattern, replacement in self.compression_patterns.items():
            optimized = re.sub(pattern, replacement, optimized)
        
        # Remove redundant whitespace
        optimized = ' '.join(optimized.split())
        
        # Remove unnecessary punctuation
        optimized = re.sub(r'[,.;]+\s*', ' ', optimized)
        
        return optimized.strip()
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for a text string"""
        # Simple estimation: ~4 characters per token
        return len(text) // 4

class ResponseValidator:
    """Validates model responses for technical correctness and hallucination detection"""
    
    def __init__(self):
        self.technical_constraints = {
            'update_frequency': {
                'min_seconds': 1,
                'max_seconds': 2592000  # 30 days
            },
            'data_sources': {
                'min_count': 1,
                'max_count': 10
            }
        }
        
    def validate_response(
        self,
        response: Dict[str, Any],
        original_spec: Optional[OracleSpecification] = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate a model response for technical correctness
        
        Args:
            response: Parsed model response
            original_spec: Original specification for context
            
        Returns:
            Tuple of (is_valid, list of validation messages)
        """
        messages = []
        is_valid = True
        
        # Validate data sources
        if 'data_sources' in response:
            sources = response['data_sources']
            if not self.technical_constraints['data_sources']['min_count'] <= len(sources) <= self.technical_constraints['data_sources']['max_count']:
                messages.append(f"Invalid number of data sources: {len(sources)}")
                is_valid = False
        
        # Validate update frequency
        if 'update_frequency' in response:
            freq = response['update_frequency']
            try:
                seconds = self._parse_frequency_to_seconds(freq)
                if not self.technical_constraints['update_frequency']['min_seconds'] <= seconds <= self.technical_constraints['update_frequency']['max_seconds']:
                    messages.append(f"Invalid update frequency: {freq}")
                    is_valid = False
            except ValueError as e:
                messages.append(str(e))
                is_valid = False
        
        # Check for logical consistency
        if original_spec:
            inconsistencies = self._check_logical_consistency(response, original_spec)
            if inconsistencies:
                messages.extend(inconsistencies)
                is_valid = False
        
        return is_valid, messages
    
    def _parse_frequency_to_seconds(self, frequency: str) -> int:
        """Convert frequency string to seconds"""
        # Implementation of frequency parsing
        pass
    
    def _check_logical_consistency(
        self,
        response: Dict[str, Any],
        spec: OracleSpecification
    ) -> List[str]:
        """Check for logical consistency with existing specification"""
        inconsistencies = []
        
        # Check data type consistency
        if 'data_type' in response and response['data_type'] != spec.data_type:
            inconsistencies.append(
                f"Inconsistent data type: {response['data_type']} vs {spec.data_type}"
            )
        
        # Check validation method compatibility
        if 'validation_methods' in response:
            for method in response['validation_methods']:
                if not self._is_validation_compatible(method, spec.data_type):
                    inconsistencies.append(
                        f"Validation method {method} incompatible with {spec.data_type}"
                    )
        
        return inconsistencies
    
    def _is_validation_compatible(self, method: str, data_type: str) -> bool:
        """Check if validation method is compatible with data type"""
        # Implementation of validation compatibility checking
        pass

class ResponseCache:
    """Caches and retrieves model responses for common patterns"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.cache_ttl = 3600  # 1 hour default TTL
        self.similarity_threshold = 0.85
    
    async def get_cached_response(
        self,
        prompt: str,
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached response for similar prompts
        
        Args:
            prompt: Current prompt
            context: Additional context
            
        Returns:
            Cached response if available and similar enough
        """
        cache_key = self._generate_cache_key(prompt, context)
        cached = await self.redis.get(cache_key)
        
        if cached:
            cached_data = json.loads(cached)
            if self._is_cache_valid(cached_data, context):
                return cached_data['response']
        
        return None
    
    async def cache_response(
        self,
        prompt: str,
        response: Dict[str, Any],
        context: Dict[str, Any]
    ):
        """Cache a response with its context"""
        cache_key = self._generate_cache_key(prompt, context)
        cache_data = {
            'response': response,
            'context': context,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.redis.setex(
            cache_key,
            self.cache_ttl,
            json.dumps(cache_data)
        )
    
    def _generate_cache_key(self, prompt: str, context: Dict[str, Any]) -> str:
        """Generate cache key from prompt and context"""
        # Create a deterministic representation of the context
        context_str = json.dumps(context, sort_keys=True)
        
        # Combine prompt and context and hash
        combined = f"{prompt}|{context_str}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    def _is_cache_valid(
        self,
        cached_data: Dict[str, Any],
        current_context: Dict[str, Any]
    ) -> bool:
        """Check if cached data is still valid for current context"""
        cached_context = cached_data.get('context', {})
        cached_time = datetime.fromisoformat(cached_data.get('timestamp', ''))
        
        # Check if cache is too old
        if datetime.utcnow() - cached_time > timedelta(hours=1):
            return False
        
        # Check context similarity
        return self._context_similarity(cached_context, current_context) >= self.similarity_threshold
    
    def _context_similarity(
        self,
        context1: Dict[str, Any],
        context2: Dict[str, Any]
    ) -> float:
        """Calculate similarity score between two contexts"""
        # Implementation of context similarity calculation
        pass

class ModelManager:
    """Manages model selection and failover strategies"""
    
    def __init__(self, configs: Dict[str, ModelConfig]):
        self.configs = configs
        self.health_checks: Dict[str, bool] = {
            model_id: True for model_id in configs
        }
        self.last_errors: Dict[str, List[Tuple[datetime, str]]] = {
            model_id: [] for model_id in configs
        }
    
    async def select_model(
        self,
        task_type: str,
        context: Dict[str, Any]
    ) -> Tuple[str, ModelConfig]:
        """
        Select the most appropriate model for a task
        
        Args:
            task_type: Type of task to perform
            context: Task context
            
        Returns:
            Tuple of (model_id, model_config)
        """
        candidates = self._filter_candidates(task_type, context)
        ranked = self._rank_candidates(candidates, context)
        
        for model_id in ranked:
            if self.health_checks[model_id]:
                return model_id, self.configs[model_id]
        
        raise RuntimeError("No healthy models available")
    
    def _filter_candidates(
        self,
        task_type: str,
        context: Dict[str, Any]
    ) -> List[str]:
        """Filter models suitable for the task"""
        candidates = []
        
        for model_id, config in self.configs.items():
            if self._meets_requirements(config, task_type, context):
                candidates.append(model_id)
        
        return candidates
    
    def _rank_candidates(
        self,
        candidates: List[str],
        context: Dict[str, Any]
    ) -> List[str]:
        """Rank candidate models by suitability"""
        scores = []
        
        for model_id in candidates:
            config = self.configs[model_id]
            score = self._calculate_score(config, context)
            scores.append((score, model_id))
        
        return [model_id for _, model_id in sorted(scores, reverse=True)]
    
    def _meets_requirements(
        self,
        config: ModelConfig,
        task_type: str,
        context: Dict[str, Any]
    ) -> bool:
        """Check if model meets task requirements"""
        # Implementation of requirements checking
        pass
    
    def _calculate_score(
        self,
        config: ModelConfig,
        context: Dict[str, Any]
    ) -> float:
        """Calculate suitability score for a model"""
        # Implementation of score calculation
        pass
    
    def update_health_check(self, model_id: str, is_healthy: bool):
        """Update health status for a model"""
        self.health_checks[model_id] = is_healthy
        
        if not is_healthy:
            self.last_errors[model_id].append(
                (datetime.utcnow(), "Health check failed")
            )
            # Keep only last 10 errors
            self.last_errors[model_id] = self.last_errors[model_id][-10:]

class RequestManager:
    """Manages request throttling, batching, and parallel execution"""
    
    def __init__(self):
        self.rate_limiters: Dict[str, asyncio.Semaphore] = {}
        self.request_queues: Dict[str, asyncio.Queue] = {}
        self.batch_sizes: Dict[str, int] = {}
        self.batch_timeouts: Dict[str, float] = {}
    
    async def execute_request(
        self,
        model_id: str,
        request: Dict[str, Any],
        config: ModelConfig
    ) -> Dict[str, Any]:
        """
        Execute a request with appropriate throttling and batching
        
        Args:
            model_id: ID of the model to use
            request: Request parameters
            config: Model configuration
            
        Returns:
            Model response
        """
        # Ensure rate limiter exists
        if model_id not in self.rate_limiters:
            self.rate_limiters[model_id] = asyncio.Semaphore(
                config.rate_limits.get('requests_per_minute', 60)
            )
        
        # Apply rate limiting
        async with self.rate_limiters[model_id]:
            # Check if request can be batched
            if self._should_batch(model_id, request):
                return await self._batch_request(model_id, request)
            else:
                return await self._execute_single_request(model_id, request, config)
    
    def _should_batch(self, model_id: str, request: Dict[str, Any]) -> bool:
        """Determine if request should be batched"""
        # Implementation of batching decision logic
        pass
    
    async def _batch_request(
        self,
        model_id: str,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle batched request execution"""
        # Implementation of request batching
        pass
    
    async def _execute_single_request(
        self,
        model_id: str,
        request: Dict[str, Any],
        config: ModelConfig
    ) -> Dict[str, Any]:
        """Execute a single request with retries"""
        # Implementation of single request execution
        pass

class MetricsCollector:
    """Collects and reports usage metrics and analytics"""
    
    def __init__(self):
        # Prometheus metrics
        self.request_counter = Counter(
            'oracle_ai_requests_total',
            'Total number of AI requests',
            ['model_id', 'status']
        )
        self.token_usage = Counter(
            'oracle_ai_tokens_total',
            'Total tokens used',
            ['model_id']
        )
        self.request_latency = Histogram(
            'oracle_ai_request_latency_seconds',
            'Request latency in seconds',
            ['model_id']
        )
        self.cost_counter = Counter(
            'oracle_ai_cost_total',
            'Total cost in USD',
            ['model_id']
        )
        self.cache_hits = Counter(
            'oracle_ai_cache_hits_total',
            'Total cache hits',
            ['model_id']
        )
        self.model_health = Gauge(
            'oracle_ai_model_health',
            'Model health status',
            ['model_id']
        )
    
    def record_request(self, metrics: RequestMetrics, model_id: str):
        """Record metrics for a request"""
        status = 'success' if metrics.success else 'failure'
        self.request_counter.labels(model_id=model_id, status=status).inc()
        
        if metrics.success:
            self.token_usage.labels(model_id=model_id).inc(metrics.tokens_used)
            self.cost_counter.labels(model_id=model_id).inc(metrics.cost)
            self.request_latency.labels(model_id=model_id).observe(
                metrics.latency
            )
    
    def record_cache_hit(self, model_id: str):
        """Record a cache hit"""
        self.cache_hits.labels(model_id=model_id).inc()
    
    def update_model_health(self, model_id: str, is_healthy: bool):
        """Update model health status"""
        self.model_health.labels(model_id=model_id).set(1 if is_healthy else 0)

class ExternalAIService:
    """
    Main service class for managing external AI model interactions
    """
    
    def __init__(
        self,
        model_configs: Dict[str, ModelConfig],
        redis_client: Redis,
        oracle_designer: OracleDesigner
    ):
        self.model_manager = ModelManager(model_configs)
        self.request_manager = RequestManager()
        self.token_optimizer = TokenOptimizer()
        self.response_validator = ResponseValidator()
        self.response_cache = ResponseCache(redis_client)
        self.metrics_collector = MetricsCollector()
        self.oracle_designer = oracle_designer
        
        # Initialize session storage
        self.sessions: Dict[str, Dict[str, Any]] = {}
    
    async def process_design_request(
        self,
        prompt: str,
        session_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process an oracle design request through external AI
        
        Args:
            prompt: User prompt
            session_id: Session identifier
            context: Additional context
            
        Returns:
            Processed response
        """
        context = context or {}
        
        # Update session context
        session = self.sessions.setdefault(session_id, {
            'history': [],
            'last_update': datetime.utcnow()
        })
        
        # Check cache first
        cached_response = await self.response_cache.get_cached_response(
            prompt, context
        )
        if cached_response:
            self.metrics_collector.record_cache_hit(cached_response.get('model_id'))
            return cached_response
        
        # Optimize prompt
        optimized_prompt = self.token_optimizer.optimize_prompt(prompt)
        
        # Select appropriate model
        model_id, config = await self.model_manager.select_model(
            'oracle_design',
            context
        )
        
        # Prepare request
        request = {
            'prompt': optimized_prompt,
            'context': context,
            'session': session
        }
        
        # Execute request with streaming
        async for partial_response in self._stream_response(
            model_id, request, config
        ):
            # Validate partial response
            is_valid, messages = self.response_validator.validate_response(
                partial_response,
                context.get('original_spec')
            )
            
            if not is_valid:
                logger.warning(f"Invalid response: {messages}")
                continue
            
            # Process through oracle designer
            processed_response = self.oracle_designer.process_external_model_response(
                partial_response['raw_response']
            )
            
            # Update session
            session['history'].append({
                'prompt': prompt,
                'response': processed_response,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Cache valid response
            await self.response_cache.cache_response(
                prompt, processed_response, context
            )
            
            return processed_response
        
        raise RuntimeError("Failed to get valid response from any model")
    
    async def _stream_response(
        self,
        model_id: str,
        request: Dict[str, Any],
        config: ModelConfig
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream responses from the model"""
        start_time = datetime.utcnow()
        
        try:
            response = await self.request_manager.execute_request(
                model_id, request, config
            )
            
            # Calculate metrics
            end_time = datetime.utcnow()
            metrics = RequestMetrics(
                start_time=start_time,
                end_time=end_time,
                tokens_used=self.token_optimizer.estimate_tokens(
                    response.get('raw_response', '')
                ),
                cost=config.cost_per_token * response.get('tokens_used', 0),
                success=True,
                latency=(end_time - start_time).total_seconds(),
                error=None
            )
            
            # Record metrics
            self.metrics_collector.record_request(metrics, model_id)
            
            yield response
            
        except Exception as e:
            logger.error(f"Error in model request: {str(e)}")
            metrics = RequestMetrics(
                start_time=start_time,
                end_time=datetime.utcnow(),
                tokens_used=0,
                cost=0,
                success=False,
                latency=0,
                error=str(e)
            )
            self.metrics_collector.record_request(metrics, model_id)
            self.model_manager.update_health_check(model_id, False)
            raise

def create_external_ai_service(
    model_configs: Dict[str, ModelConfig],
    redis_client: Redis,
    oracle_designer: OracleDesigner
) -> ExternalAIService:
    """
    Factory function to create and configure an ExternalAIService instance
    
    Args:
        model_configs: Configuration for available models
        redis_client: Redis client for caching
        oracle_designer: OracleDesigner instance
        
    Returns:
        Configured ExternalAIService instance
    """
    return ExternalAIService(
        model_configs=model_configs,
        redis_client=redis_client,
        oracle_designer=oracle_designer
    ) 