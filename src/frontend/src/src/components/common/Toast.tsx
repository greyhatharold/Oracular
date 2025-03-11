import React from 'react';
import { Snackbar, Alert, AlertProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface ToastProps {
  open: boolean;
  message: string;
  severity?: AlertProps['severity'];
  autoHideDuration?: number;
  onClose: () => void;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

const StyledAlert = styled(Alert)(({ theme }) => ({
  width: '100%',
  boxShadow: theme.shadows[3],
}));

export const Toast: React.FC<ToastProps> = ({
  open,
  message,
  severity = 'info',
  autoHideDuration = 6000,
  onClose,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
    >
      <StyledAlert
        onClose={onClose}
        severity={severity}
        variant="filled"
        elevation={6}
      >
        {message}
      </StyledAlert>
    </Snackbar>
  );
};

export default Toast; 