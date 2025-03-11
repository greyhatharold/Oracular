import React, { ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  useTheme,
  alpha,
  SxProps,
  Theme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAppTheme } from '../../../styles/ThemeProvider';

interface GlassCardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  headerAction?: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  sx?: SxProps<Theme>;
  noPadding?: boolean;
  fullHeight?: boolean;
  maxHeight?: number | string;
  elevation?: number;
}

/**
 * A glass-effect card component for displaying content with a frosted glass appearance.
 */
const GlassCard: React.FC<GlassCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  headerAction,
  variant = 'default',
  sx,
  noPadding = false,
  fullHeight = false,
  maxHeight,
  elevation = 0,
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();

  const getBackgroundColor = () => {
    if (variant === 'default') {
      return isDark
        ? alpha(theme.palette.background.paper, 0.6)
        : alpha(theme.palette.background.paper, 0.8);
    }
    
    return alpha(theme.palette[variant].main, isDark ? 0.1 : 0.05);
  };

  const getBorderColor = () => {
    if (variant === 'default') {
      return isDark
        ? alpha(theme.palette.divider, 0.6)
        : theme.palette.divider;
    }
    
    return alpha(theme.palette[variant].main, isDark ? 0.3 : 0.2);
  };

  const getHeaderColor = () => {
    if (variant === 'default') {
      return theme.palette.text.primary;
    }
    
    return theme.palette[variant].main;
  };

  const getIconColor = () => {
    if (variant === 'default') {
      return theme.palette.primary.main;
    }
    
    return theme.palette[variant].main;
  };

  const getIconBgColor = () => {
    if (variant === 'default') {
      return alpha(theme.palette.primary.main, 0.1);
    }
    
    return alpha(theme.palette[variant].main, 0.1);
  };

  return (
    <Paper
      elevation={elevation}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: fullHeight ? '100%' : 'auto',
        maxHeight,
        borderRadius: theme.shape.borderRadius * 2,
        border: `1px solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor(),
        backdropFilter: 'blur(10px)',
        backgroundImage: variant !== 'default' 
          ? `radial-gradient(circle at top right, ${alpha(theme.palette[variant].main, 0.08)}, transparent 70%)`
          : undefined,
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: theme.shadows[4],
          borderColor: variant !== 'default'
            ? alpha(theme.palette[variant].main, isDark ? 0.4 : 0.3)
            : alpha(theme.palette.primary.main, 0.2),
          transform: 'translateY(-3px)',
        },
        ...sx,
      }}
    >
      {/* Header */}
      {title && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {icon && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  backgroundColor: getIconBgColor(),
                  color: getIconColor(),
                  mr: 2,
                  '& svg': {
                    fontSize: 20,
                  },
                }}
              >
                {icon}
              </Box>
            )}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: getHeaderColor(),
                  fontSize: '1.1rem',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          <Box>
            {headerAction}
          </Box>
        </Box>
      )}

      {title && <Divider sx={{ opacity: 0.6 }} />}

      {/* Content */}
      <Box
        sx={{
          p: noPadding ? 0 : 3,
          flexGrow: 1,
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default GlassCard; 