import React, { ReactNode, useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  useTheme, 
  alpha, 
  Divider, 
  IconButton, 
  SxProps,
  Theme,
  Menu,
  MenuItem,
  Tooltip,
  Skeleton,
  Zoom,
  Fade,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import { useAppTheme } from '../../../styles/ThemeProvider';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import GetAppIcon from '@mui/icons-material/GetApp';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface DataCardProps {
  title: string;
  subtitle?: string;
  chart: ReactNode;
  menuOptions?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  }[];
  topRightContent?: ReactNode;
  onRefresh?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  isLoading?: boolean;
  error?: string;
  footerContent?: ReactNode;
  minHeight?: number | string;
  sx?: SxProps<Theme>;
}

/**
 * A card component for displaying data visualizations with common controls.
 */
const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  chart,
  menuOptions,
  topRightContent,
  onRefresh,
  onDownload,
  onFullscreen,
  isLoading = false,
  error,
  footerContent,
  minHeight = 300,
  sx,
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: theme.shape.borderRadius * 2,
        overflow: 'hidden',
        border: `1px solid ${isDark ? alpha(theme.palette.divider, 0.7) : theme.palette.divider}`,
        backgroundColor: isDark 
          ? alpha(theme.palette.background.paper, 0.6) 
          : theme.palette.background.paper,
        backdropFilter: 'blur(10px)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-3px)',
          borderColor: alpha(theme.palette.primary.main, isDark ? 0.3 : 0.2),
        },
        ...sx,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: `1px solid ${isDark ? alpha(theme.palette.divider, 0.6) : theme.palette.divider}`,
        }}
      >
        <Box>
          <Typography 
            variant="h6" 
            fontWeight={600}
            sx={{ fontSize: '1.1rem' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {topRightContent}
          
          {onRefresh && (
            <Tooltip title="Refresh data">
              <IconButton 
                size="small" 
                onClick={onRefresh}
                disabled={isLoading}
                sx={{ 
                  ml: 1,
                  backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                  '&:hover': {
                    backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.1),
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                <RefreshIcon fontSize="small" color="primary" sx={{ 
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} />
              </IconButton>
            </Tooltip>
          )}
          
          {onDownload && (
            <Tooltip title="Download data">
              <IconButton 
                size="small" 
                onClick={onDownload}
                sx={{ 
                  ml: 1,
                  backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                  '&:hover': {
                    backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.1),
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                <GetAppIcon fontSize="small" color="primary" />
              </IconButton>
            </Tooltip>
          )}
          
          {onFullscreen && (
            <Tooltip title="Fullscreen view">
              <IconButton 
                size="small" 
                onClick={onFullscreen}
                sx={{ 
                  ml: 1,
                  backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                  '&:hover': {
                    backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.1),
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                <FullscreenIcon fontSize="small" color="primary" />
              </IconButton>
            </Tooltip>
          )}
          
          {menuOptions && menuOptions.length > 0 && (
            <>
              <Tooltip title="More options">
                <IconButton 
                  size="small" 
                  onClick={handleMenuClick}
                  sx={{ 
                    ml: 1,
                    backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                    '&:hover': {
                      backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.1),
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <MoreVertIcon fontSize="small" color="primary" />
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                PaperProps={{
                  elevation: 4,
                  sx: {
                    mt: 1.5,
                    minWidth: 180,
                    borderRadius: 2,
                    overflow: 'visible',
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&::before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: isDark ? theme.palette.background.paper : 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      borderTop: `1px solid ${theme.palette.divider}`,
                      borderLeft: `1px solid ${theme.palette.divider}`,
                      zIndex: 0,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {menuOptions.map((option, index) => (
                  <MenuItem 
                    key={index} 
                    onClick={() => {
                      option.onClick();
                      handleMenuClose();
                    }}
                    sx={{ 
                      py: 1.2,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      }
                    }}
                  >
                    {option.icon && (
                      <ListItemIcon sx={{ color: theme.palette.primary.main }}>
                        {option.icon}
                      </ListItemIcon>
                    )}
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      </Box>
      
      {/* Chart content */}
      <Box sx={{ 
        flexGrow: 1, 
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center', 
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <Box sx={{ padding: 4, width: '100%' }}>
            <Skeleton variant="rectangular" width="100%" height={minHeight} sx={{ borderRadius: 1 }} />
          </Box>
        ) : error ? (
          <Box 
            sx={{ 
              p: 3, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2, opacity: 0.7 }} />
            <Typography color="error" variant="subtitle1" fontWeight={500}>
              {error}
            </Typography>
            {onRefresh && (
              <Button 
                variant="outlined" 
                color="primary" 
                size="small" 
                startIcon={<RefreshIcon />}
                onClick={onRefresh}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            )}
          </Box>
        ) : (
          <Fade in={!isLoading} timeout={300}>
            <Box sx={{ width: '100%', height: '100%' }}>
              {chart}
            </Box>
          </Fade>
        )}
      </Box>
      
      {/* Footer content if provided */}
      {footerContent && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            {footerContent}
          </Box>
        </>
      )}
    </Paper>
  );
};

export default DataCard; 