import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

interface LoadingScreenProps {
  message?: string;
}

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  gap: theme.spacing(2),
}));

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <LoadingContainer>
      <CircularProgress
        size={48}
        thickness={4}
        sx={{
          color: (theme) => theme.palette.primary.main,
        }}
      />
      <Typography
        variant="h6"
        sx={{
          color: (theme) => theme.palette.text.secondary,
          fontWeight: 500,
        }}
      >
        {message}
      </Typography>
    </LoadingContainer>
  );
};

export default LoadingScreen; 