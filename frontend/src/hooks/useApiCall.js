import { useState, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook for API calls with loading states, timeouts, and error handling
 * @param {number} timeoutMs - Timeout in milliseconds (30000 for regular, 60000 for big data)
 */
export const useApiCall = (timeoutMs = 30000) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      loadingMessage = "Loading...",
      onSuccess = () => {},
      onError = () => {},
      enableRetry = true
    } = options;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);
      
      // Execute the API call with timeout
      const result = await apiCall({
        signal: abortController.signal
      });
      
      clearTimeout(timeoutId);
      setLoading(false);
      onSuccess(result);
      return result;
      
    } catch (err) {
      setLoading(false);
      
      let errorMessage = "Something went wrong. Please try again.";
      let shouldRetry = enableRetry;
      
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        // Timeout error
        const waitMinutes = timeoutMs === 60000 ? 15 : 15;
        errorMessage = `Request timed out. The server might be busy. Please try again after ${waitMinutes} minutes.`;
        shouldRetry = true;
      } else if (err.response) {
        // Server responded with error
        const status = err.response.status;
        if (status === 503) {
          errorMessage = "Database connection temporarily unavailable. Please try again after 15 minutes.";
        } else if (status === 500) {
          errorMessage = "Server error occurred. Please try again after 15 minutes.";
        } else if (status >= 400 && status < 500) {
          errorMessage = err.response.data?.detail || "Invalid request. Please check your data.";
          shouldRetry = false;
        }
      } else if (err.request) {
        // Network error
        errorMessage = "Network connection failed. Please check your internet connection and try again.";
      }
      
      const errorObj = {
        message: errorMessage,
        canRetry: shouldRetry,
        originalError: err
      };
      
      setError(errorObj);
      onError(errorObj);
      throw errorObj;
    }
  }, [timeoutMs]);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);
  
  return {
    loading,
    error,
    execute,
    reset
  };
};

/**
 * Hook specifically for big data operations (60s timeout)
 */
export const useBigDataApiCall = () => {
  return useApiCall(60000);
};

/**
 * Hook specifically for regular operations (30s timeout)  
 */
export const useRegularApiCall = () => {
  return useApiCall(30000);
};
