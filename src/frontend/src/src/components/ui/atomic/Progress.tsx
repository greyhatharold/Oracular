import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';

type ProgressVariant = 'linear' | 'circular' | 'circular-with-label';
type ProgressSize = 'small' | 'medium' | 'large';

interface ProgressProps {
  variant?: ProgressVariant;
  size?: ProgressSize;
  value?: number;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  thickness?: number;
  label?: string;
  showValue?: boolean;
  animate?: boolean;
  className?: string;
}

const ProgressContainer = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const StyledLinearProgress = styled(LinearProgress)<{ $size: ProgressSize }>(
  ({ theme, $size }) => ({
    width: '100%',
    borderRadius: theme.shape.borderRadius,
    height: {
      small: 4,
      medium: 8,
      large: 12,
    }[$size],
  })
);

const CircularContainer = styled(Box)<{ $size: ProgressSize }>(
  ({ theme, $size }) => ({
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  })
);

const CircularLabel = styled(Typography)<{ $size: ProgressSize }>(
  ({ theme, $size }) => ({
    position: 'absolute',
    fontSize: {
      small: '0.75rem',
      medium: '1rem',
      large: '1.25rem',
    }[$size],
    fontWeight: 500,
  })
);

const getCircularSize = (size: ProgressSize): number => {
  const sizes = {
    small: 24,
    medium: 40,
    large: 56,
  };
  return sizes[size];
};

export const Progress: React.FC<ProgressProps> = ({
  variant = 'linear',
  size = 'medium',
  value,
  color = 'primary',
  thickness = 4,
  label,
  showValue = false,
  animate = true,
  className,
}) => {
  const theme = useTheme();
  const isIndeterminate = value === undefined || animate;
  const displayValue = Math.round(value || 0);

  const renderProgress = () => {
    switch (variant) {
      case 'circular':
        return (
          <CircularProgress
            variant={isIndeterminate ? 'indeterminate' : 'determinate'}
            value={displayValue}
            size={getCircularSize(size)}
            thickness={thickness}
            color={color}
          />
        );

      case 'circular-with-label':
        return (
          <CircularContainer $size={size}>
            <CircularProgress
              variant={isIndeterminate ? 'indeterminate' : 'determinate'}
              value={displayValue}
              size={getCircularSize(size)}
              thickness={thickness}
              color={color}
            />
            {!isIndeterminate && (
              <CircularLabel $size={size}>
                {displayValue}%
              </CircularLabel>
            )}
          </CircularContainer>
        );

      default:
        return (
          <StyledLinearProgress
            $size={size}
            variant={isIndeterminate ? 'indeterminate' : 'determinate'}
            value={displayValue}
            color={color}
          />
        );
    }
  };

  return (
    <ProgressContainer className={className}>
      {renderProgress()}
      {(label || (showValue && !isIndeterminate)) && (
        <Typography
          variant={size === 'small' ? 'caption' : 'body2'}
          color="textSecondary"
        >
          {label}
          {showValue && !isIndeterminate && ` (${displayValue}%)`}
        </Typography>
      )}
    </ProgressContainer>
  );
};

export default Progress; 