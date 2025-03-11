import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  useMediaQuery,
  Button,
  Grid,
  Chip,
  Tooltip,
  Badge,
  alpha,
  Fade,
  Divider,
  Card,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fab,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  Storage as StorageIcon,
  AccountBalance as AccountBalanceIcon,
  AttachMoney as AttachMoneyIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  Memory as MemoryIcon,
  CloudQueue as CloudQueueIcon,
  FilterAlt as FilterAltIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  Done as DoneIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// Custom components
import { Container } from '../components/layout/Container';
import { Stack } from '../components/layout/Stack';
import { GlassCard, StatsCard, DataCard, GradientButton } from '../components/ui';
import TimeSeriesChart from '../components/widgetboard/TimeSeriesChart';
import NetworkGraph from '../components/widgetboard/NetworkGraph';
import StatusIndicator from '../components/widgetboard/StatusIndicator';
import TransactionQueue from '../components/widgetboard/TransactionQueue';
import AlertConfig from '../components/widgetboard/AlertConfig';
import MetricsPanel from '../components/widgetboard/MetricsPanel';
import ContractMonitor from '../components/widgetboard/ContractMonitor';

// Contexts and Hooks
import { useWeb3React } from '@web3-react/core';
import { useAppTheme } from '../styles/ThemeProvider';
import { useOracleContext } from '../contexts/OracleContext';

// Services
import oracleContractService from '../services/oracleContractService';

// Constants
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

// Panel definitions
const PANEL_TYPES = {
  METRICS: {
    title: 'System Metrics',
    colSpan: { xs: 12, sm: 6, md: 4 },
    component: MetricsPanel,
    icon: <SpeedIcon />,
    description: 'Monitor key system metrics and performance indicators',
  },
  NETWORK: {
    title: 'Network Status',
    colSpan: { xs: 12, md: 8 },
    component: NetworkGraph,
    icon: <CloudQueueIcon />,
    description: 'View real-time network topology and node status',
  },
  TRANSACTIONS: {
    title: 'Transaction Queue',
    colSpan: { xs: 12, sm: 6, md: 4 },
    component: TransactionQueue,
    icon: <AttachMoneyIcon />,
    description: 'Track pending and recent transactions',
  },
  ALERTS: {
    title: 'Alerts & Notifications',
    colSpan: { xs: 12, sm: 6, md: 4 },
    component: AlertConfig,
    icon: <NotificationsIcon />,
    description: 'Manage system alerts and notification settings',
  },
  CONTRACT_MONITOR: {
    title: 'Contract Monitor',
    colSpan: { xs: 12, md: 8 },
    component: ContractMonitor,
    icon: <MemoryIcon />,
    description: 'Monitor smart contract performance and interactions',
  }
};

const DEFAULT_PANELS = [];  // Start with no panels to show empty state

