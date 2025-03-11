# Oracular: Secure and Reliable Blockchain Oracle Service

Oracular is a robust and secure oracle service that facilitates the reliable flow of off-chain data to on-chain smart contracts. It implements a modular architecture with comprehensive security measures, data validation, and monitoring capabilities.

## Features

- **Modular Architecture**: Clear separation of concerns between data acquisition, validation, aggregation, and on-chain submission
- **Data Validation**: Comprehensive validation rules for different data types (numeric, categorical, binary)
- **Reputation-Weighted Aggregation**: Smart aggregation of data from multiple sources with outlier detection
- **Cryptographic Security**: Strong cryptographic signing ensuring data integrity and provenance
- **Circuit Breaker Pattern**: Protection against data corruption and service degradation
- **Comprehensive Monitoring**: Prometheus metrics and health checks for operational visibility
- **Configurable Scheduling**: Flexible update intervals with automatic retry mechanisms

## Architecture

The service is built with the following key components:

- **DataSource**: Abstract base class for implementing different data sources
- **DataValidator**: Validates incoming data against predefined rules
- **DataAggregator**: Combines data from multiple sources with outlier detection
- **CircuitBreaker**: Implements safety patterns for service reliability
- **PerformanceMonitor**: Tracks service metrics and health indicators
- **OracleService**: Main orchestrator managing the entire data pipeline

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/oracular.git
cd oracular
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

The service is configured through `src/backend/config/oracle_config.py`. Key configuration areas include:

- Validation rules for different data types
- Oracle service parameters (update intervals, thresholds)
- Monitoring settings
- Logging configuration

## Usage

### Basic Usage

```python
from backend.services.oracle_service import OracleService
from backend.config.oracle_config import VALIDATION_RULES

# Initialize the oracle service
oracle = OracleService(
    data_sources=[your_data_sources],
    validator=DataValidator(VALIDATION_RULES),
    update_interval=60
)

# Start the service
await oracle.start()
```

### Implementing a Custom Data Source

```python
from backend.services.oracle_service import DataSource

class CustomDataSource(DataSource):
    async def fetch_data(self) -> Dict[str, Any]:
        # Implement your data fetching logic
        return {
            'type': 'numeric',
            'value': 42.0,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_reputation_score(self) -> float:
        return 0.95  # Implement your reputation scoring logic
```

## Monitoring

The service exposes Prometheus metrics on port 9090 (configurable) including:

- Update durations
- Source error counts
- Active source counts
- Data confidence scores
- Submission error counts

## Security Considerations

- All data is cryptographically signed before submission
- Circuit breaker patterns prevent propagation of corrupted data
- Reputation scoring helps identify and discount unreliable sources
- Comprehensive validation prevents invalid data from entering the pipeline

## Development

### Running Tests

```bash
pytest tests/
```

### Code Style

The project uses:
- Black for code formatting
- isort for import sorting
- mypy for type checking
- flake8 for linting

Run all checks:
```bash
black .
isort .
mypy .
flake8
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details 