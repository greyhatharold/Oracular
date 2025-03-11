import React, { ReactNode } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  useTheme, 
  alpha, 
  SxProps, 
  Theme,
  Tooltip,
  IconButton,
  Skeleton,
  Zoom
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAppTheme } from '../../../styles/ThemeProvider';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  iconBgColor?: string;
  trend?: number;
  trendLabel?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  isPercentage?: boolean;
  info?: string;
  sx?: SxProps<Theme>;
  variant?: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  loading?: boolean;
}

/**
 * A component for displaying statistics with optional trend indicators.
 */
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  iconBgColor,
  trend,
  trendLabel,
  trendDirection,
  isPercentage = false,
  info,
  sx,
  variant = 'default',
  loading = false,
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();

  // Determine colors based on variant and trend
  const getVariantColor = () => {
    if (variant === 'default') return undefined;
    return theme.palette[variant].main;
  };

  const getTrendColor = () => {
    if (trendDirection === 'up') return theme.palette.success.main;
    if (trendDirection === 'down') return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  const getBgColor = () => {
    if (variant === 'default') {
      return isDark 
        ? alpha(theme.palette.background.paper, 0.5)
        : alpha('#fff', 0.7);
    }
    return alpha(theme.palette[variant].main, isDark ? 0.12 : 0.08);
  };

  const getBorderColor = () => {
    if (variant === 'default') {
      return isDark 
        ? alpha(theme.palette.divider, 0.5)
        : alpha(theme.palette.divider, 0.3);
    }
    return alpha(theme.palette[variant].main, isDark ? 0.3 : 0.2);
  };

  const getIconBgColor = () => {
    if (iconBgColor) return iconBgColor;
    if (variant === 'default') return alpha(theme.palette.primary.main, 0.15);
    return alpha(theme.palette[variant].main, 0.2);
  };

  const getIconColor = () => {
    if (variant === 'default') return theme.palette.primary.main;
    return theme.palette[variant].main;
  };

  const renderTrendIcon = () => {
    if (trendDirection === 'up') {
      return <ArrowUpwardIcon fontSize="small" sx={{ color: theme.palette.success.main }} />;
    }
    if (trendDirection === 'down') {
      return <ArrowDownwardIcon fontSize="small" sx={{ color: theme.palette.error.main }} />;
    }
    return null;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: theme.shape.borderRadius * 2,
        border: `1px solid ${getBorderColor()}`,
        backgroundColor: getBgColor(),
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, isDark ? 0.2 : 0.1)}`,
          borderColor: variant !== 'default' 
            ? alpha(theme.palette[variant].main, isDark ? 0.5 : 0.3) 
            : alpha(theme.palette.primary.main, isDark ? 0.3 : 0.2),
        },
        ...sx,
      }}
    >
      {/* Decorative background gradient */}
      {variant !== 'default' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '30%',
            height: '100%',
            background: `radial-gradient(circle at top right, ${alpha(theme.palette[variant].main, 0.12)}, transparent 70%)`,
            opacity: 0.8,
            zIndex: 0,
          }}
        />
      )}

      {/* Card content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header with icon and title */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {icon && (
              <Zoom in={!loading} style={{ transitionDelay: loading ? '200ms' : '0ms' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    backgroundColor: getIconBgColor(),
                    color: getIconColor(),
                    mr: 2,
                    transition: 'all 0.2s ease-in-out',
                    '& svg': {
                      fontSize: 28,
                    },
                  }}
                >
                  {icon}
                </Box>
              </Zoom>
            )}
            <Box>
              {loading ? (
                <Skeleton variant="text" width={120} height={24} />
              ) : (
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: getVariantColor() || theme.palette.text.primary,
                  }}
                >
                  {title}
                </Typography>
              )}
              {info && (
                <Tooltip title={info} arrow placement="top">
                  <IconButton
                    size="small"
                    sx={{
                      ml: 0.5,
                      p: 0.25,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>

        {/* Value display */}
        {loading ? (
          <Skeleton variant="rectangular" width="70%" height={40} sx={{ borderRadius: 1, mb: 1 }} />
        ) : (
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              mb: 1,
              color: getVariantColor() || theme.palette.text.primary,
              transition: 'color 0.2s ease-in-out',
              fontSize: { xs: '1.8rem', sm: '2rem' },
              letterSpacing: '-0.025em',
            }}
          >
            {isPercentage ? `${Number(value).toFixed(2)}%` : value.toLocaleString()}
          </Typography>
        )}

        {/* Trend indicator */}
        {trend !== undefined && (
          loading ? (
            <Skeleton variant="text" width={80} height={24} />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mt: 1,
                py: 0.5,
                px: 1,
                borderRadius: '8px',
                backgroundColor: alpha(getTrendColor(), 0.1),
                width: 'fit-content',
              }}
            >
              {renderTrendIcon()}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  ml: 0.5,
                  color: getTrendColor(),
                }}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
              {trendLabel && (
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    color: theme.palette.text.secondary,
                  }}
                >
                  {trendLabel}
                </Typography>
              )}
            </Box>
          )
        )}
      </Box>
    </Paper>
  );
};

export default StatsCard; 