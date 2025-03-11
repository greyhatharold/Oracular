import React, { ReactNode, useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  useTheme, 
  useMediaQuery, 
  Badge,
  Avatar,
  Tooltip,
  Button,
  InputBase,
  alpha,
  Theme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Container } from '../components/layout/Container';
import { Stack } from '../components/layout/Stack';
import { useAppTheme } from '../styles/ThemeProvider';
import Sidebar from '../components/navigation/Sidebar';
import { useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 260;

// Types
interface MainLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  onSearch?: (query: string) => void;
  userName?: string;
  notificationCount?: number;
}

// Extracted Components
const SearchBar = React.memo(({ onSearch, isDark }: { onSearch?: (query: string) => void; isDark: boolean }) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);
  }, [onSearch]);

  return (
    <Box 
      sx={{ 
        backgroundColor: isDark 
          ? alpha(theme.palette.common.white, 0.08) 
          : alpha(theme.palette.common.black, 0.05),
        borderRadius: theme.borderRadius.lg,
        p: '0.25rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        width: { xs: 160, sm: 240 },
        transition: theme.transitions.create('width'),
      }}
    >
      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20, mr: 1 }} />
      <InputBase
        value={searchValue}
        onChange={handleSearch}
        placeholder="Search…"
        inputProps={{ 
          'aria-label': 'search',
          role: 'searchbox',
        }}
        sx={{ 
          fontSize: '0.875rem',
          color: 'text.primary',
          width: '100%',
          '& .MuiInputBase-input': {
            p: '0.5rem 0',
          }
        }}
      />
    </Box>
  );
});

const UserButton = React.memo(({ userName = 'User' }: { userName?: string }) => {
  const theme = useTheme();
  const initial = userName.charAt(0).toUpperCase();

  return (
    <Button
      variant="glass"
      startIcon={
        <Avatar 
          sx={{ 
            width: 24, 
            height: 24, 
            bgcolor: theme.palette.primary.main 
          }}
        >
          <Typography variant="caption" fontWeight="bold">{initial}</Typography>
        </Avatar>
      }
      size="small"
      aria-label="user profile"
      sx={{ 
        borderRadius: theme.borderRadius.lg,
        py: 0.75,
        transition: theme.transitions.create(['background-color', 'box-shadow']),
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        }
      }}
    >
      <Typography variant="body2" fontWeight={500}>
        {userName}
      </Typography>
    </Button>
  );
});

// Styles
const getMainContentStyles = (theme: Theme, isSidebarOpen: boolean, isMobile: boolean) => ({
  flexGrow: 1,
  width: { 
    xs: '100%',
    sm: `calc(100% - ${isSidebarOpen && !isMobile ? 260 : 0}px)` 
  },
  ml: { 
    xs: 0,
    sm: isSidebarOpen && !isMobile ? '260px' : 0 
  },
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: 'transparent'
});

