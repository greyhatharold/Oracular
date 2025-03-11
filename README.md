# Oracular: AI-Powered Blockchain Oracle Generator

Oracular is an intelligent system that helps design and generate secure and reliable blockchain oracles through a conversational interface. It implements a sophisticated architecture that guides users through the process of specifying, validating, and generating oracle implementations.

## Features

- **AI-Powered Design**: Conversational interface that helps users design and specify oracle requirements
- **Intelligent Specification Builder**: Guides users through defining data sources, validation rules, and update behaviors
- **Automated Validation**: Comprehensive validation of oracle specifications with confidence scoring
- **Multi-Format Output**: Generate specifications in various formats (JSON, YAML, Smart Contracts, Visual Diagrams)
- **Interactive Refinement**: Clarification system that helps resolve ambiguities and improve specifications
- **Modular Architecture**: Clear separation between specification building, validation, and output generation
- **Comprehensive Documentation**: Auto-generated documentation for oracle implementations
- **Security-First Design**: Built-in security best practices and validation rules

## Architecture

The system is built with the following key components:

- **OracleDesigner**: Main orchestrator that manages the oracle specification process
- **SpecificationBuilder**: Builds formal oracle specifications from natural language input
- **ClarificationGenerator**: Generates targeted questions to resolve specification ambiguities
- **ExplanationGenerator**: Provides clear explanations for technical decisions
- **SpecificationConverter**: Transforms specifications into various output formats
- **ValidationService**: Validates specifications against predefined rules
- **ExternalAIService**: Integrates with external AI models for enhanced capabilities

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

The system is configured through various configuration files in the `src/backend/config/` directory. Key configuration areas include:

- AI model configurations
- Validation rules and constraints
- Output format settings
- External service integrations

## Usage

### Basic Usage

```python
from backend.ai.oracle_designer import create_oracle_designer

# Initialize the oracle designer
designer = create_oracle_designer()

# Process user input and get oracle specification
response = await designer.process_input(
    "I need an oracle that provides real-time cryptocurrency price data"
)

# Access the generated specification
specification = response['specification']
formal_spec = response['formal_specification']
```

### Implementing Custom Components

```python
from backend.ai.oracle_designer import DataSourceSpec

class CustomDataSourceSpec(DataSourceSpec):
    def validate(self) -> bool:
        # Implement your validation logic
        return True
    
    def get_confidence_score(self) -> float:
        return 0.95  # Implement your confidence scoring logic
```

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