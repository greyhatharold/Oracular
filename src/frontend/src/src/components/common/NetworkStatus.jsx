import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  CircularProgress,
  Chip,
  Link
} from '@mui/material';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import WarningIcon from '@mui/icons-material/Warning';
import walletService from '../../services/walletService';

const NetworkStatus = () => {
  const [networkDetails, setNetworkDetails] = useState(null);
  const [gasPrice, setGasPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = walletService.subscribe((event, data) => {
      switch (event) {
        case 'networkChanged':
          setNetworkDetails(data.networkDetails);
          break;
        case 'gasPriceUpdate':
          setGasPrice(data.gasPrice);
          break;
        case 'error':
          setError(data.message);
          break;
        default:
          break;
      }
    });

    // Initial load
    const init = async () => {
      try {
        const price = await walletService.getGasPrice();
        setGasPrice(price);
        setIsLoading(false);
      } catch (error) {
        setError('Failed to load network status');
        setIsLoading(false);
      }
    };

    init();
    return () => unsubscribe();
  }, []);

  const getNetworkColor = () => {
    if (!networkDetails) return 'warning';
    switch (networkDetails.name.toLowerCase()) {
      case 'ethereum mainnet':
        return 'success';
      case 'goerli testnet':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getGasPriceColor = () => {
    if (!gasPrice) return 'default';
    const gwei = parseFloat(gasPrice.gwei);
    if (gwei < 30) return 'success';
    if (gwei < 100) return 'warning';
    return 'error';
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading network status...</Typography>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: 'background.paper'
      }}
    >
      {/* Network Status */}
      <Box>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Network
        </Typography>
        <Chip
          icon={<NetworkCheckIcon />}
          label={networkDetails?.name || 'Not Connected'}
          color={getNetworkColor()}
          size="small"
        />
      </Box>

      {/* Gas Price */}
      <Box>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Gas Price
        </Typography>
        {gasPrice ? (
          <Tooltip
            title={`≈ $${gasPrice.usd} USD`}
            placement="bottom"
            arrow
          >
            <Chip
              icon={<LocalGasStationIcon />}
              label={`${gasPrice.gwei} GWEI`}
              color={getGasPriceColor()}
              size="small"
            />
          </Tooltip>
        ) : (
          <Chip
            icon={<WarningIcon />}
            label="Unavailable"
            color="error"
            size="small"
          />
        )}
      </Box>

      {/* Block Explorer Link */}
      {networkDetails?.blockExplorer && (
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Explorer
          </Typography>
          <Link
            href={networkDetails.blockExplorer}
            target="_blank"
            rel="noopener"
            underline="hover"
          >
            View Explorer
          </Link>
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Tooltip title={error} placement="bottom" arrow>
          <Chip
            icon={<WarningIcon />}
            label="Error"
            color="error"
            size="small"
          />
        </Tooltip>
      )}
    </Paper>
  );
};

export default NetworkStatus; 