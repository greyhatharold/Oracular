import { parseUnits } from '@ethersproject/units';

// Load environment variables
const INFURA_KEY = process.env.REACT_APP_INFURA_KEY || '';
const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || '';

export interface ChainConfig {
  name: string;
  isLayer2: boolean;
  gasLimit?: number;
  gasPrice?: string;
  confirmations: number;
  errorMessages: Record<string, string>;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Ethereum Mainnet
  1: {
    name: 'Ethereum',
    isLayer2: false,
    confirmations: 3,
    gasLimit: 500000,
    errorMessages: {
      'insufficient funds': 'Insufficient ETH for gas',
      'gas required exceeds allowance': 'Gas price too high',
    },
    rpcUrls: [
      `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },

  // Polygon
  137: {
    name: 'Polygon',
    isLayer2: true,
    confirmations: 5,
    gasLimit: 2000000,
    gasPrice: parseUnits('50', 'gwei').toString(),
    errorMessages: {
      'insufficient funds': 'Insufficient MATIC for gas',
      'gas required exceeds allowance': 'Gas price too high on Polygon',
    },
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network',
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },

  // Optimism
  10: {
    name: 'Optimism',
    isLayer2: true,
    confirmations: 1,
    gasLimit: 1500000,
    errorMessages: {
      'L1 gas too high': 'L1 data fee too high on Optimism',
      'gas required exceeds allowance': 'Gas estimation failed on Optimism',
    },
    rpcUrls: [
      'https://mainnet.optimism.io',
      `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    ],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },

  // Arbitrum
  42161: {
    name: 'Arbitrum',
    isLayer2: true,
    confirmations: 1,
    gasLimit: 3000000,
    errorMessages: {
      'exceeds L1 gas limit': 'Transaction exceeds L1 gas limit on Arbitrum',
      'gas required exceeds allowance': 'Gas estimation failed on Arbitrum',
    },
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    ],
    blockExplorerUrls: ['https://arbiscan.io'],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },

  // Local Development
  1337: {
    name: 'Local Network',
    isLayer2: false,
    confirmations: 1,
    gasLimit: 6000000,
    gasPrice: parseUnits('1', 'gwei').toString(),
    errorMessages: {},
    rpcUrls: ['http://localhost:8545'],
    blockExplorerUrls: [],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
}; 