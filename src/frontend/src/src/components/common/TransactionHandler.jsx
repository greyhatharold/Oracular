import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Link
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import walletService from '../../services/walletService';

const TransactionSteps = {
  INITIAL: 0,
  PENDING: 1,
  CONFIRMED: 2,
  FAILED: 3
};

const TransactionHandler = ({
  onSubmit,
  onComplete,
  title = 'Confirm Transaction',
  description = 'Please confirm the transaction in your wallet',
  open,
  onClose
}) => {
  const [activeStep, setActiveStep] = useState(TransactionSteps.INITIAL);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [gasEstimate, setGasEstimate] = useState(null);

  useEffect(() => {
    if (open) {
      setActiveStep(TransactionSteps.INITIAL);
      setError(null);
      setTxHash(null);
      updateGasEstimate();
    }
  }, [open]);

  useEffect(() => {
    const unsubscribe = walletService.subscribe((event, data) => {
      switch (event) {
        case 'transactionPending':
          setTxHash(data.hash);
          setActiveStep(TransactionSteps.PENDING);
          break;
        case 'transactionConfirmed':
          setActiveStep(TransactionSteps.CONFIRMED);
          if (onComplete) onComplete(data.receipt);
          break;
        case 'error':
          setError(data.message);
          setActiveStep(TransactionSteps.FAILED);
          break;
        case 'gasPriceUpdate':
          setGasEstimate(data.gasPrice);
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [onComplete]);

  const updateGasEstimate = async () => {
    try {
      const estimate = await walletService.getGasPrice();
      setGasEstimate(estimate);
    } catch (error) {
      console.error('Failed to get gas estimate:', error);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    try {
      await onSubmit();
    } catch (error) {
      setError(error.message);
      setActiveStep(TransactionSteps.FAILED);
    }
  };

  const handleClose = () => {
    if (activeStep !== TransactionSteps.PENDING) {
      onClose();
    }
  };

  const getExplorerLink = () => {
    if (!txHash || !walletService.networkDetails?.blockExplorer) return null;
    return `${walletService.networkDetails.blockExplorer}/tx/${txHash}`;
  };

  const renderContent = () => {
    switch (activeStep) {
      case TransactionSteps.INITIAL:
        return (
          <Box textAlign="center" py={2}>
            <Typography variant="body1" gutterBottom>
              {description}
            </Typography>
            {gasEstimate && (
              <Box mt={2} p={2} bgcolor="background.paper" borderRadius={1}>
                <Typography variant="subtitle2" color="textSecondary">
                  Estimated Gas Fee
                </Typography>
                <Typography variant="h6">
                  {gasEstimate.gwei} GWEI
                  {gasEstimate.usd !== '0.00' && ` (≈ $${gasEstimate.usd})`}
                </Typography>
              </Box>
            )}
          </Box>
        );

      case TransactionSteps.PENDING:
        return (
          <Box textAlign="center" py={3}>
            <CircularProgress size={48} />
            <Typography variant="h6" mt={2}>
              Transaction Pending
            </Typography>
            {txHash && (
              <Link href={getExplorerLink()} target="_blank" rel="noopener">
                View on Explorer
              </Link>
            )}
          </Box>
        );

      case TransactionSteps.CONFIRMED:
        return (
          <Box textAlign="center" py={3}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
            <Typography variant="h6" mt={2}>
              Transaction Confirmed
            </Typography>
            {txHash && (
              <Link href={getExplorerLink()} target="_blank" rel="noopener">
                View on Explorer
              </Link>
            )}
          </Box>
        );

      case TransactionSteps.FAILED:
        return (
          <Box textAlign="center" py={3}>
            <ErrorIcon color="error" sx={{ fontSize: 48 }} />
            <Typography variant="h6" mt={2}>
              Transaction Failed
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={activeStep === TransactionSteps.PENDING}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Confirm</StepLabel>
          </Step>
          <Step>
            <StepLabel>Pending</StepLabel>
          </Step>
          <Step>
            <StepLabel>Complete</StepLabel>
          </Step>
        </Stepper>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        {activeStep === TransactionSteps.INITIAL && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              startIcon={<SendIcon />}
            >
              Confirm
            </Button>
          </>
        )}
        {(activeStep === TransactionSteps.CONFIRMED || activeStep === TransactionSteps.FAILED) && (
          <Button onClick={handleClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransactionHandler; 