const Widgetboard = () => {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { account, library } = useWeb3React();
  const { formatMetricsForChart } = useOracleContext();

  // State
  const [panels, setPanels] = useState([]);
  const [metrics, setMetrics] = useState({
    nodeCount: 6,
    activeOracles: 24,
    uptime: 99.98,
    networkLatency: 235,
    dataSourceHealth: 95,
    avgBlockTime: 14.2,
    gasPrice: 25,
    totalTransactions: 12453,
    pendingTransactions: 18,
    lastBlockTimestamp: Date.now(),
  });
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnimation, setHasAnimation] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isWidgetPickerOpen, setIsWidgetPickerOpen] = useState(false);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const performanceData = prev.performanceData || [];
        const latencyData = prev.latencyData || [];
        const newNetworkLatency = Math.max(200, prev.networkLatency + (Math.random() > 0.5 ? 5 : -5));
        const now = Date.now();
        
        const updatedPerformanceData = [
          ...performanceData.slice(performanceData.length > 23 ? 1 : 0),
          {
            x: now,
            y: Math.random() * 100
          }
        ];
        
        const updatedLatencyData = [
          ...latencyData.slice(latencyData.length > 23 ? 1 : 0),
          {
            x: now,
            y: newNetworkLatency
          }
        ];
        
        return {
          ...prev,
          nodeCount: prev.nodeCount + (Math.random() > 0.7 ? 1 : 0),
          activeOracles: prev.activeOracles + (Math.random() > 0.8 ? 1 : 0),
          uptime: Math.min(100, prev.uptime + (Math.random() * 0.01)),
          networkLatency: newNetworkLatency,
          dataSourceHealth: Math.min(100, Math.max(0, prev.dataSourceHealth + (Math.random() > 0.6 ? 0.5 : -0.5))),
          avgBlockTime: Math.max(10, prev.avgBlockTime + (Math.random() > 0.5 ? 0.3 : -0.3)),
          gasPrice: Math.max(5, prev.gasPrice + (Math.random() > 0.5 ? 2 : -2)),
          totalTransactions: prev.totalTransactions + Math.floor(Math.random() * 5),
          pendingTransactions: Math.max(0, prev.pendingTransactions + (Math.random() > 0.6 ? 2 : -1)),
          lastBlockTimestamp: now,
          performanceData: updatedPerformanceData,
          latencyData: updatedLatencyData
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        // Simulate loading data
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
        setTimeout(() => setHasAnimation(true), 300);
      }
    };

    loadDashboardData();
  }, []);

  const handleAddWidget = (type) => {
    const newPanelId = `${type.toLowerCase()}_${Date.now()}`;
    setPanels(prev => [...prev, { id: newPanelId, type }]);
    setIsWidgetPickerOpen(false);
  };

  const handleRemoveWidget = (panelId) => {
    setPanels(prev => prev.filter(panel => panel.id !== panelId));
  };

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const renderPanel = (panel) => {
    const PanelType = PANEL_TYPES[panel.type];
    if (!PanelType || !PanelType.component) {
      console.error(`Invalid panel type: ${panel.type}`);
      return null;
    }

    const Component = PanelType.component;
    
    return (
      <Grid item key={panel.id} {...PanelType.colSpan}>
        <Card
          elevation={0}
          sx={{
            height: '100%',
            minHeight: 200,
            position: 'relative',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(103, 116, 255, 0.02)',
            border: '1px solid rgba(103, 116, 255, 0.1)',
            borderRadius: 3,
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(103, 116, 255, 0.03) 0%, rgba(79, 70, 229, 0.01) 100%)',
              opacity: 0.5,
              transition: 'opacity 0.3s ease',
            },
            '&:hover': {
              transform: isEditMode ? 'scale(1.02) translateY(-4px)' : 'translateY(-4px)',
              backgroundColor: 'rgba(103, 116, 255, 0.03)',
              boxShadow: '0 20px 40px rgba(103, 116, 255, 0.15), 0 15px 20px rgba(79, 70, 229, 0.1)',
              '&::before': {
                opacity: 1,
              },
            },
          }}
        >
          {isEditMode && (
            <IconButton
              onClick={() => handleRemoveWidget(panel.id)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 59, 48, 0.2)',
                  transform: 'scale(1.1)',
                },
              }}
            >
              <DeleteIcon />
            </IconButton>
          )}
          <React.Suspense
            fallback={
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            }
          >
            <Component
              data={metrics}
              isLoading={isLoading}
              isFullscreen={false}
            />
          </React.Suspense>
        </Card>
      </Grid>
    );
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        pt: 0,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          pointerEvents: 'none',
        }
      }}
    >
      {/* Edit Mode Toggle */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: { xs: 80, sm: 88 },
          right: { xs: 16, sm: 24, md: 32 },
          zIndex: 1200,
          display: 'flex',
          gap: 2,
          backdropFilter: 'blur(8px)',
          borderRadius: '50%',
          padding: 0.5,
          backgroundColor: 'rgba(13, 17, 31, 0.6)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Tooltip title={isEditMode ? "Done Editing" : "Edit Dashboard"}>
          <IconButton
            onClick={toggleEditMode}
            sx={{
              backgroundColor: 'rgba(103, 116, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(103, 116, 255, 0.2)',
              color: 'white',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(103, 116, 255, 0.2)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(103, 116, 255, 0.3)',
              },
            }}
          >
            {isEditMode ? <DoneIcon /> : <EditIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Add Widget Button (visible in edit mode) */}
      {isEditMode && (
        <Fab
          color="primary"
          aria-label="add widget"
          onClick={() => setIsWidgetPickerOpen(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 96 },
            right: { xs: 24, sm: 48 },
            zIndex: 1000,
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, rgba(103, 116, 255, 1) 0%, rgba(79, 70, 229, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(103, 116, 255, 0.4), 0 4px 16px rgba(79, 70, 229, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px) scale(1.05)',
              boxShadow: '0 12px 40px rgba(103, 116, 255, 0.5), 0 8px 20px rgba(79, 70, 229, 0.5)',
              background: 'linear-gradient(135deg, rgba(103, 116, 255, 1) 0%, rgba(79, 70, 229, 1) 100%)',
              '&::before': {
                opacity: 1,
              },
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
              opacity: 0.5,
              transition: 'opacity 0.3s ease',
            },
            '& .MuiSvgIcon-root': {
              fontSize: 28,
              transition: 'transform 0.3s ease',
            },
            '&:hover .MuiSvgIcon-root': {
              transform: 'rotate(90deg)',
            },
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Widget Grid */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 4,
          pt: 8,
          width: '100%',
          background: 'transparent',
          position: 'relative',
          zIndex: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
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
            },
          },
        }}
      >
        <Grid 
          container 
          spacing={3} 
          sx={{ 
            maxWidth: '1600px', 
            margin: '0 auto',
            pl: 0,
            pr: 0,
          }}
        >
          {panels.length === 0 ? (
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <Card
                elevation={0}
                sx={{
                  maxWidth: 400,
                  width: '100%',
                  textAlign: 'center',
                  py: 6,
                  px: 4,
                  backgroundColor: 'rgba(103, 116, 255, 0.02)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(103, 116, 255, 0.1)',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(103, 116, 255, 0.03) 0%, rgba(79, 70, 229, 0.01) 100%)',
                    opacity: 0.5,
                    borderRadius: 'inherit',
                  }
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <DashboardIcon 
                    sx={{ 
                      fontSize: 48, 
                      mb: 2,
                      color: 'rgba(103, 116, 255, 0.3)',
                    }} 
                  />
                  <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.9)' }}>
                    No Widgets Added
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.6)' }}>
                    Click the edit button in the top right to start customizing your dashboard with widgets
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={toggleEditMode}
                    startIcon={<EditIcon />}
                    sx={{
                      borderColor: 'rgba(103, 116, 255, 0.3)',
                      color: 'rgba(103, 116, 255, 0.8)',
                      '&:hover': {
                        borderColor: 'rgba(103, 116, 255, 0.5)',
                        backgroundColor: 'rgba(103, 116, 255, 0.1)',
                      }
                    }}
                  >
                    Start Editing
                  </Button>
                </Box>
              </Card>
            </Grid>
          ) : (
            panels.map(panel => renderPanel(panel))
          )}
        </Grid>
      </Box>

      {/* Widget Picker Dialog */}
      <Dialog
        open={isWidgetPickerOpen}
        onClose={() => setIsWidgetPickerOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(13, 17, 31, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(103, 116, 255, 0.1)',
            borderRadius: 3,
            color: 'white',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(103, 116, 255, 0.03) 0%, rgba(79, 70, 229, 0.01) 100%)',
              pointerEvents: 'none',
            },
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(103, 116, 255, 0.1)',
          background: 'linear-gradient(135deg, rgba(103, 116, 255, 0.05) 0%, rgba(79, 70, 229, 0.02) 100%)',
          padding: '20px 24px',
        }}>
          Add Widget
        </DialogTitle>
        <DialogContent sx={{ padding: '24px' }}>
          <List>
            {Object.entries(PANEL_TYPES).map(([type, config]) => (
              <ListItem
                key={type}
                button
                onClick={() => handleAddWidget(type)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(103, 116, 255, 0.08)',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  color: 'rgba(103, 116, 255, 0.9)',
                  transition: 'transform 0.3s ease',
                  '.MuiListItem-root:hover &': {
                    transform: 'scale(1.1)',
                    color: 'rgba(103, 116, 255, 1)',
                  }
                }}>{config.icon}</ListItemIcon>
                <ListItemText
                  primary={config.title}
                  secondary={config.description}
                  primaryTypographyProps={{
                    sx: { color: 'white', fontWeight: 500 }
                  }}
                  secondaryTypographyProps={{ 
                    sx: { 
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                    } 
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Ensure proper initialization before export
const WrappedWidgetboard = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure all dependencies are loaded
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <Widgetboard />;
};

export default WrappedWidgetboard; 