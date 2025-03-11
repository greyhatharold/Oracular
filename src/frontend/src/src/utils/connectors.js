import { InjectedConnector } from '@web3-react/injected-connector';

// Configure supported chain IDs
const supportedChainIds = [
  1, // Mainnet
  3, // Ropsten
  4, // Rinkeby
  5, // Goerli
  42, // Kovan
  1337, // Local chain
  31337, // Hardhat
];

// Create injected connector instance
export const injected = new InjectedConnector({
  supportedChainIds,
}); 