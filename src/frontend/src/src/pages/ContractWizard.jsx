import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  TextField,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  Info as InfoIcon,
  PlayArrow as SimulateIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import TimeSeriesChart from '../components/widgetboard/TimeSeriesChart';
import oracleContractService from '../services/oracleContractService';

// Wizard steps configuration
const STEPS = [
  {
    label: 'Basic Configuration',
    description: 'Define core oracle parameters and data sources'
  },
  {
    label: 'Data Sources',
    description: 'Configure data sources and aggregation methods'
  },
  {
    label: 'Update Parameters',
    description: 'Set update frequency and trigger conditions'
  },
  {
    label: 'Security Settings',
    description: 'Configure access controls and security parameters'
  },
  {
    label: 'Simulation',
    description: 'Preview oracle behavior and performance'
  },
  {
    label: 'Deployment',
    description: 'Review and deploy the oracle contract'
  }
];

// Data source types with their configurations
const DATA_SOURCES = {
  API: {
    label: 'REST API',
    fields: ['endpoint', 'method', 'headers', 'responseMapping'],
    description: 'Fetch data from REST APIs with custom endpoint configuration'
  },
  BLOCKCHAIN: {
    label: 'Blockchain Data',
    fields: ['chain', 'contract', 'method', 'params'],
    description: 'Read data from other blockchain contracts'
  },
  COMPUTATION: {
    label: 'Computation',
    fields: ['formula', 'inputs', 'precision'],
    description: 'Perform calculations on input data'
  }
};

// Update frequency options
const UPDATE_FREQUENCIES = [
  { value: 60, label: 'Every minute' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 900, label: 'Every 15 minutes' },
  { value: 3600, label: 'Every hour' },
  { value: 86400, label: 'Every day' }
];

