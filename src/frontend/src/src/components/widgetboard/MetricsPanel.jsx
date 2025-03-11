import React, { useMemo } from 'react';
import { Box, Grid, Typography, CircularProgress, useTheme } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MetricsPanel = ({ data, isFullscreen }) => {
  const theme = useTheme();

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 250
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255,255,255,0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  }), []);

  const formatMetricValue = (value, type) => {
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'memory':
        return `${(value / (1024 * 1024)).toFixed(2)} MB`;
      case 'duration':
        return `${value.toFixed(2)}s`;
      default:
        return value.toFixed(2);
    }
  };

  const MetricCard = ({ title, value, type, trend, color }) => (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        background: theme.palette.background.paper,
        boxShadow: theme.shadows[1],
        height: '100%'
      }}
    >
      <Typography variant="subtitle2" color="textSecondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ my: 1, color }}>
        {formatMetricValue(value, type)}
      </Typography>
      {trend && (
        <Typography
          variant="body2"
          color={trend > 0 ? 'success.main' : 'error.main'}
        >
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </Typography>
      )}
    </Box>
  );

  const systemMetrics = useMemo(() => {
    if (!data?.system) return null;

    return {
      labels: data.system.timestamps,
      datasets: [
        {
          label: 'CPU Usage',
          data: data.system.cpu,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true
        },
        {
          label: 'Memory Usage',
          data: data.system.memory,
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          fill: true
        }
      ]
    };
  }, [data?.system]);

  if (!data) {
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
    <Box sx={{ height: '100%', p: theme.spacing(3) }}>
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 3,
              borderRadius: theme.shape.borderRadius,
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[1],
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              System Health
            </Typography>
            <Typography variant="h4" sx={{ color: theme => 
              data.health?.score > 0.8 ? theme.palette.success.main :
              data.health?.score > 0.6 ? theme.palette.warning.main :
              theme.palette.error.main
            }}>
              {formatMetricValue(data.health?.score || 0, 'percentage')}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 3,
              borderRadius: theme.shape.borderRadius,
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[1],
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Active Oracles
            </Typography>
            <Typography variant="h4" color="primary">
              {data.oracles?.active || 0}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 3,
              borderRadius: theme.shape.borderRadius,
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[1],
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Average Response Time
            </Typography>
            <Typography variant="h4" color="secondary">
              {formatMetricValue(data.performance?.responseTime || 0, 'duration')}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 3,
              borderRadius: theme.shape.borderRadius,
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[1],
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Success Rate
            </Typography>
            <Typography variant="h4" color="success.main">
              {formatMetricValue(data.performance?.successRate || 0, 'percentage')}
            </Typography>
          </Box>
        </Grid>

        {/* System Resource Charts */}
        <Grid item xs={12}>
          <Box
            sx={{
              height: isFullscreen ? 400 : 300,
              p: 3,
              borderRadius: theme.shape.borderRadius,
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[1]
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              System Resources
            </Typography>
            {systemMetrics && (
              <Line data={systemMetrics} options={chartOptions} />
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MetricsPanel;