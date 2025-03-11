import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Stack,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  CloudQueue as NetworkIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { Card } from '../ui/atomic/Card';
import { Badge } from '../ui/atomic/Badge';
import { Progress } from '../ui/atomic/Progress';

const STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  ERROR: 'error',
  PENDING: 'pending'
};

const StatusIcon = ({ status, size = 'small' }) => {
  const theme = useTheme();
  
  const iconProps = {
    fontSize: size,
    sx: { mr: 1 }
  };

  switch (status) {
    case STATUS.HEALTHY:
      return <CheckCircleIcon {...iconProps} sx={{ ...iconProps.sx, color: theme.palette.success.main }} />;
    case STATUS.WARNING:
      return <WarningIcon {...iconProps} sx={{ ...iconProps.sx, color: theme.palette.warning.main }} />;
    case STATUS.ERROR:
      return <ErrorIcon {...iconProps} sx={{ ...iconProps.sx, color: theme.palette.error.main }} />;
    case STATUS.PENDING:
      return <PendingIcon {...iconProps} sx={{ ...iconProps.sx, color: theme.palette.info.main }} />;
    default:
      return null;
  }
};

const ComponentStatus = ({ name, status, value, icon: Icon, details }) => {
  const getStatusConfig = () => {
    switch (status) {
      case STATUS.HEALTHY:
        return { color: 'success', label: 'Healthy' };
      case STATUS.WARNING:
        return { color: 'warning', label: 'Warning' };
      case STATUS.ERROR:
        return { color: 'error', label: 'Error' };
      case STATUS.PENDING:
        return { color: 'info', label: 'Pending' };
      default:
        return { color: 'default', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderRadius: theme => theme.shape.borderRadius,
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
        <Icon sx={{ color: 'text.secondary' }} />
        <Typography variant="body2">{name}</Typography>
      </Box>
      <Tooltip title={details || ''} arrow>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {value && (
            <Progress
              variant="linear"
              value={parseFloat(value)}
              color={statusConfig.color}
              size="small"
              showValue
              sx={{ width: 120 }}
            />
          )}
          <Badge
            label={statusConfig.label}
            color={statusConfig.color}
            variant="soft"
            size="small"
          />
        </Box>
      </Tooltip>
    </Box>
  );
};

const StatusIndicator = ({
  data = {},
  loading = false,
  error = null,
  showProgress = true
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card
        loading={true}
        cardStyle="elevated"
        title="System Status"
        sx={{ p: 3 }}
      />
    );
  }

  if (error) {
    return (
      <Card
        cardStyle="elevated"
        title="System Status"
        tags={[{ label: 'Error', color: 'error' }]}
        sx={{ p: 3 }}
      >
        <Typography color="error" variant="body2" sx={{ p: 2 }}>
          {error}
        </Typography>
      </Card>
    );
  }

  const {
    system = {},
    network = {},
    storage = {},
    security = {}
  } = data;

  const getOverallStatus = () => {
    if (Object.values(data).some(component => component.status === STATUS.ERROR)) {
      return STATUS.ERROR;
    }
    if (Object.values(data).some(component => component.status === STATUS.WARNING)) {
      return STATUS.WARNING;
    }
    if (Object.values(data).some(component => component.status === STATUS.PENDING)) {
      return STATUS.PENDING;
    }
    return STATUS.HEALTHY;
  };

  const overallStatus = getOverallStatus();
  const statusConfig = {
    [STATUS.HEALTHY]: { color: 'success', label: 'All Systems Operational' },
    [STATUS.WARNING]: { color: 'warning', label: 'Performance Degraded' },
    [STATUS.ERROR]: { color: 'error', label: 'System Error' },
    [STATUS.PENDING]: { color: 'info', label: 'System Initializing' }
  }[overallStatus];

  return (
    <Card
      cardStyle="elevated"
      title="System Status"
      headerAction={
        <Badge
          label={statusConfig.label}
          color={statusConfig.color}
          variant="soft"
          size="small"
          icon={<StatusIcon status={overallStatus} />}
        />
      }
      sx={{ p: 0 }}
    >
      <Box sx={{ p: 3 }}>
        {showProgress && data.health && (
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <Progress
              variant="circular-with-label"
              value={data.health.score * 100}
              color={statusConfig.color}
              size="large"
              thickness={4}
              label="System Health"
            />
          </Box>
        )}
        
        <Stack spacing={2}>
          <ComponentStatus
            name="System Resources"
            status={system.status}
            value={`${system.cpu}%`}
            icon={MemoryIcon}
            details={`CPU: ${system.cpu}% | RAM: ${system.memory}%`}
          />
          <ComponentStatus
            name="Network"
            status={network.status}
            value={`${network.latency}ms`}
            icon={NetworkIcon}
            details={`Latency: ${network.latency}ms | Bandwidth: ${network.bandwidth} Mbps`}
          />
          <ComponentStatus
            name="Storage"
            status={storage.status}
            value={`${(storage.used / storage.total * 100).toFixed(1)}%`}
            icon={StorageIcon}
            details={`Used: ${storage.used}/${storage.total} GB`}
          />
          <ComponentStatus
            name="Security"
            status={security.status}
            value={security.threats ? `${(security.threats / 10).toFixed(1)}%` : undefined}
            icon={SecurityIcon}
            details={security.details}
          />
        </Stack>
      </Box>
    </Card>
  );
};

export default StatusIndicator; 