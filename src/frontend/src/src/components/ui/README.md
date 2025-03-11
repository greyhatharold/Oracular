# Oracular UI Component Library

A comprehensive, design-system-driven component library for building consistent and accessible user interfaces in the Oracular application.

## Features

- 🎨 Design System: Consistent colors, typography, spacing, and animations
- 🌗 Dark Mode Support: Built-in light and dark theme support
- ♿ Accessibility: WCAG 2.1 compliant components
- 🔧 Type Safety: Written in TypeScript with comprehensive type definitions
- 🧩 Modular: Atomic design pattern for composable interfaces
- ⛓️ Blockchain-Ready: Specialized components for Web3 interactions

## Component Categories

### Atomic Components

Basic building blocks of the interface:

- `Button`: Multi-variant buttons with loading states
- `Input`: Text input with validation
- `Select`: Dropdown selection component
- `Typography`: Text components with consistent styling
- `Card`: Container component with elevation
- `Chip`: Compact elements for displaying status
- `Badge`: Notification and status indicators
- `Tooltip`: Contextual information display

### Form Components

Form handling and validation:

- `Form`: Form container with validation context
- `FormField`: Input field with label and error handling
- `FormGroup`: Group related form fields
- `FormValidation`: Form-level validation rules

### Blockchain Components

Web3-specific components:

- `AddressDisplay`: Ethereum address display with ENS support
- `TokenInput`: Token amount input with denomination selection
- `TransactionStatus`: Transaction state tracking
- `GasEstimate`: Gas price estimation display
- `BlockExplorerLink`: Links to block explorer

### Data Visualization

Components for displaying data:

- `TimeSeriesChart`: Time-series data visualization
- `NetworkGraph`: Force-directed graph visualization
- `StatusIndicator`: Status and health indicators
- `ProgressBar`: Progress tracking
- `Sparkline`: Inline trend visualization

### Compound Components

Complex UI patterns:

- `DataTable`: Sortable and paginated data tables
- `Modal`: Dialog and modal windows
- `Dropdown`: Enhanced dropdown menus
- `Notification`: Toast notifications
- `Stepper`: Multi-step process indicator

### Animation Components

Motion and transition components:

- `Fade`: Opacity transitions
- `Slide`: Directional transitions
- `Grow`: Scale transitions
- `LoadingSpinner`: Loading indicators
- `Skeleton`: Content loading placeholders

## Usage

### Installation

The component library is included in the Oracular application. No additional installation is required.

### Basic Example

```tsx
import { Button, Form, FormField } from '@/components/ui';

const MyComponent = () => {
  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormField
        name="username"
        label="Username"
        rules={{ required: true }}
      />
      <Button type="submit">
        Submit
      </Button>
    </Form>
  );
};
```

### Theme Usage

```tsx
import { useTheme } from '@/components/ui';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <div style={{ color: theme.palette.primary.main }}>
      Themed content
    </div>
  );
};
```

### Blockchain Component Example

```tsx
import { AddressDisplay, TokenInput } from '@/components/ui';

const MyComponent = () => {
  return (
    <div>
      <AddressDisplay
        address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        ensName="vitalik.eth"
        showCopy
        showExplorer
      />
      <TokenInput
        value="0.5"
        onChange={(value) => console.log('Amount:', value)}
        symbol="ETH"
        showFiatValue
      />
    </div>
  );
};
```

## Design System

### Colors

The color system is based on semantic variables:

- Primary: Main brand colors
- Secondary: Supporting colors
- Success/Warning/Error: Status colors
- Grayscale: Neutral colors
- Blockchain-specific: Colors for transaction states

### Typography

Consistent text styling with:

- Font families: Primary (Inter) and Monospace (Roboto Mono)
- Font sizes: From xs (12px) to 5xl (48px)
- Font weights: From light (300) to bold (700)
- Line heights: Optimized for readability

### Spacing

Consistent spacing scale:

- xxs: 2px
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px
- xxxl: 64px

### Breakpoints

Responsive design breakpoints:

- xs: 0px
- sm: 600px
- md: 960px
- lg: 1280px
- xl: 1920px

## Contributing

When adding new components:

1. Follow the existing file structure
2. Include comprehensive TypeScript types
3. Add proper documentation
4. Ensure theme compatibility
5. Include accessibility features
6. Add proper error handling
7. Follow the established naming conventions

## Best Practices

1. Use semantic HTML elements
2. Include ARIA labels where necessary
3. Ensure keyboard navigation support
4. Test in both light and dark modes
5. Consider mobile responsiveness
6. Handle loading and error states
7. Use proper TypeScript types
8. Follow React best practices 