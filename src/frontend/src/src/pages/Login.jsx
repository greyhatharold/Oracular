import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  useTheme,
  Paper,
  Divider,
  IconButton,
  InputAdornment,
  alpha,
  Link,
  CircularProgress,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AuthContext } from '../contexts/AuthContext';
import { useAppTheme } from '../styles/ThemeProvider';

const Login = () => {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!address.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    try {
      // Check if MetaMask is needed for this address and is installed
      const isDemoAddress = address === '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
      if (isDemoAddress && !window.ethereum) {
        window.open('https://metamask.io/download/', '_blank');
        setError('Please install MetaMask to use the demo wallet');
        return;
      }
      
      setError(''); // Clear any previous errors
      setIsLoading(true); // Show loading indicator
      console.log('Attempting to login with address:', address);
      
      // Call the login function and wait for it to complete
      const success = await login(address);
      
      console.log('Login result:', success);
      
      // Only navigate if login was successful
      if (success) {
        console.log('Login successful, navigating to home');
        navigate('/');
      } else {
        // If login returns false but doesn't throw, show an error
        setError('Login failed. Please check your wallet address and try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to connect. Please try again.');
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  const handleCopyDemo = () => {
    const demoAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    setAddress(demoAddress);
    navigator.clipboard.writeText(demoAddress);
    
    // Check if MetaMask is installed, if not open the MetaMask website
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        backgroundImage: isDark 
          ? `radial-gradient(circle at 10% 20%, ${alpha(theme.palette.primary.dark, 0.08)} 0%, transparent 50%), 
             radial-gradient(circle at 90% 80%, ${alpha(theme.palette.secondary.dark, 0.08)} 0%, transparent 60%),
             radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.dark, 0.05)} 0%, transparent 70%)`
          : `radial-gradient(circle at 10% 20%, ${alpha(theme.palette.primary.light, 0.12)} 0%, transparent 50%), 
             radial-gradient(circle at 90% 80%, ${alpha(theme.palette.secondary.light, 0.12)} 0%, transparent 60%),
             radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 70%)`,
        px: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background elements */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: isDark
            ? `radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 30%),
               radial-gradient(circle at 100% 100%, ${alpha(theme.palette.secondary.dark, 0.15)} 0%, transparent 30%)`
            : `radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 30%),
               radial-gradient(circle at 100% 100%, ${alpha(theme.palette.secondary.light, 0.2)} 0%, transparent 30%)`,
          filter: 'blur(80px)',
          transform: 'translate3d(0, 0, 0)',
          pointerEvents: 'none',
        }}
      />
      
      <Paper
        elevation={isDark ? 4 : 8}
        sx={{
          maxWidth: 550,
          width: '100%',
          minHeight: 600,
          borderRadius: theme.borderRadius['2xl'],
          overflow: 'hidden',
          border: `1px solid ${isDark 
            ? alpha(theme.palette.primary.dark, 0.2)
            : alpha(theme.palette.primary.light, 0.2)}`,
          backdropFilter: 'blur(12px)',
          backgroundColor: isDark 
            ? alpha(theme.palette.background.paper, 0.7) 
            : alpha(theme.palette.background.paper, 0.8),
          position: 'relative',
          '&:focus-within': {
            '& .MuiTypography-h6': {
              color: `${theme.palette.common.white} !important`,
              WebkitTextFillColor: `${theme.palette.common.white} !important`,
              background: 'none !important',
              animation: 'none !important',
              transition: 'all 1.2s cubic-bezier(0.19, 1, 0.22, 1)',
            }
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
            borderRadius: 'inherit',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            width: '200%',
            height: '200%',
            top: -150,
            left: -100,
            background: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 60%)`,
            opacity: 0.5,
            pointerEvents: 'none',
          },
          transform: 'translateZ(0)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px) translateZ(0)',
            boxShadow: isDark 
              ? `0 20px 40px -15px ${alpha(theme.palette.common.black, 0.5)}`
              : `0 20px 40px -15px ${alpha(theme.palette.common.black, 0.2)}`,
            border: `1px solid ${isDark 
              ? alpha(theme.palette.primary.main, 0.3)
              : alpha(theme.palette.primary.main, 0.3)}`,
          }
        }}
      >
        <Box 
          sx={{ 
            p: 4,
            pt: 4,
            borderBottom: `1px solid ${isDark 
              ? alpha(theme.palette.divider, 0.1)
              : alpha(theme.palette.divider, 0.1)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            align="center"
            fontWeight="bold"
            sx={{
              background: `-webkit-linear-gradient(45deg, 
                ${theme.palette.primary.main}, 
                ${theme.palette.secondary.main} 30%,
                ${theme.palette.primary.main} 60%,
                ${theme.palette.secondary.main} 100%)`,
              backgroundSize: '200% auto',
              animation: 'gradient 8s linear infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              mb: 1.5,
              mt: 0.5,
              fontSize: '3.2rem',
              textShadow: isDark
                ? `0 0 20px ${alpha(theme.palette.primary.main, 0.5)},
                   0 0 40px ${alpha(theme.palette.secondary.main, 0.3)}`
                : `0 0 20px ${alpha(theme.palette.primary.main, 0.3)},
                   0 0 40px ${alpha(theme.palette.secondary.main, 0.2)}`,
              '@keyframes gradient': {
                '0%': {
                  backgroundPosition: '0% 50%',
                },
                '50%': {
                  backgroundPosition: '100% 50%',
                },
                '100%': {
                  backgroundPosition: '0% 50%',
                },
              },
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.02)',
                textShadow: isDark
                  ? `0 0 30px ${alpha(theme.palette.primary.main, 0.6)},
                     0 0 50px ${alpha(theme.palette.secondary.main, 0.4)}`
                  : `0 0 30px ${alpha(theme.palette.primary.main, 0.4)},
                     0 0 50px ${alpha(theme.palette.secondary.main, 0.3)}`,
              },
            }}
          >
            Oracular
          </Typography>
          <Typography 
            variant="h6" 
            color="textSecondary" 
            align="center" 
            sx={{ 
              mb: 1,
              maxWidth: '80%',
              opacity: 0.8,
              lineHeight: 1.5,
              color: theme.palette.primary.main,
              transition: 'all 1.2s cubic-bezier(0.19, 1, 0.22, 1)',
              background: `-webkit-linear-gradient(45deg, 
                ${theme.palette.primary.main}, 
                ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
              animation: 'subtitleGradient 8s ease-in-out infinite',
              '@keyframes subtitleGradient': {
                '0%': {
                  backgroundPosition: '0% 50%',
                },
                '50%': {
                  backgroundPosition: '100% 50%',
                },
                '100%': {
                  backgroundPosition: '0% 50%',
                },
              },
            }}
          >
            Connect your wallet to access the dashboard
          </Typography>
        </Box>
        
        <Box sx={{ 
          p: 4, 
          pt: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
          minHeight: '600px'
        }}>
          <Box 
            sx={{ 
              mt: 4,
              '&:focus-within': {
                '& ~ .MuiTypography-h6': {
                  color: `${theme.palette.common.white} !important`,
                  WebkitTextFillColor: `${theme.palette.common.white} !important`,
                  background: 'none !important',
                  animation: 'none !important',
                }
              }
            }}
          >
            <TextField
              fullWidth
              label="Wallet Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={!!error}
              helperText={error}
              sx={{ 
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: theme.borderRadius.xl,
                  backgroundColor: isDark 
                    ? alpha(theme.palette.background.paper, 0.4)
                    : alpha(theme.palette.background.paper, 0.6),
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease-in-out',
                  height: 56,
                  '&:hover': {
                    backgroundColor: isDark 
                      ? alpha(theme.palette.background.paper, 0.5)
                      : alpha(theme.palette.background.paper, 0.8),
                  },
                  '&.Mui-focused': {
                    backgroundColor: isDark 
                      ? alpha(theme.palette.background.paper, 0.6)
                      : alpha(theme.palette.background.paper, 0.9),
                    '& + .MuiInputLabel-root': {
                      animation: 'labelGradient 4s ease infinite',
                      background: `-webkit-linear-gradient(45deg, 
                        ${theme.palette.secondary.main}, 
                        ${theme.palette.primary.main})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundSize: '200% 200%',
                    },
                  }
                },
                '& .MuiInputLabel-root': {
                  fontSize: '1.1rem',
                  color: theme.palette.common.white,
                  transition: 'all 1.2s cubic-bezier(0.19, 1, 0.22, 1)',
                  '&.Mui-focused': {
                    background: `-webkit-linear-gradient(45deg, 
                      ${theme.palette.primary.main}, 
                      ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundSize: '200% 200%',
                    animation: 'labelGradient 8s ease-in-out infinite',
                  },
                },
                '@keyframes labelGradient': {
                  '0%': {
                    backgroundPosition: '0% 50%',
                  },
                  '50%': {
                    backgroundPosition: '100% 50%',
                  },
                  '100%': {
                    backgroundPosition: '0% 50%',
                  },
                },
              }}
              placeholder="Enter your Ethereum wallet address"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 24 }} />
                  </InputAdornment>
                ),
                endAdornment: address && (
                  <InputAdornment position="end">
                    <IconButton 
                      edge="end" 
                      onClick={() => navigator.clipboard.writeText(address)}
                      size="medium"
                      color="primary"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleLogin}
            disabled={isLoading}
            sx={{ 
              py: 2,
              borderRadius: theme.borderRadius.xl,
              fontWeight: 700,
              fontSize: '1.2rem',
              transition: 'all 0.3s ease-in-out',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backdropFilter: 'blur(4px)',
              height: 56,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 25px -5px ${alpha(theme.palette.primary.main, 0.5)}`,
              },
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1.5 }} />
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </Button>
          
          <Divider sx={{ 
            '&::before, &::after': {
              borderColor: isDark 
                ? alpha(theme.palette.divider, 0.1)
                : alpha(theme.palette.divider, 0.1),
            }
          }}>
            <Typography 
              variant="body1"
              color="text.secondary"
              sx={{ px: 3, opacity: 0.7 }}
            >
              OR
            </Typography>
          </Divider>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={handleCopyDemo}
            sx={{ 
              borderRadius: theme.borderRadius.xl, 
              py: 2,
              height: 56,
              fontSize: '1.1rem',
              borderColor: isDark 
                ? alpha(theme.palette.primary.main, 0.3)
                : alpha(theme.palette.primary.main, 0.3),
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: isDark 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : alpha(theme.palette.primary.main, 0.05),
              }
            }}
          >
            Use Demo Address
          </Button>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                opacity: 0.7,
                fontSize: '0.9rem',
                lineHeight: 1.6,
              }}
            >
              By connecting, you agree to our{' '}
              <Link 
                href="#" 
                underline="hover"
                sx={{ 
                  color: theme.palette.primary.main,
                  transition: 'color 0.2s ease-in-out',
                  '&:hover': {
                    color: theme.palette.secondary.main,
                  }
                }}
              >
                Terms of Service
              </Link> and{' '}
              <Link 
                href="#" 
                underline="hover"
                sx={{ 
                  color: theme.palette.primary.main,
                  transition: 'color 0.2s ease-in-out',
                  '&:hover': {
                    color: theme.palette.secondary.main,
                  }
                }}
              >
                Privacy Policy
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login; 