import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  Divider,
  Typography,
  Avatar,
  Tooltip,
  Button,
  alpha,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DataObjectIcon from '@mui/icons-material/DataObject';
import StorageIcon from '@mui/icons-material/Storage';
import RuleIcon from '@mui/icons-material/Rule';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAppTheme } from '../../styles/ThemeProvider';
import LogoutIcon from '@mui/icons-material/Logout';
import DesignServicesIcon from '@mui/icons-material/DesignServices';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  pageTitle?: string;
}

const DRAWER_WIDTH = 260;

export const NAV_ITEMS = [
  { path: '/', label: 'Widgetboard', icon: DashboardIcon },
  { path: '/oracle', label: 'Oracle Designer', icon: DesignServicesIcon },
  { path: '/oracles', label: 'Oracle Management', icon: DataObjectIcon },
  { path: '/data-sources', label: 'Data Sources', icon: StorageIcon },
  { path: '/validation', label: 'Validation', icon: RuleIcon },
  { path: '/monitoring', label: 'Monitoring', icon: MonitorHeartIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
  { path: '/profile', label: 'Profile', icon: PersonIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, pageTitle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, colorMode, setColorMode } = useAppTheme();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < theme.breakpoints.values.md) {
      onClose();
    }
  };

  const toggleColorMode = () => {
    setColorMode(isDark ? 'light' : 'dark');
  };

  const drawerContent = (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            pl: 2.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography 
              variant="h6" 
              fontWeight="bold"
              sx={{
                position: 'relative',
                background: (theme) => `linear-gradient(135deg, 
                  ${theme.palette.primary.main},
                  ${alpha(theme.palette.secondary.main, 0.9)},
                  ${theme.palette.primary.main}
                )`,
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.5rem',
                letterSpacing: '0.02em',
                filter: (theme) => `
                  drop-shadow(0 0 2px ${alpha(theme.palette.primary.main, 0.4)})
                  drop-shadow(0 0 6px ${alpha(theme.palette.primary.main, 0.2)})
                `,
                textShadow: (theme) => `
                  0 0 15px ${alpha(theme.palette.primary.main, 0.15)},
                  0 0 30px ${alpha(theme.palette.primary.main, 0.1)},
                  0 0 45px ${alpha(theme.palette.secondary.main, 0.05)}
                `,
                animation: 'gradientFlow 8s ease infinite, glowPulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.02)',
                  filter: (theme) => `
                    drop-shadow(0 0 3px ${alpha(theme.palette.primary.main, 0.5)})
                    drop-shadow(0 0 8px ${alpha(theme.palette.primary.main, 0.3)})
                  `,
                  textShadow: (theme) => `
                    0 0 20px ${alpha(theme.palette.primary.main, 0.2)},
                    0 0 40px ${alpha(theme.palette.primary.main, 0.15)},
                    0 0 60px ${alpha(theme.palette.secondary.main, 0.1)}
                  `,
                  '&::before': {
                    opacity: 1,
                    animation: 'sheen 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                },
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: -100,
                  width: '35%',
                  height: '100%',
                  background: (theme) => `linear-gradient(
                    90deg,
                    transparent,
                    ${alpha(theme.palette.primary.light, 0.4)},
                    transparent
                  )`,
                  opacity: 0.4,
                  transform: 'skewX(-25deg)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: '-2px',
                  borderRadius: '4px',
                  background: (theme) => `linear-gradient(
                    45deg,
                    transparent,
                    ${alpha(theme.palette.primary.main, 0.08)},
                    transparent
                  )`,
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'exclude',
                  pointerEvents: 'none',
                  animation: 'borderGlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate',
                },
                '@keyframes gradientFlow': {
                  '0%, 100%': {
                    backgroundPosition: '0% 50%',
                  },
                  '50%': {
                    backgroundPosition: '100% 50%',
                  }
                },
                '@keyframes sheen': {
                  '0%': {
                    transform: 'skewX(-25deg) translateX(-100%)',
                    opacity: 0.4,
                  },
                  '100%': {
                    transform: 'skewX(-25deg) translateX(300%)',
                    opacity: 0.6,
                  },
                },
                '@keyframes borderGlow': {
                  '0%': {
                    opacity: 0.2,
                  },
                  '100%': {
                    opacity: 0.5,
                  }
                },
                '@keyframes glowPulse': {
                  '0%': {
                    filter: (theme) => `
                      drop-shadow(0 0 2px ${alpha(theme.palette.primary.main, 0.4)})
                      drop-shadow(0 0 6px ${alpha(theme.palette.primary.main, 0.2)})
                    `,
                  },
                  '100%': {
                    filter: (theme) => `
                      drop-shadow(0 0 3px ${alpha(theme.palette.primary.main, 0.5)})
                      drop-shadow(0 0 8px ${alpha(theme.palette.primary.main, 0.3)})
                    `,
                  }
                }
              }}
            >
              Oracular
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ display: { sm: 'none' } }}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Page Title */}
        {pageTitle && (
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight={600}
              sx={{
                color: theme.palette.text.primary,
                opacity: 0.9,
                letterSpacing: '-0.02em',
                fontSize: '1.15rem',
              }}
            >
              {pageTitle}
            </Typography>
          </Box>
        )}

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', mt: 1 }}>
          <List sx={{ px: 1.5 }}>
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={location.pathname === path}
                  onClick={() => handleNavigation(path)}
                  sx={{
                    borderRadius: theme.borderRadius.lg,
                    py: 1,
                    px: 1.5,
                    '&.Mui-selected': {
                      bgcolor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'inherit',
                      },
                    },
                    '&:hover:not(.Mui-selected)': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      minWidth: 36,
                      color: location.pathname === path 
                        ? 'inherit' 
                        : theme.palette.text.primary,
                    }}
                  >
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === path ? 600 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider sx={{ mt: 'auto' }} />

        {/* Footer */}
        <Box sx={{ p: 2 }}>
          <Box 
            sx={{ 
              p: 2, 
              mb: 2,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: theme.palette.primary.main,
                boxShadow: theme.shadows[2],
              }}
            >
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                User
              </Typography>
              <Typography variant="caption" color="text.secondary">
                wallet: 0x1a2...3b4c
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              <Button 
                fullWidth
                onClick={toggleColorMode}
                variant="outlined"
                size="small"
                startIcon={isDark ? <LightModeIcon /> : <DarkModeIcon />}
              >
                {isDark ? 'Light' : 'Dark'}
              </Button>
            </Tooltip>
            <Tooltip title="Logout">
              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={() => navigate('/login')}
              >
                Logout
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: DRAWER_WIDTH },
        flexShrink: { sm: 0 },
      }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            background: 'transparent',
            borderRight: 'none',
            boxShadow: 'none',
            backdropFilter: 'blur(20px)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(180deg, rgba(13, 17, 31, 0.95) 0%, rgba(50, 55, 89, 0.95) 100%)',
              pointerEvents: 'none',
              zIndex: -1,
            },
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar; 