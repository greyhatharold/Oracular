import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
  LinearProgress,
} from '@mui/material';

const Monitoring = () => {
  const theme = useTheme();
  const [metrics] = useState([
    {
      id: 1,
      name: 'System Health',
      value: 98,
      unit: '%',
      status: 'Healthy',
    },
    {
      id: 2,
      name: 'Response Time',
      value: 150,
      unit: 'ms',
      status: 'Good',
    },
    {
      id: 3,
      name: 'Active Oracles',
      value: 5,
      unit: '',
      status: 'Normal',
    },
    {
      id: 4,
      name: 'Data Feeds',
      value: 12,
      unit: '',
      status: 'Active',
    },
  ]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Monitoring
      </Typography>
      <Grid container spacing={3}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {metric.name}
                </Typography>
                <Typography variant="h4" gutterBottom>
                  {metric.value}
                  {metric.unit}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Status: {metric.status}
                </Typography>
                {metric.name === 'System Health' && (
                  <LinearProgress
                    variant="determinate"
                    value={metric.value}
                    sx={{
                      mt: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        backgroundColor: metric.value > 90
                          ? theme.palette.success.main
                          : metric.value > 70
                            ? theme.palette.warning.main
                            : theme.palette.error.main,
                      },
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Monitoring; 