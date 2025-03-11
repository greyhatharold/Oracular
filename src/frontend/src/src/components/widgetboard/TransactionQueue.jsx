import React, { useState, useMemo } from 'react';
import { formatUnits } from 'ethers';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Link,
  Paper,
  Tab,
  Tabs
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  ErrorOutline as ErrorIcon,
  CheckCircleOutline as SuccessIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '@mui/material/styles';

const TransactionStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed'
};

const StatusChip = ({ status }) => {
  const theme = useTheme();
  
  const statusConfig = {
    [TransactionStatus.PENDING]: {
      label: 'Pending',
      color: 'warning',
      icon: <PendingIcon sx={{ fontSize: '1rem' }} />
    },
    [TransactionStatus.CONFIRMED]: {
      label: 'Confirmed',
      color: 'success',
      icon: <SuccessIcon sx={{ fontSize: '1rem' }} />
    },
    [TransactionStatus.FAILED]: {
      label: 'Failed',
      color: 'error',
      icon: <ErrorIcon sx={{ fontSize: '1rem' }} />
    }
  };

  const config = statusConfig[status] || statusConfig[TransactionStatus.PENDING];

  return (
    <Chip
      size="small"
      icon={config.icon}
      label={config.label}
      color={config.color}
      sx={{ minWidth: 100 }}
    />
  );
};

const TransactionQueue = ({ transactions = [], onRefresh }) => {
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  const filteredTransactions = useMemo(() => {
    switch (activeTab) {
      case 0: // All
        return transactions;
      case 1: // Pending
        return transactions.filter(tx => tx.status === TransactionStatus.PENDING);
      case 2: // Completed
        return transactions.filter(tx => tx.status === TransactionStatus.CONFIRMED);
      case 3: // Failed
        return transactions.filter(tx => tx.status === TransactionStatus.FAILED);
      default:
        return transactions;
    }
  }, [transactions, activeTab]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const formatValue = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(6);
    }
    return value;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flex: 1 }}
        >
          <Tab label="All" />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span>Pending</span>
                {transactions.filter(tx => tx.status === TransactionStatus.PENDING).length > 0 && (
                  <Chip
                    size="small"
                    label={transactions.filter(tx => tx.status === TransactionStatus.PENDING).length}
                    color="warning"
                    sx={{ ml: 1, height: 20 }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Completed" />
          <Tab label="Failed" />
        </Tabs>
        <IconButton onClick={onRefresh} size="small" sx={{ ml: 1 }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          flex: 1,
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: 4
          }
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Gas (gwei)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((tx) => (
              <TableRow
                key={tx.hash}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  backgroundColor: tx.status === TransactionStatus.PENDING ?
                    theme.palette.action.hover : 'inherit'
                }}
              >
                <TableCell>
                  <Tooltip title={new Date(tx.timestamp).toLocaleString()}>
                    <Typography variant="body2">
                      {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{tx.type}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatValue(tx.value)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {tx.gasPrice ? formatUnits(tx.gasPrice, 'gwei') : '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusChip status={tx.status} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View on Explorer">
                    <IconButton
                      size="small"
                      component={Link}
                      href={`${tx.explorerUrl}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener"
                    >
                      <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TransactionQueue; 