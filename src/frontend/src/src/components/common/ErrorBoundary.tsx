import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const ErrorContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  margin: theme.spacing(2),
  minHeight: '50vh',
  textAlign: 'center',
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius * 2,
}));

const ErrorMessage = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
  marginBottom: theme.spacing(2),
}));

const ErrorDetails = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.grey[900] 
    : theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  maxWidth: '100%',
  overflow: 'auto',
  '& pre': {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}));

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    // Log error to your error reporting service
    console.error('Uncaught error:', error, errorInfo);
    
    // If it's a JSON parsing error from auth process, clear auth token
    if (error.message.includes('Unexpected token') && error.message.includes('<!DOCTYPE')) {
      console.warn('Clearing auth token due to HTML response in JSON context');
      localStorage.removeItem('auth_token');
    }
  }

  private isAuthError(): boolean {
    if (!this.state.error) return false;
    
    const errorStr = this.state.error.toString().toLowerCase();
    return (
      errorStr.includes('auth') || 
      errorStr.includes('token') || 
      errorStr.includes('login') ||
      errorStr.includes('unexpected token') || 
      errorStr.includes('<!doctype')
    );
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };
  
  private handleGoToLogin = () => {
    // Clear any auth tokens that might be causing issues
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  public render() {
    if (this.state.hasError) {
      const isAuthError = this.isAuthError();
      
      return (
        <ErrorContainer elevation={3}>
          <ErrorMessage variant="h4" gutterBottom>
            {isAuthError ? 'Authentication Error' : 'Something went wrong'}
          </ErrorMessage>
          
          <Typography variant="body1" color="textSecondary" paragraph>
            {isAuthError 
              ? 'There was a problem with your authentication. Please try logging in again.'
              : 'We apologize for the inconvenience. Please try refreshing the page.'
            }
          </Typography>

          {isAuthError ? (
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleGoToLogin}
              sx={{ mb: 4 }}
            >
              Go to Login
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              sx={{ mb: 4 }}
            >
              Refresh Page
            </Button>
          )}

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <ErrorDetails>
              <Typography variant="subtitle2" color="error" gutterBottom>
                Error Details:
              </Typography>
              <pre>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 