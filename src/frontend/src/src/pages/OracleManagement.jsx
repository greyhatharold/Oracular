import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
  IconButton,
  Chip,
  Tooltip,
  LinearProgress,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Divider,
  TextField,
  MenuItem,
  InputAdornment,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { OracleContext } from '../contexts/OracleContext';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import { motion } from 'framer-motion';

const OrganizeDialog = ({
  open,
  onClose,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  filterStatus,
  setFilterStatus,
  filterConfidence,
  setFilterConfidence,
}) => {
  const theme = useTheme();
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TuneIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" fontWeight="bold">
            Organize Oracles
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            placeholder="Search oracles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: alpha(theme.palette.common.white, 0.05),
              }
            }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
                startAdornment={
                  <InputAdornment position="start">
                    <SortIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="confidence">Confidence</MenuItem>
                <MenuItem value="lastUpdate">Last Update</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Confidence Level</InputLabel>
            <Select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value)}
              label="Confidence Level"
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="high">High (≥80%)</MenuItem>
              <MenuItem value="medium">Medium (60-79%)</MenuItem>
              <MenuItem value="low">Low (&lt;60%)</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: '12px' }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const OracleManagement = () => {
  const theme = useTheme();
  const { oracles, fetchOracles, setActiveOracle } = useContext(OracleContext);
  const [loading, setLoading] = useState(true);
  const [selectedOracle, setSelectedOracle] = useState(null);
  const [organizeDialogOpen, setOrganizeDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterConfidence, setFilterConfidence] = useState('all');

  useEffect(() => {
    const init = async () => {
      try {
        await fetchOracles();
      } catch (error) {
        console.error('Failed to load oracles:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchOracles]);

  const getStatusColor = (status, confidence) => {
    if (status === 'active' && confidence >= 0.8) return theme.palette.success.main;
    if (status === 'active' && confidence >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getStatusIcon = (status, confidence) => {
    if (status === 'active' && confidence >= 0.8) return <CheckCircleIcon fontSize="small" />;
    if (status === 'active' && confidence >= 0.6) return <WarningIcon fontSize="small" />;
    return <ErrorIcon fontSize="small" />;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleOpenOrganizeDialog = () => setOrganizeDialogOpen(true);
  const handleCloseOrganizeDialog = () => setOrganizeDialogOpen(false);

  const filteredAndSortedOracles = useMemo(() => {
    return oracles
      .filter(oracle => {
        const matchesSearch = oracle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            oracle.address.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || oracle.status === filterStatus;
        const matchesConfidence = filterConfidence === 'all' ||
          (filterConfidence === 'high' && oracle.reputation >= 0.8) ||
          (filterConfidence === 'medium' && oracle.reputation >= 0.6 && oracle.reputation < 0.8) ||
          (filterConfidence === 'low' && oracle.reputation < 0.6);
        
        return matchesSearch && matchesStatus && matchesConfidence;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'status':
            return a.status.localeCompare(b.status);
          case 'confidence':
            return b.reputation - a.reputation;
          case 'lastUpdate':
            return new Date(b.lastUpdate) - new Date(a.lastUpdate);
          default:
            return 0;
        }
      });
  }, [oracles, searchQuery, sortBy, filterStatus, filterConfidence]);

  const statsOverview = [
    { 
      label: 'Total Oracles', 
      value: filteredAndSortedOracles.length, 
      icon: StorageIcon 
    },
    { 
      label: 'Active Oracles', 
      value: filteredAndSortedOracles.filter(o => o.status === 'active').length, 
      icon: CheckCircleIcon 
    },
    { 
      label: 'Average Confidence', 
      value: `${Math.round((filteredAndSortedOracles.reduce((acc, o) => acc + (o.reputation || 0), 0) / 
        (filteredAndSortedOracles.length || 1)) * 100)}%`, 
      icon: TimelineIcon 
    },
  ];

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100%',
          p: 3,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Loading Oracles...
        </Typography>
        <Box sx={{ width: '200px' }}>
          <LinearProgress 
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box 
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 1,
            }}
          >
            Oracle Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage your oracle network
          </Typography>
        </Box>
        <Tooltip title="Organize Oracles">
          <IconButton
            onClick={handleOpenOrganizeDialog}
            sx={{
              background: alpha(theme.palette.primary.main, 0.1),
              borderRadius: '12px',
              p: 1.5,
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.2),
              }
            }}
          >
            <TuneIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statsOverview.map((stat, index) => (
          <Grid item xs={12} md={4} key={index} component={motion.div} variants={itemVariants}>
            <Card
              sx={{
                background: alpha(theme.palette.background.paper, 0.5),
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                  }}
                >
                  <stat.icon sx={{ color: theme.palette.primary.main }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Oracles Grid */}
      <Grid container spacing={2}>
        {filteredAndSortedOracles.map((oracle) => (
          <Grid 
            item 
            xs={12} 
            md={6} 
            lg={4} 
            key={oracle.address}
            component={motion.div}
            variants={itemVariants}
          >
            <Card
              sx={{
                background: alpha(theme.palette.background.paper, 0.5),
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {oracle.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        color: 'text.secondary',
                        fontFamily: 'monospace',
                        mb: 1,
                      }}
                    >
                      {oracle.address.slice(0, 6)}...{oracle.address.slice(-4)}
                    </Typography>
                  </Box>
                  <Tooltip title="Oracle Settings">
                    <IconButton 
                      size="small"
                      sx={{ 
                        background: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.2),
                        }
                      }}
                    >
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Performance
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={oracle.reputation * 100}
                        sx={{
                          flexGrow: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          }
                        }}
                      />
                      <Typography variant="caption" fontWeight="medium">
                        {Math.round(oracle.reputation * 100)}%
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={getStatusIcon(oracle.status, oracle.reputation)}
                      label={oracle.status.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: alpha(getStatusColor(oracle.status, oracle.reputation), 0.1),
                        color: getStatusColor(oracle.status, oracle.reputation),
                        fontWeight: 'medium',
                      }}
                    />
                    <Chip
                      label={`${oracle.dataSources} Sources`}
                      size="small"
                      sx={{
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        color: theme.palette.info.main,
                        fontWeight: 'medium',
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Last Update
                    </Typography>
                    <Typography variant="body2">
                      {new Date(oracle.lastUpdate).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <OrganizeDialog
        open={organizeDialogOpen}
        onClose={handleCloseOrganizeDialog}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterConfidence={filterConfidence}
        setFilterConfidence={setFilterConfidence}
      />
    </Box>
  );
};

export default OracleManagement; 