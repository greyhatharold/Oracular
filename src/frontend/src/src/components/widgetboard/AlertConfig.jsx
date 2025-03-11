import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Typography,
  Divider,
  Alert,
  Collapse,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const SEVERITY_LEVELS = {
  CRITICAL: {
    label: 'Critical',
    color: 'error',
    icon: <ErrorIcon />
  },
  HIGH: {
    label: 'High',
    color: 'error',
    icon: <WarningIcon />
  },
  MEDIUM: {
    label: 'Medium',
    color: 'warning',
    icon: <WarningIcon />
  },
  LOW: {
    label: 'Low',
    color: 'info',
    icon: <InfoIcon />
  }
};

const COMPONENT_TYPES = [
  'ORACLE',
  'SCHEDULER',
  'DATA_SOURCE',
  'BLOCKCHAIN',
  'CONTRACT',
  'API'
];

const AlertConfig = ({ alerts = [], onCreateRule, onUpdateRule, onDeleteRule }) => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showActiveAlerts, setShowActiveAlerts] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'MEDIUM',
    component: 'ORACLE',
    condition: '',
    lookbackWindow: 300,
    cooldownPeriod: 300,
    channels: {
      email: true,
      slack: false,
      webhook: false
    },
    enabled: true
  });

  useEffect(() => {
    setActiveAlerts(alerts.filter(alert => !alert.resolvedAt));
  }, [alerts]);

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setSelectedRule(rule);
      setFormData(rule);
    } else {
      setSelectedRule(null);
      setFormData({
        name: '',
        description: '',
        severity: 'MEDIUM',
        component: 'ORACLE',
        condition: '',
        lookbackWindow: 300,
        cooldownPeriod: 300,
        channels: {
          email: true,
          slack: false,
          webhook: false
        },
        enabled: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRule(null);
  };

  const handleSubmit = () => {
    if (selectedRule) {
      onUpdateRule({ ...selectedRule, ...formData });
    } else {
      onCreateRule(formData);
    }
    handleCloseDialog();
  };

  const renderAlertIcon = (severity) => {
    const config = SEVERITY_LEVELS[severity];
    return (
      <ListItemIcon>
        {React.cloneElement(config.icon, {
          sx: { color: theme.palette[config.color].main }
        })}
      </ListItemIcon>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Active Alerts Section */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1
          }}
        >
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            Active Alerts
          </Typography>
          <Button
            size="small"
            onClick={() => setShowActiveAlerts(!showActiveAlerts)}
          >
            {showActiveAlerts ? 'Hide' : 'Show'}
          </Button>
        </Box>
        <Collapse in={showActiveAlerts}>
          {activeAlerts.map((alert) => (
            <Alert
              key={alert.alertId}
              severity={SEVERITY_LEVELS[alert.severity].color}
              sx={{ mb: 1 }}
              icon={SEVERITY_LEVELS[alert.severity].icon}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{alert.message}</Typography>
                <Chip
                  size="small"
                  label={alert.component}
                  sx={{ ml: 'auto' }}
                />
              </Box>
            </Alert>
          ))}
          {activeAlerts.length === 0 && (
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ textAlign: 'center', py: 2 }}
            >
              No active alerts
            </Typography>
          )}
        </Collapse>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Alert Rules Section */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2
          }}
        >
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            Alert Rules
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Rule
          </Button>
        </Box>

        <List>
          {selectedRule?.rules.map((rule) => (
            <ListItem
              key={rule.id}
              sx={{
                mb: 1,
                borderRadius: 1,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              {renderAlertIcon(rule.severity)}
              <ListItemText
                primary={rule.name}
                secondary={rule.description}
                secondaryTypographyProps={{ variant: 'body2' }}
              />
              <ListItemSecondaryAction>
                <Switch
                  size="small"
                  checked={rule.enabled}
                  onChange={() => onUpdateRule({
                    ...rule,
                    enabled: !rule.enabled
                  })}
                />
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(rule)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDeleteRule(rule.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Alert Rule Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                label="Severity"
              >
                {Object.entries(SEVERITY_LEVELS).map(([value, config]) => (
                  <MenuItem key={value} value={value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {config.icon}
                      {config.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Component</InputLabel>
              <Select
                value={formData.component}
                onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                label="Component"
              >
                {COMPONENT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Condition"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              fullWidth
              multiline
              rows={3}
              helperText="Enter condition using metric names and operators"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Lookback Window (s)"
                type="number"
                value={formData.lookbackWindow}
                onChange={(e) => setFormData({
                  ...formData,
                  lookbackWindow: parseInt(e.target.value)
                })}
              />
              <TextField
                label="Cooldown Period (s)"
                type="number"
                value={formData.cooldownPeriod}
                onChange={(e) => setFormData({
                  ...formData,
                  cooldownPeriod: parseInt(e.target.value)
                })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || !formData.condition}
          >
            {selectedRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertConfig; 