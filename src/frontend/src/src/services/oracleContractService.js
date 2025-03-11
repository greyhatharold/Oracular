import { ethers, formatUnits, formatEther } from 'ethers';
import { ORACLE_ABI } from '../contracts/abis';
import { ORACLE_ADDRESSES } from '../contracts/addresses';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

class OracleContractService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contracts = {};
        this.eventSubscriptions = new Map();
        this.cache = new Map();
        this.networkConfig = null;
    }

    // Initialize service with provider and network configuration
    async initialize(provider, networkConfig) {
        this.provider = provider;
        this.signer = provider.getSigner();
        this.networkConfig = networkConfig;

        // Initialize contract instances for the current network
        const chainId = await this.provider.getNetwork().then(net => net.chainId);
        if (ORACLE_ADDRESSES[chainId]) {
            this.contracts = ORACLE_ADDRESSES[chainId].reduce((acc, address) => {
                acc[address] = new ethers.Contract(address, ORACLE_ABI, this.signer);
                return acc;
            }, {});
        }

        // Setup event listeners
        this._setupEventListeners();
    }

    // Clean up subscriptions and cache
    cleanup() {
        this.eventSubscriptions.forEach(subscription => subscription.unsubscribe());
        this.eventSubscriptions.clear();
        this.cache.clear();
    }

    // Get oracle state with caching
    async getOracleState(address) {
        const cacheKey = `state_${address}`;
        const cached = this._getFromCache(cacheKey);
        if (cached) return cached;

        const contract = this._getContract(address);
        const [
            latestValue,
            lastUpdate,
            updateCount,
            minResponses,
            updateInterval,
            deviation
        ] = await Promise.all([
            contract.getLatestValue(),
            contract.lastUpdateTime(),
            contract.updateCount(),
            contract.minResponses(),
            contract.updateInterval(),
            contract.deviationThreshold()
        ]);

        const state = {
            value: formatUnits(latestValue, 18),
            lastUpdate: new Date(Number(lastUpdate) * 1000),
            updateCount: Number(updateCount),
            minResponses: Number(minResponses),
            updateInterval: Number(updateInterval),
            deviation: Number(deviation) / 100
        };

        this._setCache(cacheKey, state);
        return state;
    }

    // Submit data request with retry logic
    async submitDataRequest(address, requestParams) {
        const contract = this._getContract(address);
        const gasEstimate = await this._estimateGas(
            contract,
            'submitRequest',
            [requestParams]
        );

        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
                const tx = await contract.submitRequest(requestParams, {
                    gasLimit: Math.ceil(gasEstimate * 1.2),
                    maxFeePerGas: await this._getOptimalGasPrice()
                });
                
                const receipt = await this._waitForTransaction(tx);
                return {
                    transactionHash: receipt.transactionHash,
                    requestId: this._extractRequestId(receipt)
                };
            } catch (error) {
                if (attempt === RETRY_ATTEMPTS) throw error;
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
            }
        }
    }

    // Monitor request status
    async getRequestStatus(address, requestId) {
        const contract = this._getContract(address);
        const status = await contract.getRequestStatus(requestId);
        return this._normalizeRequestStatus(status);
    }

    // Get historical data feed
    async getHistoricalData(address, startBlock, endBlock) {
        const contract = this._getContract(address);
        const events = await contract.queryFilter(
            contract.filters.ValueUpdated(),
            startBlock,
            endBlock
        );

        return events.map(event => ({
            timestamp: new Date(Number(event.args.timestamp) * 1000),
            value: formatUnits(event.args.value, 18),
            source: event.args.source,
            transactionHash: event.transactionHash
        }));
    }

    // Subscribe to oracle events
    subscribeToEvents(address, eventName, callback) {
        const contract = this._getContract(address);
        const filter = contract.filters[eventName]();
        
        const subscription = contract.on(filter, (...args) => {
            const normalizedEvent = this._normalizeEvent(eventName, args);
            callback(normalizedEvent);
        });

        const key = `${address}_${eventName}`;
        this.eventSubscriptions.set(key, subscription);
        
        return () => {
            contract.off(filter);
            this.eventSubscriptions.delete(key);
        };
    }

    // Calculate service cost estimate
    async calculateCostEstimate(address, requestParams) {
        const contract = this._getContract(address);
        const [baseFee, complexityMultiplier, sourceCount] = await Promise.all([
            contract.getBaseFee(),
            contract.getComplexityMultiplier(),
            contract.getSourceCount()
        ]);

        const estimatedGas = await this._estimateGas(
            contract,
            'submitRequest',
            [requestParams]
        );

        const gasPrice = await this._getOptimalGasPrice();
        const gasCost = estimatedGas * gasPrice;

        return {
            baseFee: formatEther(baseFee),
            complexityFee: formatEther(
                (baseFee * complexityMultiplier) / 100n
            ),
            gasCost: formatEther(gasCost),
            totalCost: formatEther(
                baseFee + gasCost * sourceCount
            )
        };
    }

    // Private helper methods
    _getContract(address) {
        const contract = this.contracts[address];
        if (!contract) {
            throw new Error(`No contract instance for address: ${address}`);
        }
        return contract;
    }

    async _estimateGas(contract, method, params) {
        try {
            return await contract.estimateGas[method](...params);
        } catch (error) {
            throw new Error(`Gas estimation failed: ${error.message}`);
        }
    }

    async _getOptimalGasPrice() {
        const feeData = await this.provider.getFeeData();
        return feeData.maxFeePerGas || feeData.gasPrice;
    }

    async _waitForTransaction(tx) {
        const receipt = await tx.wait(this.networkConfig.requiredConfirmations);
        if (!receipt.status) {
            throw new Error('Transaction failed');
        }
        return receipt;
    }

    _extractRequestId(receipt) {
        const event = receipt.events.find(e => e.event === 'RequestSubmitted');
        return event ? event.args.requestId : null;
    }

    _normalizeRequestStatus(status) {
        return {
            isCompleted: status.completed,
            value: status.value ? formatUnits(status.value, 18) : null,
            timestamp: status.timestamp ? new Date(Number(status.timestamp) * 1000) : null,
            error: status.error
        };
    }

    _normalizeEvent(eventName, args) {
        const event = args[args.length - 1];
        const values = { ...event.args };
        
        // Convert BigInt values to strings/numbers
        for (const key in values) {
            if (typeof values[key] === 'bigint') {
                values[key] = values[key].toString();
            }
        }

        return {
            eventName,
            values,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: new Date()
        };
    }

    _setupEventListeners() {
        // Network change handling
        this.provider.on('network', (newNetwork, oldNetwork) => {
            if (oldNetwork) {
                this.cleanup();
                this.initialize(this.provider, this.networkConfig);
            }
        });

        // Handle provider disconnection
        this.provider.on('disconnect', () => {
            this.cleanup();
        });
    }

    _getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
        return null;
    }

    _setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Simulate oracle performance for contract wizard
    async simulateOracle(formData) {
        // This is a simulation, so we're just generating mock data
        // In a real implementation, this would run advanced simulations based on formData

        // Generate simulated performance data for TimeSeriesChart
        const performance = {
            datasets: [
                {
                    label: 'Response Time (ms)',
                    data: Array(24).fill(0).map((_, i) => ({
                        x: Date.now() - (24 - i) * 3600000,
                        y: 200 + Math.random() * 100
                    })),
                    borderColor: '#3f51b5',
                    backgroundColor: '#3f51b5',
                }
            ]
        };

        return {
            performance,
            gasPerUpdate: Math.floor(100000 + Math.random() * 50000),
            monthlyCost: (0.05 + Math.random() * 0.1).toFixed(4)
        };
    }
}

// Create singleton instance
const oracleContractService = new OracleContractService();
export default oracleContractService; 