const ContractWizard = () => {
  const theme = useTheme();
  const { account, library } = useWeb3React();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataSources: [],
    updateFrequency: 300,
    minConfirmations: 3,
    maxGasPrice: '',
    accessControl: 'public',
    stakingRequired: false,
    stakingAmount: '0',
    simulationResults: null,
    deploymentStatus: null
  });
  const [errors, setErrors] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);

  // Validation functions
  const validateStep = useCallback((step) => {
    const newErrors = {};
    
    switch (step) {
      case 0:
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.description) newErrors.description = 'Description is required';
        break;
      case 1:
        if (formData.dataSources.length === 0) {
          newErrors.dataSources = 'At least one data source is required';
        }
        break;
      case 2:
        if (!formData.updateFrequency) {
          newErrors.updateFrequency = 'Update frequency is required';
        }
        if (!formData.minConfirmations || formData.minConfirmations < 1) {
          newErrors.minConfirmations = 'Minimum 1 confirmation required';
        }
        break;
      case 3:
        if (formData.stakingRequired && !formData.stakingAmount) {
          newErrors.stakingAmount = 'Staking amount is required when staking is enabled';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle step navigation
  const handleNext = useCallback(async () => {
    if (validateStep(activeStep)) {
      if (activeStep === 4) {
        // Run simulation before proceeding to deployment
        setIsSimulating(true);
        try {
          const results = await oracleContractService.simulateOracle(formData);
          setFormData(prev => ({ ...prev, simulationResults: results }));
        } catch (error) {
          console.error('Simulation failed:', error);
          setErrors(prev => ({ ...prev, simulation: 'Simulation failed: ' + error.message }));
          return;
        } finally {
          setIsSimulating(false);
        }
      }
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep, formData, validateStep]);

  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
  }, []);

  // Handle form updates
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Deployment handler
  const handleDeploy = useCallback(async () => {
    if (!account || !library) {
      setErrors(prev => ({ ...prev, deployment: 'Wallet not connected' }));
      return;
    }

    setIsDeploying(true);
    setDeploymentProgress(0);

    try {
      // Compile contract
      setDeploymentProgress(20);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate compilation time

      // Deploy contract
      setDeploymentProgress(40);
      const contract = await oracleContractService.deployOracle(formData, library.getSigner());
      
      // Wait for confirmation
      setDeploymentProgress(60);
      await contract.deployed();

      // Verify contract
      setDeploymentProgress(80);
      await oracleContractService.verifyContract(contract.address, formData);

      // Complete
      setDeploymentProgress(100);
      setFormData(prev => ({
        ...prev,
        deploymentStatus: {
          success: true,
          address: contract.address,
          txHash: contract.deployTransaction.hash
        }
      }));
    } catch (error) {
      console.error('Deployment failed:', error);
      setErrors(prev => ({ ...prev, deployment: 'Deployment failed: ' + error.message }));
      setFormData(prev => ({
        ...prev,
        deploymentStatus: {
          success: false,
          error: error.message
        }
      }));
    } finally {
      setIsDeploying(false);
    }
  }, [account, library, formData]);

  // Render step content
  const renderStepContent = useCallback(() => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Basic Configuration</Typography>
            <TextField
              fullWidth
              label="Oracle Name"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
            />
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Data Sources</Typography>
            {formData.dataSources.map((source, index) => (
              <Paper key={index} sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Source Type</InputLabel>
                    <Select
                      value={source.type}
                      onChange={(e) => {
                        const newSources = [...formData.dataSources];
                        newSources[index] = { ...source, type: e.target.value };
                        handleFormChange('dataSources', newSources);
                      }}
                    >
                      {Object.entries(DATA_SOURCES).map(([key, { label }]) => (
                        <MenuItem key={key} value={key}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {DATA_SOURCES[source.type].fields.map(field => (
                    <TextField
                      key={field}
                      fullWidth
                      label={field.charAt(0).toUpperCase() + field.slice(1)}
                      value={source[field] || ''}
                      onChange={(e) => {
                        const newSources = [...formData.dataSources];
                        newSources[index] = { ...source, [field]: e.target.value };
                        handleFormChange('dataSources', newSources);
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            ))}
            <Button
              variant="outlined"
              onClick={() => handleFormChange('dataSources', [
                ...formData.dataSources,
                { type: 'API' }
              ])}
            >
              Add Data Source
            </Button>
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Update Parameters</Typography>
            <FormControl fullWidth>
              <InputLabel>Update Frequency</InputLabel>
              <Select
                value={formData.updateFrequency}
                onChange={(e) => handleFormChange('updateFrequency', e.target.value)}
                error={!!errors.updateFrequency}
              >
                {UPDATE_FREQUENCIES.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
              {errors.updateFrequency && (
                <FormHelperText error>{errors.updateFrequency}</FormHelperText>
              )}
            </FormControl>
            <TextField
              type="number"
              label="Minimum Confirmations"
              value={formData.minConfirmations}
              onChange={(e) => handleFormChange('minConfirmations', parseInt(e.target.value))}
              error={!!errors.minConfirmations}
              helperText={errors.minConfirmations}
            />
            <TextField
              label="Maximum Gas Price (Gwei)"
              value={formData.maxGasPrice}
              onChange={(e) => handleFormChange('maxGasPrice', e.target.value)}
              helperText="Leave empty for no limit"
            />
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Security Settings</Typography>
            <FormControl fullWidth>
              <InputLabel>Access Control</InputLabel>
              <Select
                value={formData.accessControl}
                onChange={(e) => handleFormChange('accessControl', e.target.value)}
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="whitelist">Whitelist</MenuItem>
                <MenuItem value="token">Token Holders</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography>Require Staking</Typography>
                <Switch
                  checked={formData.stakingRequired}
                  onChange={(e) => handleFormChange('stakingRequired', e.target.checked)}
                />
              </Stack>
            </FormControl>
            {formData.stakingRequired && (
              <TextField
                label="Staking Amount (ETH)"
                type="number"
                value={formData.stakingAmount}
                onChange={(e) => handleFormChange('stakingAmount', e.target.value)}
                error={!!errors.stakingAmount}
                helperText={errors.stakingAmount}
              />
            )}
          </Stack>
        );

      case 4:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Simulation</Typography>
            {isSimulating ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : formData.simulationResults ? (
              <>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Estimated Performance
                  </Typography>
                  <TimeSeriesChart
                    data={formData.simulationResults.performance}
                    height={200}
                    timeUnit="minute"
                  />
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Cost Analysis
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Estimated Gas per Update</Typography>
                      <Typography>{formData.simulationResults.gasPerUpdate} gas</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Monthly Cost (at 50 Gwei)</Typography>
                      <Typography>{formData.simulationResults.monthlyCost} ETH</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </>
            ) : (
              <Alert severity="info">
                Click Next to run simulation
              </Alert>
            )}
          </Stack>
        );

      case 5:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Deployment</Typography>
            {!formData.deploymentStatus ? (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Review the configuration and click Deploy to proceed
                </Alert>
                <Paper sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1">Configuration Summary</Typography>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Name
                      </Typography>
                      <Typography>{formData.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Data Sources
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {formData.dataSources.map((source, index) => (
                          <Chip
                            key={index}
                            label={DATA_SOURCES[source.type].label}
                            size="small"
                          />
                        ))}
                      </Stack>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Update Frequency
                      </Typography>
                      <Typography>
                        {UPDATE_FREQUENCIES.find(f => f.value === formData.updateFrequency)?.label}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
                {isDeploying && (
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress
                      variant="determinate"
                      value={deploymentProgress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      align="center"
                      sx={{ mt: 1 }}
                    >
                      {deploymentProgress}% Complete
                    </Typography>
                  </Box>
                )}
                {errors.deployment && (
                  <Alert severity="error">{errors.deployment}</Alert>
                )}
              </>
            ) : formData.deploymentStatus.success ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CheckIcon
                  sx={{
                    fontSize: 64,
                    color: 'success.main',
                    mb: 2
                  }}
                />
                <Typography variant="h6" gutterBottom>
                  Deployment Successful!
                </Typography>
                <Typography color="textSecondary" paragraph>
                  Your oracle contract has been deployed and verified
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Contract Address</Typography>
                  <Typography
                    component="code"
                    sx={{
                      display: 'block',
                      bgcolor: 'background.paper',
                      p: 1,
                      borderRadius: 1,
                      mt: 1
                    }}
                  >
                    {formData.deploymentStatus.address}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3 }}
                  onClick={() => window.open(`https://etherscan.io/address/${formData.deploymentStatus.address}`, '_blank')}
                >
                  View on Etherscan
                </Button>
              </Paper>
            ) : (
              <Alert severity="error">
                Deployment failed: {formData.deploymentStatus.error}
              </Alert>
            )}
          </Stack>
        );

      default:
        return null;
    }
  }, [activeStep, formData, errors, isSimulating, isDeploying, deploymentProgress, handleFormChange]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        sx={{
          p: 3,
          background: theme.palette.background.paper,
          backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%)',
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{ mb: 4 }}
        >
          {STEPS.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="body2">{step.label}</Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary' }}
                >
                  {step.description}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 4, mb: 3 }}>
          {renderStepContent()}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<BackIcon />}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleDeploy}
                disabled={isDeploying || formData.deploymentStatus?.success}
                startIcon={isDeploying ? <CircularProgress size={20} /> : <CodeIcon />}
              >
                {isDeploying ? 'Deploying...' : 'Deploy Contract'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<NextIcon />}
                disabled={isSimulating}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ContractWizard; 