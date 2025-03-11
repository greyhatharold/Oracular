import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';

// Network configurations
const SUPPORTED_NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_ID',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://etherscan.io'
  },
  5: {
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_ID',
    nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://goerli.etherscan.io'
  },
  // Add other networks as needed
};

export const NetworkContext = createContext({
  networkDetails: null,
  isSupported: false,
  isConnecting: false,
  error: null,
  switchNetwork: async () => {},
  addNetwork: async () => {},
});

export const NetworkProvider = ({ children }) => {
  const { chainId, library, active } = useWeb3React();
  const [networkDetails, setNetworkDetails] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Update network details when chain changes
  useEffect(() => {
    if (!chainId) {
      setNetworkDetails(null);
      setIsSupported(false);
      return;
    }

    const details = SUPPORTED_NETWORKS[chainId];
    setNetworkDetails(details || null);
    setIsSupported(!!details);
  }, [chainId]);

  // Add network to wallet
  const addNetwork = useCallback(async (targetChainId) => {
    if (!library?.provider?.request) {
      throw new Error('No provider available');
    }

    const network = SUPPORTED_NETWORKS[targetChainId];
    if (!network) {
      throw new Error('Unsupported network');
    }

    setIsConnecting(true);
    setError(null);

    try {
      await library.provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: network.name,
            nativeCurrency: network.nativeCurrency,
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.blockExplorer],
          },
        ],
      });
    } catch (error) {
      setError('Failed to add network');
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [library]);

  // Switch network
  const switchNetwork = useCallback(async (targetChainId) => {
    if (!library?.provider?.request) {
      throw new Error('No provider available');
    }

    setIsConnecting(true);
    setError(null);

    try {
      await library.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await addNetwork(targetChainId);
        } catch (addError) {
          setError('Failed to add network');
          throw addError;
        }
      } else {
        setError('Failed to switch network');
        throw switchError;
      }
    } finally {
      setIsConnecting(false);
    }
  }, [library, addNetwork]);

  // Monitor network connection
  useEffect(() => {
    if (!active || !library) return;

    const handleNetworkChange = (chainId) => {
      // chainId is in hexadecimal
      const numericChainId = parseInt(chainId, 16);
      const details = SUPPORTED_NETWORKS[numericChainId];
      setNetworkDetails(details || null);
      setIsSupported(!!details);
    };

    library.provider.on('chainChanged', handleNetworkChange);
    
    return () => {
      library.provider.removeListener('chainChanged', handleNetworkChange);
    };
  }, [active, library]);

  const value = {
    networkDetails,
    isSupported,
    isConnecting,
    error,
    switchNetwork,
    addNetwork,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}; 