import React, { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useWeb3React } from '@web3-react/core';
import { Contract } from '@ethersproject/contracts';
import { formatUnits, parseUnits } from '@ethersproject/units';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';

// Import ABI and addresses
import { ORACLE_ABI } from '../contracts/abis';
import { ORACLE_ADDRESSES } from '../contracts/addresses';
import { CHAIN_CONFIGS } from '../config/chains';
import { useMonitoring } from '../hooks/useMonitoring';

export const OracleContext = createContext(null);

// Export the hook for consuming the context
export const useOracleContext = () => {
  const context = useContext(OracleContext);
  if (!context) {
    throw new Error('useOracleContext must be used within an OracleProvider');
  }
  return context;
};

export const OracleProvider = ({ children }) => {
  const { library, account, chainId } = useWeb3React();
  const { enqueueSnackbar } = useSnackbar();
  const { recordMetric } = useMonitoring();
  const theme = useTheme();
  
  const [oracles, setOracles] = useState([]);
  const [activeOracle, setActiveOracle] = useState(null);
  const [oracleData, setOracleData] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get chain configuration
  const chainConfig = useMemo(() => {
    return CHAIN_CONFIGS[chainId] || null;
  }, [chainId]);

  // Memoize contract instances with network-specific configurations
  const contracts = useMemo(() => {
    if (!library || !chainId || !ORACLE_ADDRESSES[chainId]) return {};
    
    // Handle case where ORACLE_ADDRESSES[chainId] is a single address string, not an array
    const addresses = Array.isArray(ORACLE_ADDRESSES[chainId]) 
      ? ORACLE_ADDRESSES[chainId] 
      : [ORACLE_ADDRESSES[chainId]];
    
    return addresses.reduce((acc, address) => {
      const contract = new Contract(address, ORACLE_ABI, library.getSigner());
      
      // Add network-specific overrides
      if (chainConfig?.gasLimit) {
        contract.connect(library.getSigner().connectUnchecked());
      }
      
      acc[address] = contract;
      return acc;
    }, {});
  }, [library, chainId, chainConfig]);

  // Error handling utility
  const handleError = useCallback((error, context) => {
    console.error(`${context}:`, error);
    
    let errorMessage = 'An unexpected error occurred';
    
    // Network-specific error handling
    if (chainConfig?.errorMessages) {
      for (const [pattern, message] of Object.entries(chainConfig.errorMessages)) {
        if (error.message?.toLowerCase().includes(pattern.toLowerCase())) {
          errorMessage = message;
          break;
        }
      }
    }
    
    // Record error metric
    recordMetric('oracle_error', 1, {
      context,
      error_type: error.name,
      chain_id: chainId,
    });
    
    setError(errorMessage);
    enqueueSnackbar(errorMessage, { variant: 'error' });
    
    return errorMessage;
  }, [chainId, chainConfig, enqueueSnackbar, recordMetric]);

  // Mock data for development
  const MOCK_ORACLES = [
    {
      name: "ETH/USD Price Feed",
      address: "0x1234567890123456789012345678901234567890",
      symbol: "ETH/USD",
      decimals: 8,
      description: "Ethereum price in USD",
      type: "price"
    },
    {
      name: "BTC/USD Price Feed",
      address: "0x0987654321098765432109876543210987654321",
      symbol: "BTC/USD",
      decimals: 8,
      description: "Bitcoin price in USD",
      type: "price"
    }
  ];

  // Fetch all oracle contracts with network-specific data
  const fetchOracles = useCallback(async () => {
    if (!library || !chainId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      let oracleList;
      
      try {
        const response = await fetch('/api/oracles');
        
        // Check if response is OK and is JSON before parsing
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}: ${response.statusText}`);
        }
        
        // Check content type to ensure it's JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
        }
        
        oracleList = await response.json();
      } catch (apiError) {
        // In development mode, use mock data as fallback
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock oracle data due to API error:', apiError.message);
          oracleList = MOCK_ORACLES;
        } else {
          // In production, rethrow the error
          throw apiError;
        }
      }
      
      const oracleData = await Promise.all(
        oracleList.map(async (oracle) => {
          const contract = contracts[oracle.address];
          if (!contract) return null;
          
          try {
            const [
              latestValue,
              lastUpdate,
              updateCount,
              reputation,
              dataSources,
            ] = await Promise.all([
              contract.getLatestValue(),
              contract.lastUpdateTime(),
              contract.updateCount(),
              contract.getReputationScore(),
              contract.getDataSources(),
            ]);

            return {
              ...oracle,
              latestValue: formatUnits(latestValue, oracle.decimals),
              lastUpdate: new Date(lastUpdate.toNumber() * 1000),
              updateCount: updateCount.toNumber(),
              reputation: reputation.toNumber() / 100,
              dataSources: dataSources.length,
              chainId,
              networkName: chainConfig?.name || 'Unknown Network',
            };
          } catch (err) {
            handleError(err, `Failed to fetch oracle ${oracle.address} data`);
            return null;
          }
        })
      );

      const validOracles = oracleData.filter(Boolean);
      setOracles(validOracles);
      
      // Record metrics
      recordMetric('oracles_fetch_duration', Date.now() - startTime, { chainId });
      recordMetric('active_oracles', validOracles.length, { chainId });
      
    } catch (err) {
      handleError(err, 'Failed to fetch oracles');
    } finally {
      setIsLoading(false);
    }
  }, [library, chainId, contracts, chainConfig, handleError, recordMetric]);

  // Update data for active oracle with enhanced monitoring
  const updateOracleData = useCallback(async () => {
    if (!activeOracle || !contracts[activeOracle.address]) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      const contract = contracts[activeOracle.address];
      
      // Fetch detailed oracle data
      const [
        value,
        timestamp,
        numSources,
        minResponses,
        updateInterval,
        deviation,
        confidence,
        validationRules,
      ] = await Promise.all([
        contract.getLatestValue(),
        contract.lastUpdateTime(),
        contract.activeSourceCount(),
        contract.minResponses(),
        contract.updateInterval(),
        contract.deviationThreshold(),
        contract.getConfidenceScore(),
        contract.getValidationRules(),
      ]);

      const data = {
        value: formatUnits(value, activeOracle.decimals),
        timestamp: new Date(timestamp.toNumber() * 1000),
        numSources: numSources.toNumber(),
        minResponses: minResponses.toNumber(),
        updateInterval: updateInterval.toNumber(),
        deviation: deviation.toNumber() / 100,
        confidence: confidence.toNumber() / 100,
        validationRules,
        chainId,
        networkName: chainConfig?.name || 'Unknown Network',
      };

      setOracleData(data);
      
      // Record metrics
      recordMetric('oracle_update_duration', Date.now() - startTime, {
        oracle_address: activeOracle.address,
        chainId,
      });
      recordMetric('oracle_confidence', data.confidence, {
        oracle_address: activeOracle.address,
        chainId,
      });
      
    } catch (err) {
      handleError(err, 'Failed to update oracle data');
    } finally {
      setIsLoading(false);
    }
  }, [activeOracle, contracts, chainId, chainConfig, handleError, recordMetric]);

  // Submit oracle update with network-specific handling
  const submitOracleUpdate = useCallback(async (value) => {
    if (!activeOracle || !contracts[activeOracle.address] || !account) {
      throw new Error('Oracle not selected or wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const contract = contracts[activeOracle.address];
      const valueInWei = parseUnits(value.toString(), activeOracle.decimals);
      
      // Add network-specific transaction options
      const txOptions = {
        gasLimit: chainConfig?.gasLimit,
        gasPrice: chainConfig?.gasPrice,
      };
      
      // Submit update transaction
      const tx = await contract.submitValue(valueInWei, txOptions);
      
      // Show pending notification
      enqueueSnackbar('Oracle update submitted', { 
        variant: 'info',
        autoHideDuration: null,
        persist: true,
      });
      
      // Wait for confirmation with network-specific blocks
      const receipt = await tx.wait(chainConfig?.confirmations || 1);
      
      // Record success metrics
      recordMetric('oracle_update_success', 1, {
        oracle_address: activeOracle.address,
        duration: Date.now() - startTime,
        chainId,
      });
      
      // Show success notification
      enqueueSnackbar('Oracle update confirmed', { variant: 'success' });
      
      // Refresh oracle data
      await updateOracleData();
      
    } catch (err) {
      handleError(err, 'Failed to submit oracle update');
    } finally {
      setIsLoading(false);
    }
  }, [
    activeOracle,
    contracts,
    account,
    chainConfig,
    enqueueSnackbar,
    updateOracleData,
    handleError,
    recordMetric,
    chainId
  ]);

  // Validate data source
  const validateDataSource = useCallback(async (sourceData) => {
    if (!activeOracle || !contracts[activeOracle.address]) {
      throw new Error('Oracle not selected');
    }

    try {
      const contract = contracts[activeOracle.address];
      const isValid = await contract.validateDataSource(sourceData);
      
      recordMetric('data_source_validation', 1, {
        oracle_address: activeOracle.address,
        chainId,
        result: isValid ? 'valid' : 'invalid',
      });
      
      return isValid;
    } catch (err) {
      handleError(err, 'Failed to validate data source');
      return false;
    }
  }, [activeOracle, contracts, chainId, handleError, recordMetric]);

  // Get network statistics
  const getNetworkStats = useCallback(async () => {
    if (!chainId || !chainConfig) return;
    
    try {
      const response = await fetch(`/api/network-stats/${chainId}`);
      const stats = await response.json();
      
      setNetworkStats({
        ...stats,
        networkName: chainConfig.name,
        isLayer2: chainConfig.isLayer2,
        gasPrice: chainConfig.gasPrice,
      });
      
      recordMetric('network_stats_fetch', 1, { chainId });
    } catch (err) {
      handleError(err, 'Failed to fetch network stats');
    }
  }, [chainId, chainConfig, handleError, recordMetric]);

  // Subscribe to oracle events with enhanced error handling
  useEffect(() => {
    if (!activeOracle || !contracts[activeOracle.address]) return;

    const contract = contracts[activeOracle.address];
    const filters = [
      contract.filters.ValueUpdated(),
      contract.filters.DataSourceAdded(),
      contract.filters.DataSourceRemoved(),
      contract.filters.ValidationRuleUpdated(),
    ];
    
    const handleEvent = async (eventName, ...args) => {
      try {
        await updateOracleData();
        recordMetric('oracle_event', 1, {
          oracle_address: activeOracle.address,
          chainId,
          event_name: eventName,
        });
      } catch (err) {
        handleError(err, `Failed to handle ${eventName} event`);
      }
    };

    filters.forEach(filter => {
      contract.on(filter, (...args) => handleEvent(filter.eventName, ...args));
    });

    return () => {
      filters.forEach(filter => {
        contract.off(filter, (...args) => handleEvent(filter.eventName, ...args));
      });
    };
  }, [activeOracle, contracts, chainId, updateOracleData, handleError, recordMetric]);

  // Initial load
  useEffect(() => {
    fetchOracles();
    getNetworkStats();
  }, [fetchOracles, getNetworkStats]);

  // Format metrics data for time series charts
  const formatMetricsForChart = useCallback((metricsData) => {
    if (!metricsData) return { datasets: [] };
    
    // If the data already has a datasets property, it's already in the right format
    if (metricsData.datasets) return metricsData;
    
    // Create performanceData if it doesn't exist
    const performanceData = metricsData.performanceData || [];
    
    // Create proper datasets structure for TimeSeriesChart
    const chartData = {
      datasets: [
        {
          label: 'Oracle Performance',
          data: performanceData,
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.main,
        }
      ]
    };
    
    // If there's latency data, add it as another dataset
    if (metricsData.networkLatency) {
      // Create historical latency data points if they don't exist
      const latencyData = metricsData.latencyData || Array(24).fill(0).map((_, i) => ({
        x: Date.now() - (24 - i) * 3600000,
        y: Math.max(200, metricsData.networkLatency + (Math.random() > 0.5 ? 20 : -20) * i)
      }));
      
      chartData.datasets.push({
        label: 'Network Latency (ms)',
        data: latencyData,
        borderColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.secondary.main,
        borderDash: [5, 5]
      });
    }
    
    return chartData;
  }, [theme]);

  const value = {
    oracles,
    activeOracle,
    oracleData,
    networkStats,
    isLoading,
    error,
    fetchOracles,
    setActiveOracle,
    updateOracleData,
    submitOracleUpdate,
    validateDataSource,
    getNetworkStats,
    formatMetricsForChart,
  };

  return (
    <OracleContext.Provider value={value}>
      {children}
    </OracleContext.Provider>
  );
}; 