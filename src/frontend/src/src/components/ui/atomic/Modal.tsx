import React from 'react';
import {
  Modal as MuiModal,
  Box,
  IconButton,
  Typography,
  ModalProps as MuiModalProps,
  useTheme,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

type BaseModalProps = Omit<MuiModalProps, 'title' | 'children'>;

interface CustomModalProps extends BaseModalProps {
  title?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string | number;
  fullWidth?: boolean;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const ModalContent = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[5],
  outline: 'none',
  maxHeight: '90vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
}));

const ModalHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ModalBody = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  flexGrow: 1,
}));

export const Modal: React.FC<CustomModalProps> = ({
  open,
  onClose,
  title,
  maxWidth = '600px',
  fullWidth = false,
  children,
  showCloseButton = true,
  ...props
}) => {
  const theme = useTheme();

  return (
    <MuiModal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      {...props}
    >
      <ModalContent
        sx={{
          width: fullWidth ? '90%' : 'auto',
          maxWidth: maxWidth,
          minWidth: theme.spacing(40),
        }}
      >
        {(title || showCloseButton) && (
          <ModalHeader>
            {title && (
              <Typography variant="h6" component="h2" id="modal-title">
                {title}
              </Typography>
            )}
            {showCloseButton && (
              <IconButton
                aria-label="close"
                onClick={onClose}
                size="small"
                sx={{
                  marginLeft: 'auto',
                  color: theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </ModalHeader>
        )}
        <ModalBody>{children}</ModalBody>
      </ModalContent>
    </MuiModal>
  );
};

export default Modal; 