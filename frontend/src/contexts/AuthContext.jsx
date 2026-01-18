/*
 * ⚠️ GLOBAL AUTH CONTEXT - Used by ALL protected pages
 * This context is used by: Login, Create Receipt, Reports, User Management, etc.
 * Changes to login/logout logic will affect the entire application!
 * Test thoroughly before deploying any changes.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    initializeAuth();
    setupAxiosInterceptor(); // Set up interceptor immediately on mount
  }, []);

  // Set up axios interceptor when token changes
  useEffect(() => {
    setupAxiosInterceptor();
  }, [token]);

  const initializeAuth = () => {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user_data');
      
      if (storedToken) {
        setToken(storedToken);
        setIsAuthenticated(true);
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        console.log('✅ AuthContext: Authentication initialized');
      }
    } catch (error) {
      console.error('❌ AuthContext: Error initializing auth:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const setupAxiosInterceptor = () => {
    // Clear existing interceptors
    axios.interceptors.request.clear();
    axios.interceptors.response.clear();
    
    // Add request interceptor for Bearer token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = token || localStorage.getItem('access_token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for handling 401 errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('🚨 Token expired - logging out');
          // Token expired or invalid, clear auth
          clearAuth();
        }
        return Promise.reject(error);
      }
    );

    // Store interceptor IDs for cleanup
    return { requestInterceptor, responseInterceptor };
  };

  const login = (tokenData, userData = null) => {
    try {
      // Store in localStorage
      localStorage.setItem('access_token', tokenData.access_token);
      localStorage.setItem('refresh_token', tokenData.refresh_token);
      localStorage.setItem('token_type', tokenData.token_type || 'bearer');
      
      if (userData) {
        localStorage.setItem('user_data', JSON.stringify(userData));
        setUser(userData);
      }

      // Update state
      setToken(tokenData.access_token);
      setIsAuthenticated(true);
      
      // Ensure interceptor is set up with new token
      setupAxiosInterceptor();
      
      console.log('✅ Auth context: Login successful');
    } catch (error) {
      console.error('❌ Auth context: Error during login:', error);
    }
  };

  const logout = () => {
    clearAuth();
    
    // Navigate to login page with correct base path for GitHub Pages
    window.location.href = '/svmps-frontend/';
    
    console.log('✅ Auth context: Logout successful');
  };

  const clearAuth = () => {
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_data');
    
    // Clear state
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    // State
    isAuthenticated,
    user,
    token,
    loading,
    
    // Actions
    login,
    logout,
    clearAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
