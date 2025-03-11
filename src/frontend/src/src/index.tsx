import 'aframe';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';

// Create a custom error handler to catch initialization errors
const handleError = (error: Error) => {
  console.error('Application initialization error:', error);
  
  // If token-related, clear it to prevent login loops
  if (error.message.includes('token') || 
      error.message.includes('auth') || 
      error.message.includes('Unexpected token')) {
    console.warn('Clearing auth token due to initialization error');
    localStorage.removeItem('auth_token');
  }
};

// Initialize app with error handling
try {
  const container = document.getElementById('root');
  if (!container) throw new Error('Failed to find the root element');
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  handleError(error as Error);
  
  // Display a minimal error message when app fails to initialize
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'text-align:center; margin:40px auto; max-width:500px; padding:20px; font-family:sans-serif;';
  errorDiv.innerHTML = `
    <h2 style="color:#d32f2f">Application Error</h2>
    <p>The application failed to initialize. Please try refreshing the page.</p>
    <button onclick="window.location.reload()" style="padding:8px 16px; background:#1976d2; color:white; border:none; border-radius:4px; cursor:pointer;">
      Refresh Page
    </button>
  `;
  
  // Find a place to mount the error message
  const root = document.getElementById('root');
  if (root) {
    root.appendChild(errorDiv);
  } else {
    document.body.appendChild(errorDiv);
  }
} 