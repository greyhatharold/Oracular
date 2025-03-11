export interface Message {
  id: string;
  type: 'user' | 'system' | 'specification' | 'clarification' | 'explanation';
  content: string | Record<string, any>;
  timestamp: string;
}

export interface OracleSpecification {
  name: string;
  description: string;
  data_type: string;
  data_sources: Array<{
    name: string;
    type: string;
    confidence: string;
  }>;
  validation: Array<{
    method: string;
    confidence: string;
  }>;
  aggregation: {
    method: string;
    confidence: string;
  };
  update_behavior: {
    frequency: string;
    value: number;
    confidence: string;
  };
  confidence_score: number;
  version: number;
  status: string;
}

export interface ConversationState {
  messages: Message[];
  currentSpecification: OracleSpecification | null;
  isLoading: boolean;
  error: string | null;
}

export interface OracleDesignerProps {
  initialSpecification?: OracleSpecification;
  onSpecificationUpdate?: (spec: OracleSpecification) => void;
  className?: string;
} 