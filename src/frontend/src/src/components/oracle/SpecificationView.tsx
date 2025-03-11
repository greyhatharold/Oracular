import React from 'react';
import { Message, OracleSpecification } from './types';

interface SpecificationViewProps {
  specification: OracleSpecification | null;
  messages: Message[];
}

const SpecificationView: React.FC<SpecificationViewProps> = ({
  specification,
  messages,
}) => {
  if (!specification) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-white/70">
        <p className="text-center">
          Start the conversation to begin designing your oracle specification.
        </p>
      </div>
    );
  }

  const renderConfidenceIndicator = (confidence: string) => {
    const getColor = () => {
      switch (confidence.toLowerCase()) {
        case 'high':
          return 'bg-green-500';
        case 'medium':
          return 'bg-yellow-500';
        case 'low':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getColor()}`} />
        <span className="text-xs capitalize">{confidence}</span>
      </div>
    );
  };

  const renderSection = (title: string, content: React.ReactNode) => (
    <div className="bg-indigo-800/30 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {content}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{specification.name}</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/70">v{specification.version}</span>
            <span className="px-2 py-1 text-xs rounded-full bg-teal-700/50 text-white/90">
              {specification.status}
            </span>
          </div>
        </div>
        <p className="text-white/70">{specification.description}</p>
      </div>

      {/* Confidence Score */}
      <div className="bg-gradient-to-r from-indigo-700/30 to-teal-700/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Overall Confidence</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${specification.confidence_score * 100}%` }}
              />
            </div>
            <span className="text-sm text-white/90">
              {Math.round(specification.confidence_score * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Data Sources */}
        {renderSection(
          'Data Sources',
          <div className="space-y-2">
            {specification.data_sources.map((source, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded bg-white/5"
              >
                <div>
                  <p className="text-white/90">{source.name}</p>
                  <p className="text-sm text-white/50">{source.type}</p>
                </div>
                {renderConfidenceIndicator(source.confidence)}
              </div>
            ))}
          </div>
        )}

        {/* Validation Methods */}
        {renderSection(
          'Validation',
          <div className="space-y-2">
            {specification.validation.map((validation, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded bg-white/5"
              >
                <p className="text-white/90">{validation.method}</p>
                {renderConfidenceIndicator(validation.confidence)}
              </div>
            ))}
          </div>
        )}

        {/* Aggregation */}
        {renderSection(
          'Aggregation',
          <div className="flex items-center justify-between p-2 rounded bg-white/5">
            <p className="text-white/90">{specification.aggregation.method}</p>
            {renderConfidenceIndicator(specification.aggregation.confidence)}
          </div>
        )}

        {/* Update Behavior */}
        {renderSection(
          'Update Behavior',
          <div className="flex items-center justify-between p-2 rounded bg-white/5">
            <div>
              <p className="text-white/90">{specification.update_behavior.frequency}</p>
              {specification.update_behavior.value > 0 && (
                <p className="text-sm text-white/50">
                  Every {specification.update_behavior.value} units
                </p>
              )}
            </div>
            {renderConfidenceIndicator(specification.update_behavior.confidence)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecificationView; 