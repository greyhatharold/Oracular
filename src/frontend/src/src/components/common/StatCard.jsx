import React from 'react';
import { Box, Typography, Stack, Chip, CardContent } from '@mui/material';
import { GlassCard } from './GlassCard';

export const StatCard = ({ icon: Icon, title, value, trend, status }) => (
  <GlassCard sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            background: 'rgba(103, 116, 255, 0.1)',
            display: 'flex',
          }}
        >
          <Icon sx={{ color: 'primary.main' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
            {title}
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5, color: '#fff', fontWeight: 600 }}>
            {value}
          </Typography>
        </Box>
        {trend && (
          <Chip
            size="small"
            label={trend}
            color={status || 'primary'}
            sx={{
              height: 24,
              background: status === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(103, 116, 255, 0.15)',
              color: status === 'success' ? '#2ed573' : '#6774ff',
              border: 'none',
              '& .MuiChip-label': {
                px: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
              },
            }}
          />
        )}
      </Stack>
    </CardContent>
  </GlassCard>
); 