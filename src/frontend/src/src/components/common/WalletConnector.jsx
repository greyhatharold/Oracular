import React, { useState, useEffect } from 'react';
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import walletService from '../../services/walletService';

const WalletConnector = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [networkDetails, setNetworkDetails] = useState(null);
  const [error, setError] = useState(null);
  const [showNetworkDialog, setShowNetworkDialog] = useState(false);

  useEffect(() => {
    // Initialize wallet service
    const init = async () => {
      try {
        await walletService.initialize();
      } catch (error) {
        setError('Failed to initialize wallet');
      }
    };

    init();

    // Subscribe to wallet events
    const unsubscribe = walletService.subscribe((event, data) => {
      switch (event) {
        case 'connect':
          setIsConnected(true);
          setAccount(data.account);
          setNetworkDetails(data.networkDetails);
          break;
        case 'disconnect':
          setIsConnected(false);
          setAccount(null);
          setNetworkDetails(null);
          break;
        case 'networkChanged':
          setNetworkDetails(data.networkDetails);
          break;
        case 'error':
          setError(data.message);
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        window.open('https://metamask.io/download/', '_blank');
        setError('MetaMask not installed. Please install it to connect your wallet.');
        return;
      }
      
      console.log('Attempting to connect wallet via walletService');
      const success = await walletService.connect();
      console.log('Wallet connection result:', success);
      
      if (!success) {
        setError('Failed to connect wallet. Please try again.');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError(typeof error === 'string' ? error : (error.message || 'Failed to connect wallet'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await walletService.disconnect();
    } catch (error) {
      setError('Failed to disconnect wallet');
    }
  };

  const handleNetworkSwitch = async (chainId) => {
    setError(null);
    try {
      await walletService.switchNetwork(chainId);
      setShowNetworkDialog(false);
    } catch (error) {
      setError('Failed to switch network');
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!isConnected ? (
        <Button
          variant="contained"
          startIcon={<AccountBalanceWalletIcon />}
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Connect Wallet'
          )}
        </Button>
      ) : (
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={formatAddress(account)}
            color="primary"
            onDelete={handleDisconnect}
          />
          <Chip
            icon={<SwapHorizIcon />}
            label={networkDetails?.name || 'Unknown Network'}
            onClick={() => setShowNetworkDialog(true)}
            color={networkDetails ? 'success' : 'warning'}
          />
        </Box>
      )}

      <Dialog
        open={showNetworkDialog}
        onClose={() => setShowNetworkDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select Network</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            {Object.entries(walletService.SUPPORTED_NETWORKS).map(([chainId, network]) => (
              <Button
                key={chainId}
                variant={networkDetails?.chainId === network.chainId ? 'contained' : 'outlined'}
                onClick={() => handleNetworkSwitch(parseInt(chainId))}
                fullWidth
              >
                {network.name}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNetworkDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletConnector; 