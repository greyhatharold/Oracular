import React, { useContext, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Grid,
  useTheme,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Chip,
  LinearProgress,
  alpha,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Edit as EditIcon,
  Logout as LogoutIcon,
  AccountBalanceWallet as WalletIcon,
  Shield as ShieldIcon,
  Timeline as TimelineIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';

const Profile = () => {
  const theme = useTheme();
  const { user, logout } = useContext(AuthContext);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(user?.walletAddress || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mock data - replace with real data in production
  const stats = {
    totalTransactions: '1,234',
    successRate: '99.8%',
    avgResponseTime: '0.5s',
    dataPoints: '45.2K',
  };

  const reputationScore = 92;

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        gap: 3,
        maxWidth: '1600px',
        margin: '0 auto'
      }}
    >
      <GlassCard 
        sx={{ 
          backdropFilter: 'blur(20px)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={3}>
            <Avatar
              src={user?.avatar}
              alt={user?.username}
              sx={{ 
                width: { xs: 100, sm: 80 }, 
                height: { xs: 100, sm: 80 }, 
                border: '2px solid', 
                borderColor: 'primary.main',
                boxShadow: '0 0 20px rgba(103, 116, 255, 0.2)'
              }}
            />
            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h5" sx={{ color: '#fff', mb: 1, fontWeight: 600 }}>
                {user?.username || 'Anonymous User'}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    background: 'rgba(103, 116, 255, 0.1)',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontFamily: 'monospace'
                  }}
                >
                  {user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
                </Typography>
                <Tooltip title={copied ? "Copied!" : "Copy address"}>
                  <IconButton 
                    size="small" 
                    onClick={handleCopy}
                    sx={{
                      background: 'rgba(103, 116, 255, 0.1)',
                      '&:hover': {
                        background: 'rgba(103, 116, 255, 0.2)'
                      }
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
            <Stack direction={{ xs: 'row', sm: 'row' }} spacing={2} sx={{ mt: { xs: 2, sm: 0 } }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    borderColor: 'primary.main',
                    background: 'rgba(103, 116, 255, 0.1)'
                  }
                }}
              >
                Edit Profile
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={logout}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    borderColor: 'error.main',
                    background: 'rgba(255, 72, 66, 0.1)'
                  }
                }}
              >
                Disconnect
              </Button>
            </Stack>
          </Stack>
        </Box>
      </GlassCard>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={WalletIcon}
            title="Total Balance"
            value="2.5821 ETH"
            trend="+12.5%"
            status="success"
            sx={{
              transform: 'translateY(0)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={TimelineIcon}
            title="Active Trades"
            value="8"
            trend="Active"
            status="primary"
            sx={{
              transform: 'translateY(0)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={StorageIcon}
            title="Total Trades"
            value="156"
            sx={{
              transform: 'translateY(0)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={SpeedIcon}
            title="Success Rate"
            value="94.2%"
            trend="Excellent"
            status="success"
            sx={{
              transform: 'translateY(0)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)'
              }
            }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <GlassCard 
            sx={{ 
              height: '100%',
              backdropFilter: 'blur(20px)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: '#fff', mb: 3, fontWeight: 600 }}>
                Recent Activity
              </Typography>
              <Stack spacing={2}>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    textAlign: 'center',
                    py: 4,
                    background: 'rgba(103, 116, 255, 0.05)',
                    borderRadius: '12px'
                  }}
                >
                  No recent activity to display
                </Typography>
              </Stack>
            </Box>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard 
            sx={{ 
              height: '100%',
              backdropFilter: 'blur(20px)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: '#fff', mb: 3, fontWeight: 600 }}>
                Security Status
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <ShieldIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Security Score
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={85}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        background: 'linear-gradient(90deg, #6774FF, #8794FF)'
                      }
                    }}
                  />
                </Box>
                <Stack 
                  direction="row" 
                  alignItems="center" 
                  spacing={1}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(103, 116, 255, 0.1)'
                  }}
                >
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2" color="text.secondary">
                    2FA Enabled
                  </Typography>
                </Stack>
                <Stack 
                  direction="row" 
                  alignItems="center" 
                  spacing={1}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(255, 72, 66, 0.1)'
                  }}
                >
                  <WarningIcon color="error" />
                  <Typography variant="body2" color="text.secondary">
                    Backup Keys: Not configured
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile; 