import { ReactNode, CSSProperties } from 'react';

// Common Props
export interface BaseProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

// Theme Types
export type ThemeMode = 'light' | 'dark';

export type ColorVariant = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Component-specific Types
export interface ButtonProps extends BaseProps {
  variant?: 'contained' | 'outlined' | 'text';
  color?: ColorVariant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
}

export interface InputProps extends BaseProps {
  type?: 'text' | 'password' | 'email' | 'number';
  value?: string | number;
  placeholder?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (value: string) => void;
}

export interface SelectProps extends BaseProps {
  value?: string | number;
  options: Array<{
    value: string | number;
    label: string;
  }>;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (value: string | number) => void;
}

// Blockchain-specific Types
export interface AddressDisplayProps extends BaseProps {
  address: string;
  ensName?: string;
  showCopy?: boolean;
  showExplorer?: boolean;
  truncate?: boolean;
}

export interface TokenInputProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  maxValue?: string;
  symbol?: string;
  decimals?: number;
  showMaxButton?: boolean;
  showFiatValue?: boolean;
}

export interface TransactionStatusProps extends BaseProps {
  status: 'pending' | 'confirmed' | 'failed';
  hash: string;
  timestamp?: number;
  confirmations?: number;
  requiredConfirmations?: number;
}

export interface GasEstimateProps extends BaseProps {
  estimate: {
    low: string;
    medium: string;
    high: string;
  };
  selected?: 'low' | 'medium' | 'high';
  onSelect?: (speed: 'low' | 'medium' | 'high') => void;
}

// Data Visualization Types
export interface TimeSeriesChartProps extends BaseProps {
  data: Array<{
    timestamp: number;
    value: number;
  }>;
  height?: number;
  showLegend?: boolean;
  yAxisLabel?: string;
  timeUnit?: 'minute' | 'hour' | 'day' | 'week';
  areaFill?: boolean;
}

export interface NetworkGraphProps extends BaseProps {
  nodes: Array<{
    id: string;
    type: 'oracle' | 'consumer' | 'validator';
    status?: 'active' | 'inactive';
    data?: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type?: string;
    data?: Record<string, any>;
  }>;
  height?: number;
  width?: number;
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
}

export interface StatusIndicatorProps extends BaseProps {
  status: 'healthy' | 'warning' | 'error' | 'pending';
  label?: string;
  showLabel?: boolean;
  size?: Size;
  pulse?: boolean;
}

// Form Types
export interface FormProps extends BaseProps {
  onSubmit: (data: any) => void;
  defaultValues?: Record<string, any>;
  validationSchema?: any;
}

export interface FormFieldProps extends BaseProps {
  name: string;
  label?: string;
  type?: string;
  rules?: Record<string, any>;
  defaultValue?: any;
}

// Layout Types
export interface GridProps extends BaseProps {
  container?: boolean;
  item?: boolean;
  spacing?: number;
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
}

export interface StackProps extends BaseProps {
  direction?: 'row' | 'column';
  spacing?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  wrap?: boolean;
}

// Animation Types
export interface FadeProps extends BaseProps {
  in?: boolean;
  timeout?: number;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
}

export interface SlideProps extends FadeProps {
  direction?: 'up' | 'down' | 'left' | 'right';
}

// Compound Component Types
export interface DataTableProps extends BaseProps {
  columns: Array<{
    id: string;
    label: string;
    render?: (value: any, row: any) => ReactNode;
    sortable?: boolean;
    width?: string | number;
  }>;
  data: Array<Record<string, any>>;
  loading?: boolean;
  pagination?: boolean;
  rowsPerPage?: number;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: Record<string, any>) => void;
}

export interface ModalProps extends BaseProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
}

export interface NotificationProps extends BaseProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  autoHideDuration?: number;
  onClose?: () => void;
}

// Hook Types
export interface UseFormReturn {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  handleChange: (name: string) => (value: any) => void;
  handleBlur: (name: string) => () => void;
  handleSubmit: (e: React.FormEvent) => void;
  reset: () => void;
  setFieldValue: (name: string, value: any) => void;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export interface UseNotificationReturn {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
} 