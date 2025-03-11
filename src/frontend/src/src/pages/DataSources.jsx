import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  TextField,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  OutlinedInput,
  FormHelperText,
  Slide,
  useMediaQuery,
  Grow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';

// Transition component for dialog
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const DataSources = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State management
  const [dataSources, setDataSources] = useState([
    { id: 1, name: 'Chainlink Price Feed', endpoint: 'https://api.chain.link/feeds/eth-usd' },
    { id: 2, name: 'CoinGecko API', endpoint: 'https://api.coingecko.com/api/v3/simple/price' },
  ]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', endpoint: '' });
  const [errors, setErrors] = useState({ name: '', endpoint: '' });

  // Dialog handlers
  const handleOpenDialog = useCallback(() => setOpenDialog(true), []);
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setNewSource({ name: '', endpoint: '' });
    setErrors({ name: '', endpoint: '' });
  }, []);

  // Form handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewSource(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = { name: '', endpoint: '' };
    let isValid = true;

    if (!newSource.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    if (!newSource.endpoint.trim()) {
      newErrors.endpoint = 'Endpoint URL is required';
      isValid = false;
    } else if (!newSource.endpoint.startsWith('http')) {
      newErrors.endpoint = 'Please enter a valid URL';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [newSource]);

  const handleAddSource = useCallback(() => {
    if (validateForm()) {
      setDataSources(prev => [
        ...prev,
        {
          id: Date.now(),
          name: newSource.name,
          endpoint: newSource.endpoint,
        },
      ]);
      handleCloseDialog();
    }
  }, [newSource, validateForm, handleCloseDialog]);

  return (
    <Box 
      sx={{ 
        p: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        minHeight: '100%',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(103, 116, 255, 0.08) 0%, rgba(30, 39, 97, 0.04) 100%)',
          pointerEvents: 'none',
          borderRadius: theme.shape.borderRadius,
        }
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4,
          position: 'relative',
          zIndex: 1,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: 2,
        }}
      >
        <Typography 
          variant="h4" 
          sx={{
            background: 'linear-gradient(45deg, #6774FF, #94A0FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: 0,
              width: '60%',
              height: 2,
              background: 'linear-gradient(90deg, rgba(103, 116, 255, 0.3), transparent)',
              borderRadius: '2px',
            }
          }}
        >
          Data Sources
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{
            background: 'linear-gradient(45deg, rgba(103, 116, 255, 0.8), rgba(148, 160, 255, 0.8))',
            backdropFilter: 'blur(8px)',
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 20px rgba(103, 116, 255, 0.15)',
            borderRadius: '12px',
            px: 3,
            '&:hover': {
              background: 'linear-gradient(45deg, rgba(103, 116, 255, 0.9), rgba(148, 160, 255, 0.9))',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 25px rgba(103, 116, 255, 0.2)',
            },
            '&:active': {
              transform: 'translateY(0)',
            }
          }}
        >
          Add New Data Source
        </Button>
      </Box>

      <Grid container spacing={3}>
        {dataSources.map((source, index) => (
          <Grid item xs={12} md={6} key={source.id}>
            <Grow in timeout={300 + index * 100}>
              <Card
                sx={{
                  background: alpha(theme.palette.background.paper, 0.6),
                  backdropFilter: 'blur(10px)',
                  border: '1px solid',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  boxShadow: '0 4px 30px rgba(103, 116, 255, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 40px rgba(103, 116, 255, 0.15)',
                    '&::before': {
                      opacity: 1,
                    }
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #6774FF, #94A0FF)',
                    opacity: 0.5,
                    transition: 'opacity 0.3s ease-in-out',
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LinkIcon sx={{ 
                      mr: 1.5, 
                      color: alpha(theme.palette.primary.main, 0.7),
                      fontSize: 20 
                    }} />
                    <Typography 
                      variant="h6" 
                      sx={{
                        fontWeight: 600,
                        color: alpha(theme.palette.text.primary, 0.9),
                        flex: 1,
                      }}
                    >
                      {source.name}
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    label="Endpoint"
                    value={source.endpoint}
                    variant="outlined"
                    margin="normal"
                    InputProps={{
                      readOnly: true,
                      sx: {
                        background: alpha(theme.palette.background.paper, 0.4),
                        backdropFilter: 'blur(4px)',
                        borderRadius: '12px',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(theme.palette.divider, 0.2),
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                        },
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }
                      }
                    }}
                  />
                  <Box sx={{ 
                    mt: 2, 
                    display: 'flex', 
                    gap: 1,
                    justifyContent: 'flex-end' 
                  }}>
                    <Tooltip title="Edit Source">
                      <IconButton 
                        size="small"
                        sx={{
                          background: alpha(theme.palette.primary.main, 0.1),
                          backdropFilter: 'blur(4px)',
                          '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.2),
                            transform: 'translateY(-1px)',
                          }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Source">
                      <IconButton 
                        size="small"
                        sx={{
                          background: alpha(theme.palette.error.main, 0.1),
                          backdropFilter: 'blur(4px)',
                          '&:hover': {
                            background: alpha(theme.palette.error.main, 0.2),
                            transform: 'translateY(-1px)',
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        ))}
      </Grid>

      {/* Add New Data Source Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        TransitionComponent={Transition}
        fullScreen={fullScreen}
        PaperProps={{
          sx: {
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            minWidth: { sm: '500px' },
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(45deg, rgba(103, 116, 255, 0.05), rgba(148, 160, 255, 0.05))',
          borderBottom: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          py: 2,
        }}>
          Add New Data Source
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <FormControl fullWidth error={!!errors.name} sx={{ mb: 3 }}>
            <InputLabel htmlFor="name">Name</InputLabel>
            <OutlinedInput
              id="name"
              name="name"
              value={newSource.name}
              onChange={handleInputChange}
              label="Name"
              placeholder="Enter data source name"
              sx={{
                borderRadius: '12px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.divider, 0.2),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
              }}
            />
            {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
          </FormControl>
          <FormControl fullWidth error={!!errors.endpoint}>
            <InputLabel htmlFor="endpoint">Endpoint URL</InputLabel>
            <OutlinedInput
              id="endpoint"
              name="endpoint"
              value={newSource.endpoint}
              onChange={handleInputChange}
              label="Endpoint URL"
              placeholder="https://api.example.com/endpoint"
              sx={{
                borderRadius: '12px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.divider, 0.2),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
              }}
            />
            {errors.endpoint && <FormHelperText>{errors.endpoint}</FormHelperText>}
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2.5, 
          background: 'linear-gradient(45deg, rgba(103, 116, 255, 0.05), rgba(148, 160, 255, 0.05))',
          borderTop: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: alpha(theme.palette.divider, 0.2),
              color: alpha(theme.palette.text.primary, 0.7),
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
                background: alpha(theme.palette.primary.main, 0.05),
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddSource}
            variant="contained"
            sx={{
              ml: 2,
              borderRadius: '10px',
              background: 'linear-gradient(45deg, rgba(103, 116, 255, 0.8), rgba(148, 160, 255, 0.8))',
              boxShadow: '0 4px 20px rgba(103, 116, 255, 0.15)',
              '&:hover': {
                background: 'linear-gradient(45deg, rgba(103, 116, 255, 0.9), rgba(148, 160, 255, 0.9))',
              }
            }}
          >
            Add Source
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataSources; 