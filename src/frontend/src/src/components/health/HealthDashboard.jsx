import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  CardContent
} from '@mui/material';
import {
  Timeline,
  CheckCircle,
  Warning,
  Error,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { Card } from '../ui/atomic/Card';
import { Badge } from '../ui/atomic/Badge';
import { Progress } from '../ui/atomic/Progress';

const HealthMetricCard = ({ title, value, status, trend, icon: Icon }) => {
  const theme = useTheme();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          color: 'success',
          icon: <CheckCircle />,
          label: 'Healthy'
        };
      case 'degraded':
        return {
          color: 'warning',
          icon: <Warning />,
          label: 'Degraded'
        };
      case 'unhealthy':
        return {
          color: 'error',
          icon: <Error />,
          label: 'Unhealthy'
        };
      default:
        return {
          color: 'default',
          icon: null,
          label: 'Unknown'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Card
      cardStyle="elevated"
      hoverEffect={true}
      title={title}
      headerAction={
        <Badge
          label={statusConfig.label}
          color={statusConfig.color}
          icon={statusConfig.icon}
          variant="soft"
          size="small"
        />
      }
      tags={trend ? [
        {
          label: `${Math.abs(trend)}% ${trend > 0 ? '↑' : '↓'}`,
          color: trend > 0 ? 'success' : 'error'
        }
      ] : undefined}
    >
      <CardContent>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" component="div" sx={{ mb: 2 }}>
            {value}
          </Typography>
          {typeof value === 'number' && (
            <Progress
              variant="linear"
              value={value}
              color={statusConfig.color}
              size="medium"
              showValue
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const HealthDashboard = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const getSystemStatus = () => {
    if (!healthData) return 'unknown';
    const { system_metrics, active_alerts } = healthData;
    
    if (system_metrics.memory > 80 || system_metrics.cpu > 80 || active_alerts > 5) {
      return 'degraded';
    }
    return 'healthy';
  };

  const getBlockchainStatus = () => {
    if (!healthData?.blockchain_metrics) return 'unknown';
    return healthData.blockchain_metrics.network_status === 'connected' ? 'healthy' : 'unhealthy';
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider
        }
      },
      x: {
        grid: {
          color: theme.palette.divider
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: theme.palette.text.primary
        }
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Health Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* System Health */}
        <Grid item xs={12} md={6}>
          <HealthMetricCard
            title="System Status"
            value={`${healthData.system_metrics.cpu}% CPU, ${healthData.system_metrics.memory}% Memory`}
            status={getSystemStatus()}
            icon={CheckCircle}
          />
        </Grid>

        {/* Blockchain Health */}
        <Grid item xs={12} md={6}>
          <HealthMetricCard
            title="Blockchain Status"
            value={`${healthData.blockchain_metrics.pending_transactions} Pending Tx`}
            status={getBlockchainStatus()}
            icon={Timeline}
          />
        </Grid>

        {/* Active Alerts */}
        <Grid item xs={12} md={6}>
          <HealthMetricCard
            title="Active Alerts"
            value={healthData.active_alerts}
            status={healthData.active_alerts > 5 ? 'degraded' : 'healthy'}
            icon={Warning}
          />
        </Grid>

        {/* Scheduler Health */}
        <Grid item xs={12} md={6}>
          <HealthMetricCard
            title="Task Scheduler"
            value={`${healthData.scheduler_metrics.running_tasks}/${healthData.scheduler_metrics.total_tasks} Tasks`}
            status={healthData.scheduler_metrics.node_count > 0 ? 'healthy' : 'degraded'}
            icon={Timeline}
          />
        </Grid>

        {/* Component Health Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Component Health
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(healthData.component_health).map(([component, status]) => (
                  <Grid item xs={12} sm={6} md={4} key={component}>
                    <Box display="flex" alignItems="center" p={1}>
                      {status ? (
                        <CheckCircle color="success" sx={{ mr: 1 }} />
                      ) : (
                        <Error color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography>
                        {component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line
                  data={{
                    labels: Object.keys(healthData.performance_metrics),
                    datasets: [{
                      label: 'Performance',
                      data: Object.values(healthData.performance_metrics).map(m => m.value),
                      borderColor: theme.palette.primary.main,
                      tension: 0.4
                    }]
                  }}
                  options={chartOptions}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HealthDashboard; 