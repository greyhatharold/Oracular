import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  useTheme,
} from '@mui/material';

const Settings = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    autoSync: true,
    syncInterval: '5',
    apiEndpoint: 'https://api.example.com',
  });

  const handleChange = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Save settings logic here
    console.log('Saving settings:', settings);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications}
                onChange={handleChange('notifications')}
                color="primary"
              />
            }
            label="Enable Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.emailAlerts}
                onChange={handleChange('emailAlerts')}
                color="primary"
              />
            }
            label="Email Alerts"
          />
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Synchronization
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSync}
                onChange={handleChange('autoSync')}
                color="primary"
              />
            }
            label="Auto Synchronization"
          />
          <TextField
            fullWidth
            label="Sync Interval (minutes)"
            type="number"
            value={settings.syncInterval}
            onChange={handleChange('syncInterval')}
            margin="normal"
          />
          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            API Configuration
          </Typography>
          <TextField
            fullWidth
            label="API Endpoint"
            value={settings.apiEndpoint}
            onChange={handleChange('apiEndpoint')}
            margin="normal"
          />
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
            >
              Save Settings
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings; 