const getAppBarStyles = (theme: Theme, isSidebarOpen: boolean, isDark: boolean) => ({
  width: { sm: `calc(100% - ${isSidebarOpen ? 260 : 0}px)` },
  ml: { sm: isSidebarOpen ? '260px' : 0 },
  bgcolor: isDark ? alpha(theme.palette.background.paper, 0.8) : alpha('#fff', 0.8),
  backdropFilter: 'blur(8px)',
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
});

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  pageTitle,
  onSearch,
  userName = 'User',
  notificationCount = 0
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const isWidgetboard = location.pathname === '/';

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Memoized styles
  const mainContentStyles = useMemo(() => ({
    flexGrow: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    width: {
      xs: '100%',
      sm: `calc(100% - ${DRAWER_WIDTH}px)`
    },
    marginLeft: {
      xs: 0,
      sm: `${DRAWER_WIDTH}px`
    },
    transition: 'all 0.3s ease-in-out',
    background: 'transparent',
  }), []);

  const appBarStyles = useMemo(() => ({
    background: 'transparent',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
    ml: { sm: `${DRAWER_WIDTH}px` },
    boxShadow: 'none',
    '& .MuiToolbar-root': {
      backdropFilter: 'blur(20px)',
      background: 'rgba(13, 17, 31, 0.7)',
    }
  }), []);

  const contentStyles = useMemo(() => ({ 
    flexGrow: 1, 
    height: 'calc(100vh - 64px)',
    overflow: 'auto',
    position: 'relative',
    zIndex: 1,
    background: 'transparent',
    px: { xs: 2, sm: 3, md: 6 },
    py: { xs: 2, sm: 3 },
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'rgba(103, 116, 255, 0.05)',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(103, 116, 255, 0.1)',
      borderRadius: '4px',
      '&:hover': {
        background: 'rgba(103, 116, 255, 0.2)',
      }
    },
  }), []);

  const backgroundStyles = useMemo(() => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(165deg, rgba(13, 17, 31, 0.99) 0%, rgba(50, 55, 89, 0.99) 100%)',
    zIndex: 0,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at 50% 50%, rgba(103, 116, 255, 0.05) 0%, rgba(30, 39, 97, 0.02) 100%)',
      pointerEvents: 'none',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '10%',
      left: '5%',
      width: '90%',
      height: '80%',
      background: 'radial-gradient(circle at 50% 50%, rgba(103, 116, 255, 0.1) 0%, transparent 70%)',
      filter: 'blur(60px)',
      opacity: 0.4,
      pointerEvents: 'none',
    }
  }), []);

  return (
    <Box 
      sx={{ 
        display: 'flex',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}
    >
      <Box sx={backgroundStyles} />
      <Sidebar 
        open={isSidebarOpen && !isMobile} 
        onClose={toggleSidebar} 
        pageTitle={pageTitle} 
      />

      <Box 
        component="main" 
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          marginLeft: { xs: '1px', sm: `${DRAWER_WIDTH + 1}px` },
          width: { xs: 'calc(100% - 1px)', sm: `calc(100% - ${DRAWER_WIDTH + 1}px)` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {!isWidgetboard && (
          <AppBar 
            position="fixed" 
            elevation={0} 
            sx={{
              width: { xs: 'calc(100% - 1px)', sm: `calc(100% - ${DRAWER_WIDTH + 1}px)` },
              marginLeft: { xs: '1px', sm: `${DRAWER_WIDTH + 1}px` },
              background: 'transparent',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              transition: theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              '& .MuiToolbar-root': {
                backdropFilter: 'blur(20px)',
                background: 'rgba(13, 17, 31, 0.8)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Toolbar 
              sx={{ 
                justifyContent: 'space-between',
                minHeight: '64px !important',
                px: { xs: 2, sm: 3 },
                background: 'transparent',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  color="inherit"
                  aria-label={isSidebarOpen ? 'close sidebar' : 'open sidebar'}
                  edge="start"
                  onClick={toggleSidebar}
                  sx={{ 
                    mr: 2, 
                    display: { sm: 'none' },
                    '&:hover': {
                      background: 'rgba(103, 116, 255, 0.1)'
                    }
                  }}
                >
                  <MenuIcon />
                </IconButton>

                <SearchBar onSearch={onSearch} isDark={isDark} />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Help">
                  <IconButton 
                    color="inherit" 
                    size="small" 
                    aria-label="help"
                    sx={{
                      '&:hover': {
                        background: 'rgba(103, 116, 255, 0.1)'
                      }
                    }}
                  >
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Notifications">
                  <IconButton 
                    color="inherit" 
                    size="small" 
                    aria-label="notifications"
                    sx={{
                      '&:hover': {
                        background: 'rgba(103, 116, 255, 0.1)'
                      }
                    }}
                  >
                    <Badge 
                      badgeContent={notificationCount} 
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          background: 'linear-gradient(45deg, #FF5F6D, #FFC371)'
                        }
                      }}
                    >
                      <NotificationsIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Box sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                  <UserButton userName={userName} />
                </Box>
              </Box>
            </Toolbar>
          </AppBar>
        )}

        <Box 
          sx={{
            flexGrow: 1,
            pt: isWidgetboard ? 0 : '64px',
            height: isWidgetboard ? '100vh' : 'calc(100vh - 64px)',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(103, 116, 255, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(103, 116, 255, 0.1)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(103, 116, 255, 0.2)',
              }
            },
          }}
        >
          <Container 
            maxWidth={false}
            disableGutters
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, sm: 3 },
              px: { xs: 2, sm: 3 },
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(MainLayout); 