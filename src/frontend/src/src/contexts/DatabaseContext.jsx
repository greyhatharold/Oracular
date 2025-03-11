import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

// Type definitions
const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

const DatabaseContext = createContext(null);

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Base API request handler with error handling
  const apiRequest = useCallback(async (method, endpoint, data = null) => {
    setLoading(true);
    setError(null);
    try {
      const config = {
        method,
        url: `/api/database/${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        ...(data && { data }),
        validateStatus: status => status < 500, // Don't reject on non-500 errors
      };

      const response = await axios(config);
      
      // Check if response has the expected content type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but received: ${contentType || 'unknown'}`);
      }
      
      // Check for error status codes
      if (response.status >= 400) {
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                         err.response?.statusText || 
                         err.message || 
                         'Unknown error occurred';
      setError(errorMessage);
      console.error(`API Request failed (${endpoint}):`, errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Database health check
  const checkDatabaseHealth = useCallback(async () => {
    try {
      const response = await apiRequest('get', 'health');
      setIsConnected(response.status === 'healthy');
      return response;
    } catch (err) {
      setIsConnected(false);
      throw err;
    }
  }, [apiRequest]);

  // Schema operations
  const getDatabaseSchema = useCallback(async () => {
    return await apiRequest('get', 'schema');
  }, [apiRequest]);

  // Statistics operations
  const getDatabaseStats = useCallback(async () => {
    return await apiRequest('get', 'stats');
  }, [apiRequest]);

  // Repository operations
  const repositories = {
    users: {
      getAll: async () => await apiRequest('get', 'users'),
      getById: async (id) => await apiRequest('get', `users/${id}`),
      create: async (data) => await apiRequest('post', 'users', data),
      update: async (id, data) => await apiRequest('put', `users/${id}`, data),
      delete: async (id) => await apiRequest('delete', `users/${id}`),
      getByUsername: async (username) => await apiRequest('get', `users/username/${username}`),
      getActive: async () => await apiRequest('get', 'users/active'),
      getByRole: async (role) => await apiRequest('get', `users/role/${role}`),
    },

    oracles: {
      getAll: async () => await apiRequest('get', 'oracles'),
      getById: async (id) => await apiRequest('get', `oracles/${id}`),
      create: async (data) => await apiRequest('post', 'oracles', data),
      update: async (id, data) => await apiRequest('put', `oracles/${id}`, data),
      delete: async (id) => await apiRequest('delete', `oracles/${id}`),
      getActive: async () => await apiRequest('get', 'oracles/active'),
      getByContract: async (address) => await apiRequest('get', `oracles/contract/${address}`),
      getWithDataSources: async (id) => await apiRequest('get', `oracles/${id}/data-sources`),
    },

    dataSources: {
      getAll: async () => await apiRequest('get', 'data-sources'),
      getById: async (id) => await apiRequest('get', `data-sources/${id}`),
      create: async (data) => await apiRequest('post', 'data-sources', data),
      update: async (id, data) => await apiRequest('put', `data-sources/${id}`, data),
      delete: async (id) => await apiRequest('delete', `data-sources/${id}`),
      getByType: async (type) => await apiRequest('get', `data-sources/type/${type}`),
      getActiveByType: async (type) => await apiRequest('get', `data-sources/type/${type}/active`),
    },

    tasks: {
      getAll: async () => await apiRequest('get', 'tasks'),
      getById: async (id) => await apiRequest('get', `tasks/${id}`),
      create: async (data) => await apiRequest('post', 'tasks', data),
      update: async (id, data) => await apiRequest('put', `tasks/${id}`, data),
      delete: async (id) => await apiRequest('delete', `tasks/${id}`),
      getPending: async () => await apiRequest('get', 'tasks/pending'),
      getByType: async (type) => await apiRequest('get', `tasks/type/${type}`),
      getScheduled: async () => await apiRequest('get', 'tasks/scheduled'),
    },

    alerts: {
      getAll: async () => await apiRequest('get', 'alerts'),
      getById: async (id) => await apiRequest('get', `alerts/${id}`),
      create: async (data) => await apiRequest('post', 'alerts', data),
      update: async (id, data) => await apiRequest('put', `alerts/${id}`, data),
      delete: async (id) => await apiRequest('delete', `alerts/${id}`),
      getUnread: async (userId) => await apiRequest('get', `alerts/unread/${userId}`),
    },

    metrics: {
      getAll: async () => await apiRequest('get', 'metrics'),
      getByName: async (name, timeRange) => await apiRequest('get', `metrics/${name}`, { timeRange }),
      create: async (data) => await apiRequest('post', 'metrics', data),
    },

    validationRules: {
      getAll: async () => await apiRequest('get', 'validation-rules'),
      getById: async (id) => await apiRequest('get', `validation-rules/${id}`),
      create: async (data) => await apiRequest('post', 'validation-rules', data),
      update: async (id, data) => await apiRequest('put', `validation-rules/${id}`, data),
      delete: async (id) => await apiRequest('delete', `validation-rules/${id}`),
      getByOracle: async (oracleId) => await apiRequest('get', `validation-rules/oracle/${oracleId}`),
    },

    auditLogs: {
      getAll: async (params) => await apiRequest('get', 'audit-logs', params),
      getByUser: async (userId) => await apiRequest('get', `audit-logs/user/${userId}`),
      getByAction: async (action) => await apiRequest('get', `audit-logs/action/${action}`),
    },
  };

  // Database maintenance operations
  const maintenance = {
    vacuum: async (tableName = null) => {
      return await apiRequest('post', `vacuum${tableName ? `/${tableName}` : ''}`);
    },
    optimize: async () => {
      return await apiRequest('post', 'optimize');
    },
  };

  const value = {
    isConnected,
    error,
    loading,
    checkDatabaseHealth,
    getDatabaseSchema,
    getDatabaseStats,
    maintenance,
    ...repositories,
    TaskStatus,
    AlertSeverity,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export default DatabaseContext; 