import { Web3Provider } from '@ethersproject/providers';
import { formatEther, formatUnits, parseUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';

// Network configurations
const SUPPORTED_NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.REACT_APP_MAINNET_RPC_URL,
    chainId: '0x1',
    currencySymbol: 'ETH',
    blockExplorer: 'https://etherscan.io'
  },
  5: {
    name: 'Goerli Testnet',
    rpcUrl: process.env.REACT_APP_GOERLI_RPC_URL,
    chainId: '0x5',
    currencySymbol: 'ETH',
    blockExplorer: 'https://goerli.etherscan.io'
  }
};

// Cache keys
const CACHE_KEYS = {
  LAST_CONNECTED: 'wallet_last_connected',
  PREFERRED_NETWORK: 'wallet_preferred_network',
  CONNECTION_TYPE: 'wallet_connection_type'
};

class WalletService {
  constructor() {
    this.provider = null;
    this.web3Provider = null;
    this.signer = null;
    this.account = null;
    this.chainId = null;
    this.networkDetails = null;
    this.listeners = new Set();
    this.isConnecting = false;
    this.lastGasEstimate = null;
    this.gasUpdateInterval = null;
  }

  // Initialize wallet service
  async initialize() {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Create providers
      this.provider = window.ethereum;
      this.web3Provider = new Web3Provider(this.provider);
      this.signer = this.web3Provider.getSigner();

      // Setup event listeners
      this._setupEventListeners();

      // Restore previous session if exists
      await this._restoreSession();

      return true;
    } catch (error) {
      console.error('Wallet initialization failed:', error);
      throw error;
    }
  }

  // Connect wallet
  async connect(forceNew = false) {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        // Open MetaMask download page
        window.open('https://metamask.io/download/', '_blank');
        throw new Error('MetaMask not installed. Please install MetaMask to connect your wallet.');
      }
      
      // Clear session if force new connection
      if (forceNew) {
        this._clearSession();
      }

      console.log('Requesting account access from provider...');
      // Request account access
      let accounts;
      try {
        accounts = await this.provider.request({
          method: 'eth_requestAccounts'
        });
      } catch (requestError) {
        // Handle user rejection or other MetaMask errors
        if (requestError.code === 4001) {
          throw new Error('Connection rejected. Please approve the connection request in your wallet.');
        }
        console.error('Account request error:', requestError);
        throw new Error(`Wallet connection failed: ${requestError.message || 'Unknown error'}`);
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please make sure your wallet is unlocked and try again.');
      }

      console.log('Account access granted:', accounts[0]);
      this.account = accounts[0];

      // Get network details
      console.log('Getting network details...');
      const chainId = await this.provider.request({ method: 'eth_chainId' });
      await this._handleNetworkChange(chainId);

      // Cache connection
      this._cacheConnection();

      // Start gas price monitoring
      this._startGasMonitoring();

      // Notify listeners
      this._notifyListeners('connect', {
        account: this.account,
        chainId: this.chainId,
        networkDetails: this.networkDetails
      });

      console.log('Wallet connected successfully');
      return true;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      this._handleError(error);
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  // Disconnect wallet
  async disconnect() {
    try {
      // Clear session
      this._clearSession();

      // Stop gas monitoring
      this._stopGasMonitoring();

      // Reset state
      this.account = null;
      this.chainId = null;
      this.networkDetails = null;

      // Notify listeners
      this._notifyListeners('disconnect');

      return true;
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      this._handleError(error);
      return false;
    }
  }

  // Switch network
  async switchNetwork(targetChainId) {
    try {
      const hexChainId = `0x${Number(targetChainId).toString(16)}`;
      
      try {
        // Try switching to network
        await this.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }]
        });
      } catch (switchError) {
        // If network needs to be added
        if (switchError.code === 4902) {
          await this._addNetwork(targetChainId);
        } else {
          throw switchError;
        }
      }

      // Update network details
      await this._handleNetworkChange(hexChainId);
      return true;
    } catch (error) {
      console.error('Network switch failed:', error);
      this._handleError(error);
      return false;
    }
  }

  // Sign transaction
  async signTransaction(transaction) {
    try {
      // Ensure wallet is connected
      if (!this.account) {
        throw new Error('Wallet not connected');
      }

      // Estimate gas if not provided
      if (!transaction.gasLimit) {
        transaction.gasLimit = await this._estimateGas(transaction);
      }

      // Get current gas price if not provided
      if (!transaction.gasPrice) {
        transaction.gasPrice = await this._getGasPrice();
      }

      // Sign transaction
      const tx = await this.signer.sendTransaction(transaction);

      // Notify listeners of pending transaction
      this._notifyListeners('transactionPending', { hash: tx.hash });

      // Wait for confirmation
      const receipt = await tx.wait();

      // Notify listeners of confirmation
      this._notifyListeners('transactionConfirmed', { receipt });

      return receipt;
    } catch (error) {
      console.error('Transaction signing failed:', error);
      this._handleError(error);
      throw error;
    }
  }

  // Sign message
  async signMessage(message) {
    try {
      if (!this.account) {
        throw new Error('Wallet not connected');
      }

      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Message signing failed:', error);
      this._handleError(error);
      throw error;
    }
  }

  // Get gas price estimate
  async getGasPrice() {
    try {
      const gasPrice = await this._getGasPrice();
      const gasPriceGwei = formatUnits(gasPrice, 'gwei');
      const gasPriceUSD = await this._convertGasToUSD(gasPrice);

      return {
        wei: gasPrice.toString(),
        gwei: parseFloat(gasPriceGwei).toFixed(2),
        usd: gasPriceUSD.toFixed(2)
      };
    } catch (error) {
      console.error('Gas price estimation failed:', error);
      this._handleError(error);
      throw error;
    }
  }

  // Subscribe to wallet events
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Private methods

  // Setup event listeners
  _setupEventListeners() {
    // Account changes
    this.provider.on('accountsChanged', async (accounts) => {
      if (accounts.length === 0) {
        await this.disconnect();
      } else {
        this.account = accounts[0];
        this._notifyListeners('accountChanged', { account: this.account });
      }
    });

    // Network changes
    this.provider.on('chainChanged', async (chainId) => {
      await this._handleNetworkChange(chainId);
    });

    // Connection events
    this.provider.on('connect', ({ chainId }) => {
      this._notifyListeners('connect', {
        account: this.account,
        chainId: this.chainId,
        networkDetails: this.networkDetails
      });
    });

    this.provider.on('disconnect', (error) => {
      this.disconnect();
      this._notifyListeners('error', { message: 'Wallet disconnected', error });
    });
  }

  // Handle network change
  async _handleNetworkChange(chainId) {
    this.chainId = chainId;
    this.networkDetails = SUPPORTED_NETWORKS[parseInt(chainId, 16)];

    // Update provider and signer
    this.web3Provider = new Web3Provider(this.provider);
    this.signer = this.web3Provider.getSigner();

    // Notify listeners
    this._notifyListeners('networkChanged', {
      chainId: this.chainId,
      networkDetails: this.networkDetails
    });
  }

  // Add network to wallet
  async _addNetwork(chainId) {
    const network = SUPPORTED_NETWORKS[chainId];
    if (!network) {
      throw new Error('Unsupported network');
    }

    await this.provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: network.chainId,
        chainName: network.name,
        rpcUrls: [network.rpcUrl],
        nativeCurrency: {
          name: network.currencySymbol,
          symbol: network.currencySymbol,
          decimals: 18
        },
        blockExplorerUrls: [network.blockExplorer]
      }]
    });
  }

  // Estimate gas
  async _estimateGas(transaction) {
    try {
      const estimate = await this.web3Provider.estimateGas(transaction);
      return BigNumber.from(estimate).mul(120).div(100); // Add 20% buffer
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }

  // Get current gas price
  async _getGasPrice() {
    try {
      const feeData = await this.web3Provider.getFeeData();
      return feeData.gasPrice;
    } catch (error) {
      console.error('Failed to get gas price:', error);
      throw error;
    }
  }

  // Convert gas price to USD
  async _convertGasToUSD(gasPrice) {
    try {
      // Implement price feed integration here
      return 0.00; // Placeholder
    } catch (error) {
      console.error('Failed to convert gas to USD:', error);
      return 0.00;
    }
  }

  // Start gas price monitoring
  _startGasMonitoring() {
    if (this.gasUpdateInterval) return;

    this.gasUpdateInterval = setInterval(async () => {
      try {
        const gasPrice = await this.getGasPrice();
        this.lastGasEstimate = gasPrice;
        this._notifyListeners('gasPriceUpdate', { gasPrice });
      } catch (error) {
        console.error('Gas price update failed:', error);
      }
    }, 15000); // Update every 15 seconds
  }

  // Stop gas price monitoring
  _stopGasMonitoring() {
    if (this.gasUpdateInterval) {
      clearInterval(this.gasUpdateInterval);
      this.gasUpdateInterval = null;
    }
  }

  // Cache connection details
  _cacheConnection() {
    localStorage.setItem(CACHE_KEYS.LAST_CONNECTED, this.account);
    localStorage.setItem(CACHE_KEYS.PREFERRED_NETWORK, this.chainId);
  }

  // Clear cached session
  _clearSession() {
    localStorage.removeItem(CACHE_KEYS.LAST_CONNECTED);
    localStorage.removeItem(CACHE_KEYS.PREFERRED_NETWORK);
    localStorage.removeItem(CACHE_KEYS.CONNECTION_TYPE);
  }

  // Restore previous session
  async _restoreSession() {
    const lastConnected = localStorage.getItem(CACHE_KEYS.LAST_CONNECTED);
    const preferredNetwork = localStorage.getItem(CACHE_KEYS.PREFERRED_NETWORK);

    if (lastConnected) {
      try {
        // Check if still connected to MetaMask
        const accounts = await this.provider.request({ method: 'eth_accounts' });
        if (accounts.includes(lastConnected)) {
          await this.connect();
          
          // Switch to preferred network if different
          if (preferredNetwork && preferredNetwork !== this.chainId) {
            await this.switchNetwork(parseInt(preferredNetwork, 16));
          }
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        this._clearSession();
      }
    }
  }

  // Notify event listeners
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Listener notification failed:', error);
      }
    });
  }

  // Handle errors
  _handleError(error) {
    let message = 'An unknown error occurred';

    // MetaMask specific error codes
    if (error.code) {
      switch (error.code) {
        case 4001:
          message = 'User rejected the request';
          break;
        case 4100:
          message = 'Unauthorized request';
          break;
        case 4200:
          message = 'Unsupported method';
          break;
        case 4900:
          message = 'Disconnected from chain';
          break;
        case 4901:
          message = 'Chain not connected';
          break;
        case 4902:
          message = 'Chain not added to wallet';
          break;
      }
    }

    this._notifyListeners('error', {
      message,
      error,
      code: error.code
    });
  }
}

// Create singleton instance
const walletService = new WalletService();

export default walletService; 
 