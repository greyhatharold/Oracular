import React from 'react';
import { 
  Button, 
  ButtonProps, 
  styled, 
  alpha, 
  useTheme 
} from '@mui/material';
import { useAppTheme } from '../../../styles/ThemeProvider';

interface GradientButtonProps extends Omit<ButtonProps, 'variant'> {
  gradient?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'blue-purple' | 'orange-pink' | 'green-blue';
  glowing?: boolean;
  rounded?: boolean;
  flat?: boolean;
}

/**
 * A button component with gradient background effects.
 */
const GradientButton: React.FC<GradientButtonProps> = ({
  gradient = 'primary',
  glowing = false,
  rounded = false,
  flat = false,
  disabled = false,
  children,
  ...props
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();

  const getGradient = () => {
    switch (gradient) {
      case 'primary':
        return `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`;
      case 'secondary':
        return `linear-gradient(45deg, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main})`;
      case 'success':
        return `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`;
      case 'error':
        return `linear-gradient(45deg, ${theme.palette.error.dark}, ${theme.palette.error.main})`;
      case 'info':
        return `linear-gradient(45deg, ${theme.palette.info.dark}, ${theme.palette.info.main})`;
      case 'warning':
        return `linear-gradient(45deg, ${theme.palette.warning.dark}, ${theme.palette.warning.main})`;
      case 'blue-purple':
        return 'linear-gradient(45deg, #3a86ff, #8338ec)';
      case 'orange-pink':
        return 'linear-gradient(45deg, #fb923c, #f472b6)';
      case 'green-blue':
        return 'linear-gradient(45deg, #4ade80, #38bdf8)';
      default:
        return `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`;
    }
  };

  const getHoverGradient = () => {
    switch (gradient) {
      case 'primary':
        return `linear-gradient(45deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.light, 0.9)})`;
      case 'secondary':
        return `linear-gradient(45deg, ${theme.palette.secondary.main}, ${alpha(theme.palette.secondary.light, 0.9)})`;
      case 'success':
        return `linear-gradient(45deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.light, 0.9)})`;
      case 'error':
        return `linear-gradient(45deg, ${theme.palette.error.main}, ${alpha(theme.palette.error.light, 0.9)})`;
      case 'info':
        return `linear-gradient(45deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.light, 0.9)})`;
      case 'warning':
        return `linear-gradient(45deg, ${theme.palette.warning.main}, ${alpha(theme.palette.warning.light, 0.9)})`;
      case 'blue-purple':
        return 'linear-gradient(45deg, #63a4ff, #aa66ff)';
      case 'orange-pink':
        return 'linear-gradient(45deg, #fca667, #f78fb3)';
      case 'green-blue':
        return 'linear-gradient(45deg, #86efac, #7dd3fc)';
      default:
        return `linear-gradient(45deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.light, 0.9)})`;
    }
  };

  const getGlowColor = () => {
    switch (gradient) {
      case 'primary':
        return alpha(theme.palette.primary.main, 0.5);
      case 'secondary':
        return alpha(theme.palette.secondary.main, 0.5);
      case 'success':
        return alpha(theme.palette.success.main, 0.5);
      case 'error':
        return alpha(theme.palette.error.main, 0.5);
      case 'info':
        return alpha(theme.palette.info.main, 0.5);
      case 'warning':
        return alpha(theme.palette.warning.main, 0.5);
      case 'blue-purple':
        return alpha('#8338ec', 0.5);
      case 'orange-pink':
        return alpha('#f472b6', 0.5);
      case 'green-blue':
        return alpha('#38bdf8', 0.5);
      default:
        return alpha(theme.palette.primary.main, 0.5);
    }
  };

  const StyledButton = styled(Button)(({ theme }) => ({
    background: disabled ? (isDark ? alpha('#555', 0.2) : alpha('#999', 0.1)) : getGradient(),
    color: disabled ? theme.palette.text.disabled : theme.palette.common.white,
    padding: theme.spacing(flat ? 1 : 1.5, flat ? 2 : 3),
    boxShadow: flat ? 'none' : glowing 
      ? `0 4px 20px ${getGlowColor()}`
      : theme.shadows[3],
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: rounded ? '50px' : theme.shape.borderRadius,
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      background: disabled ? (isDark ? alpha('#555', 0.2) : alpha('#999', 0.1)) : getHoverGradient(),
      boxShadow: flat ? 'none' : glowing 
        ? `0 6px 25px ${getGlowColor()}`
        : theme.shadows[4],
      transform: flat ? 'none' : 'translateY(-2px)',
    },
    '&:after': glowing ? {
      content: '""',
      position: 'absolute',
      top: '-10px',
      left: '-10px',
      right: '-10px',
      bottom: '-10px',
      background: `inherit`,
      filter: 'blur(15px)',
      opacity: 0.4,
      zIndex: -1,
    } : {},
    '&:disabled': {
      color: theme.palette.text.disabled,
      boxShadow: 'none',
    },
  }));

  return (
    <StyledButton 
      disabled={disabled}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default GradientButton; 