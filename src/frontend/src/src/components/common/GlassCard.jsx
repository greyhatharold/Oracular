import React from 'react';
import { Card } from '@mui/material';

export const GlassCard = ({ children, ...props }) => (
  <Card
    {...props}
    sx={{
      background: 'rgba(13, 17, 31, 0.65)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(103, 116, 255, 0.1)',
      borderRadius: 3,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(103, 116, 255, 0.05) 0%, rgba(79, 70, 229, 0.02) 100%)',
        opacity: 0.5,
        transition: 'opacity 0.3s ease',
      },
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 20px 40px rgba(103, 116, 255, 0.15)',
        '&::before': {
          opacity: 1,
        },
      },
      ...props.sx,
    }}
  >
    {children}
  </Card>
); 