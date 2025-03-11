import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { SnackbarProvider } from 'notistack';
import HealthDashboard from './components/health/HealthDashboard';
import { NAV_ITEMS } from './components/navigation/Sidebar';

// Context Providers
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { OracleProvider } from './contexts/OracleContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { DatabaseProvider } from './contexts/DatabaseContext';

// Theme and Layout
import { AppThemeProvider } from './styles/ThemeProvider';
import MainLayout from './layouts/MainLayout';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './pages/Login';

// Pages (lazy loaded)
const OracleManagement = React.lazy(() => import('./pages/OracleManagement'));
const DataSources = React.lazy(() => import('./pages/DataSources'));
const Validation = React.lazy(() => import('./pages/Validation'));
const Monitoring = React.lazy(() => import('./pages/Monitoring'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Oracle = React.lazy(() => import('./pages/Oracle'));
const Widgetboard = React.lazy(() => import('./pages/Widgetboard'));

// Web3 initialization function
const getLibrary = (provider) => {
  const library = new Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = React.useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Widgetboard');

  // Update page title based on route
  const location = useLocation();
  useEffect(() => {
    const currentRoute = NAV_ITEMS.find(item => item.path === location.pathname);
    if (currentRoute) {
      setPageTitle(currentRoute.label);
    }
  }, [location.pathname]);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate loading time for demonstration purposes
        setTimeout(() => {
          setIsInitialized(true);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Custom Snackbar styling
  const notistackRef = React.createRef();
  const onClickDismiss = (key) => () => {
    notistackRef.current.closeSnackbar(key);
  };

  // Memoize providers to prevent unnecessary re-renders
  const memoizedProviders = useMemo(() => ({
    web3: (
      <Web3ReactProvider getLibrary={getLibrary}>
        <NetworkProvider>
          <DatabaseProvider>
            <AuthProvider>
              <OracleProvider>
                <AppThemeProvider>
                  <SnackbarProvider 
                    maxSnack={5}
                    ref={notistackRef}
                    autoHideDuration={5000}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    dense
                  >
                    <ErrorBoundary>
                      {isLoading ? (
                        <LoadingScreen />
                      ) : (
                        <Routes>
                          <Route path="/login" element={<Login />} />
                          <Route path="/health" element={<HealthDashboard />} />
                          
                          {/* Protected Routes */}
                          <Route path="/" element={
                            <ProtectedRoute>
                              <MainLayout pageTitle={pageTitle}>
                                <Suspense fallback={<LoadingScreen />}>
                                  <Widgetboard />
                                </Suspense>
                              </MainLayout>
                            </ProtectedRoute>
                          } />
                          <Route path="/oracle" element={
                            <ProtectedRoute>
                              <Suspense fallback={<LoadingScreen />}>
                                <Oracle />
                              </Suspense>
                            </ProtectedRoute>
                          } />
                          <Route path="/oracles" element={
                            <ProtectedRoute>
                              <MainLayout>
                                <Suspense fallback={<LoadingScreen />}>
                                  <OracleManagement />
                                </Suspense>
                              </MainLayout>
                            </ProtectedRoute>
                          } />
                          <Route path="/data-sources" element={
                            <ProtectedRoute>
                              <MainLayout>
                                <Suspense fallback={<LoadingScreen />}>
                                  <DataSources />
                                </Suspense>
                              </MainLayout>
                            </ProtectedRoute>
                          } />
                          <Route path="/validation" element={
                            <ProtectedRoute>
                              <MainLayout>
                                <Suspense fallback={<LoadingScreen />}>
                                  <Validation />
                                </Suspense>
                              </MainLayout>
                            </ProtectedRoute>
                          } />
                          <Route path="/monitoring" element={
                            <ProtectedRoute>
                              <MainLayout>
                                <Suspense fallback={<LoadingScreen />}>
                                  <Monitoring />
                                </Suspense>
                              </MainLayout>
                            </ProtectedRoute>
                          } />
                          <Route path="/settings" element={
                            <ProtectedRoute>
                              <MainLayout>
                                <Suspense fallback={<LoadingScreen />}>
                                  <Settings />
                                </Suspense>
                              </MainLayout>
                            </ProtectedRoute>
                          } />
                          <Route path="/profile" element={
                            <ProtectedRoute>
                              <MainLayout>
                                <Suspense fallback={<LoadingScreen />}>
                                  <Profile />
                                </Suspense>
                              </MainLayout>
                            </ProtectedRoute>
                          } />
                          
                          {/* Fallback route */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      )}
                    </ErrorBoundary>
                  </SnackbarProvider>
                </AppThemeProvider>
              </OracleProvider>
            </AuthProvider>
          </DatabaseProvider>
        </NetworkProvider>
      </Web3ReactProvider>
    ),
  }), [isLoading, notistackRef, pageTitle]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return memoizedProviders.web3;
};

export default App;
