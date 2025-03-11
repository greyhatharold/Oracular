import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import { formatDistance } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import oracleContractService from '../../services/oracleContractService';

const TIME_RANGES = {
  '1H': { label: '1 Hour', seconds: 3600 },
  '24H': { label: '24 Hours', seconds: 86400 },
  '7D': { label: '7 Days', seconds: 604800 },
  '30D': { label: '30 Days', seconds: 2592000 }
};

const ContractMonitor = ({ isFullscreen }) => {
  const theme = useTheme();
  const [selectedContract, setSelectedContract] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [timeRange, setTimeRange] = useState('24H');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    requests: [],
    fulfillment: [],
    gasUsage: [],
    latency: []
  });

  // Load contracts
  useEffect(() => {
    const loadContracts = async () => {
      try {
        await oracleContractService.provider.getNetwork();
        const contractList = Object.keys(oracleContractService.contracts);
        setContracts(contractList);
        if (!selectedContract && contractList.length > 0) {
          setSelectedContract(contractList[0]);
        }
      } catch (error) {
        console.error('Failed to load contracts:', error);
      }
    };

    loadContracts();
  }, [selectedContract]);

  // Load contract metrics
  useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedContract) return;

      setLoading(true);
      try {
        const endBlock = await oracleContractService.provider.getBlockNumber();
        const startBlock = endBlock - Math.floor(TIME_RANGES[timeRange].seconds / 15); // Assuming 15s block time

        const historicalData = await oracleContractService.getHistoricalData(
          selectedContract,
          startBlock,
          endBlock
        );

        // Process historical data into metrics
        const processedMetrics = processHistoricalData(historicalData);
        setMetrics(processedMetrics);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedContract, timeRange]);

  const processHistoricalData = (data) => {
    // Group data by hour/day based on time range
    const groupedData = data.reduce((acc, event) => {
      const timestamp = new Date(event.timestamp);
      const hour = timestamp.setMinutes(0, 0, 0);
      
      if (!acc[hour]) {
        acc[hour] = {
          requests: 0,
          fulfilled: 0,
          gasUsed: 0,
          totalLatency: 0,
          count: 0
        };
      }

      acc[hour].requests++;
      if (event.fulfilled) acc[hour].fulfilled++;
      if (event.gasUsed) acc[hour].gasUsed += parseInt(event.gasUsed);
      if (event.latency) {
        acc[hour].totalLatency += event.latency;
        acc[hour].count++;
      }

      return acc;
    }, {});

    // Convert to arrays for charts
    const timestamps = Object.keys(groupedData).sort();
    return {
      requests: timestamps.map(t => ({
        x: new Date(parseInt(t)),
        y: groupedData[t].requests
      })),
      fulfillment: timestamps.map(t => ({
        x: new Date(parseInt(t)),
        y: groupedData[t].fulfilled / groupedData[t].requests * 100
      })),
      gasUsage: timestamps.map(t => ({
        x: new Date(parseInt(t)),
        y: groupedData[t].gasUsed / groupedData[t].requests
      })),
      latency: timestamps.map(t => ({
        x: new Date(parseInt(t)),
        y: groupedData[t].count ? groupedData[t].totalLatency / groupedData[t].count : 0
      }))
    };
  };

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 250
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeRange === '1H' ? 'minute' : 'hour'
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255,255,255,0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  }), [timeRange]);

  const renderChart = (data, label, color) => (
    <Line
      data={{
        datasets: [{
          label,
          data: data,
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          tension: 0.4
        }]
      }}
      options={chartOptions}
    />
  );

  const renderMetricCard = (title, value, unit, icon, color) => (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderRadius: 2
      }}
    >
      {React.cloneElement(icon, { sx: { color, fontSize: 32, mb: 1 } })}
      <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
        {value}
        <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
          {unit}
        </Typography>
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {title}
      </Typography>
    </Paper>
  );

  if (loading) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: theme.spacing(3) }}>
      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Contract</InputLabel>
          <Select
            value={selectedContract || ''}
            onChange={(e) => setSelectedContract(e.target.value)}
            label="Contract"
          >
            {contracts.map((address) => (
              <MenuItem key={address} value={address}>
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            {Object.entries(TIME_RANGES).map(([key, { label }]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[1]
            }}
          >
            <AssessmentIcon sx={{ color: theme.palette.primary.main, fontSize: 32, mb: 2 }} />
            <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 'bold', mb: 1 }}>
              {metrics.requests.reduce((sum, point) => sum + point.y, 0)}
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Total Requests
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[1]
            }}
          >
            <TimelineIcon sx={{ color: theme.palette.success.main, fontSize: 32, mb: 2 }} />
            <Typography variant="h4" sx={{ color: theme.palette.success.main, fontWeight: 'bold', mb: 1 }}>
              {(metrics.fulfillment.reduce((sum, point) => sum + point.y, 0) / 
               metrics.fulfillment.length).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Avg. Fulfillment Rate
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[1]
            }}
          >
            <AccountBalanceIcon sx={{ color: theme.palette.warning.main, fontSize: 32, mb: 2 }} />
            <Typography variant="h4" sx={{ color: theme.palette.warning.main, fontWeight: 'bold', mb: 1 }}>
              {(metrics.gasUsage.reduce((sum, point) => sum + point.y, 0) /
               metrics.gasUsage.length).toFixed(0)}
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Avg. Gas Usage (gwei)
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[1]
            }}
          >
            <SpeedIcon sx={{ color: theme.palette.info.main, fontSize: 32, mb: 2 }} />
            <Typography variant="h4" sx={{ color: theme.palette.info.main, fontWeight: 'bold', mb: 1 }}>
              {(metrics.latency.reduce((sum, point) => sum + point.y, 0) /
               metrics.latency.length).toFixed(1)}
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Avg. Latency (ms)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flex: 1 }}
          >
            <Tab label="Requests" />
            <Tab label="Fulfillment Rate" />
            <Tab label="Gas Usage" />
            <Tab label="Latency" />
          </Tabs>
        </Box>

        <Box 
          sx={{ 
            flex: 1,
            p: 3,
            borderRadius: theme.shape.borderRadius,
            bgcolor: 'background.paper',
            boxShadow: theme.shadows[1]
          }}
        >
          {activeTab === 0 && renderChart(
            metrics.requests,
            'Requests',
            theme.palette.primary.main
          )}
          {activeTab === 1 && renderChart(
            metrics.fulfillment,
            'Fulfillment Rate',
            theme.palette.success.main
          )}
          {activeTab === 2 && renderChart(
            metrics.gasUsage,
            'Gas Usage',
            theme.palette.warning.main
          )}
          {activeTab === 3 && renderChart(
            metrics.latency,
            'Latency',
            theme.palette.info.main
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ContractMonitor; 