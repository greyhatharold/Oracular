import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

type BadgeSize = 'small' | 'medium' | 'large';
type BadgeVariant = 'filled' | 'outlined' | 'soft';

interface BadgeProps {
  label: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: BadgeSize;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const BadgeRoot = styled(Box)<{
  $color: string;
  $size: BadgeSize;
  $variant: BadgeVariant;
  $pulse?: boolean;
}>(({ theme, $color, $size, $variant, $pulse }) => {
  const getColor = () => {
    const colorMap = {
      primary: theme.palette.primary,
      secondary: theme.palette.secondary,
      error: theme.palette.error,
      warning: theme.palette.warning,
      info: theme.palette.info,
      success: theme.palette.success,
    };
    return colorMap[$color as keyof typeof colorMap] || colorMap.primary;
  };

  const color = getColor();
  const sizes = {
    small: {
      padding: '2px 8px',
      fontSize: '0.75rem',
      iconSize: 14,
    },
    medium: {
      padding: '4px 12px',
      fontSize: '0.875rem',
      iconSize: 18,
    },
    large: {
      padding: '6px 16px',
      fontSize: '1rem',
      iconSize: 22,
    },
  };

  const variants = {
    filled: {
      background: color.main,
      color: color.contrastText,
      border: 'none',
    },
    outlined: {
      background: 'transparent',
      color: color.main,
      border: `1px solid ${color.main}`,
    },
    soft: {
      background: color.light || theme.palette.mode === 'dark' 
        ? theme.palette.mode === 'dark' 
          ? color.dark 
          : color.light 
        : `${color.main}15`,
      color: color.main,
      border: 'none',
    },
  };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: theme.transitions.create(['background-color', 'box-shadow', 'border-color']),
    ...sizes[$size],
    ...variants[$variant],
    ...$pulse && {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 'inherit',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        border: `2px solid ${color.main}`,
      },
      '@keyframes pulse': {
        '0%': {
          transform: 'scale(1)',
          opacity: 0.8,
        },
        '50%': {
          transform: 'scale(1.15)',
          opacity: 0,
        },
        '100%': {
          transform: 'scale(1)',
          opacity: 0,
        },
      },
      position: 'relative',
    },
  };
});

const IconWrapper = styled(Box)<{ $size: BadgeSize }>(({ theme, $size }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& > svg': {
    fontSize: {
      small: 14,
      medium: 18,
      large: 22,
    }[$size],
  },
}));

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = 'primary',
  size = 'medium',
  variant = 'filled',
  icon,
  pulse = false,
  className,
}) => {
  return (
    <BadgeRoot
      $color={color}
      $size={size}
      $variant={variant}
      $pulse={pulse}
      className={className}
    >
      {icon && <IconWrapper $size={size}>{icon}</IconWrapper>}
      <Typography
        variant="inherit"
        component="span"
        sx={{ lineHeight: 1.2 }}
      >
        {label}
      </Typography>
    </BadgeRoot>
  );
};

export default Badge; 