/*
 * ⚠️ GLOBAL API URL CONFIGURATION - Used by ALL components
 * This file controls ALL backend API calls in the application.
 * Changes here affect: Create Receipt, Reports, User Management, Areas, Villages, etc.
 * 
 * IMPORTANT: All components use API_URLS object from this file.
 * Test all pages after modifying base URL or API endpoints!
 */

// Smart environment detection with fallbacks for GitHub Pages deployment

// Validate and get base URL - SMART MODE with FORCED GitHub Pages detection
const getBaseUrl = () => {
  // DEBUG: Log all environment variables
  console.log('🔍 DEBUG - All Vite env vars:', import.meta.env);
  console.log('🔍 DEBUG - VITE_NODE_ENV:', import.meta.env.VITE_NODE_ENV);
  console.log('🔍 DEBUG - VITE_DEV_API_URL:', import.meta.env.VITE_DEV_API_URL);
  console.log('🔍 DEBUG - VITE_PROD_API_URL:', import.meta.env.VITE_PROD_API_URL);
  console.log('🔍 DEBUG - window.location.hostname:', window.location.hostname);
  console.log('🔍 DEBUG - window.location.href:', window.location.href);
  
  const nodeEnv = import.meta.env.VITE_NODE_ENV;
  const devUrl = import.meta.env.VITE_DEV_API_URL;
  const prodUrl = import.meta.env.VITE_PROD_API_URL;
  const hostname = window.location.hostname;
  
  // FORCE PRODUCTION for GitHub Pages - hostname-based detection takes priority
  const isGitHubPages = hostname.includes('github.io');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  
  // DEV OVERRIDE: Check for force production flag (multiple methods)
  const forceProductionValue = localStorage.getItem('FORCE_PRODUCTION');
  const forceProductionLS = forceProductionValue === 'true';
  const forceProductionWindow = window.FORCE_PROD_MODE === true;
  const forceProduction = forceProductionLS || forceProductionWindow;
  
  // DEBUG: Log override status
  console.log('🔍 DEBUG - localStorage.FORCE_PRODUCTION:', forceProductionValue);
  console.log('🔍 DEBUG - window.FORCE_PROD_MODE:', window.FORCE_PROD_MODE);
  console.log('🔍 DEBUG - forceProduction final:', forceProduction);
  console.log('🔍 DEBUG - isLocalhost:', isLocalhost);
  
  let detectedEnv;
  
  // PRIORITY 0: Developer override for testing local frontend with production backend
  if (forceProduction && isLocalhost) {
    detectedEnv = 'production';
    console.log(`🔧 DEV OVERRIDE: production (forced via localStorage.FORCE_PRODUCTION)`);
  }
  // PRIORITY 1: Environment variable takes precedence (main logic)
  else if (nodeEnv) {
    detectedEnv = nodeEnv;
    console.log(`📝 ENV VARIABLE: ${detectedEnv} (from VITE_NODE_ENV) - Controls backend URL`);
  }
  // PRIORITY 2: Hostname-based fallback for GitHub Pages  
  else if (isGitHubPages) {
    detectedEnv = 'production';
    console.log(`🚀 GITHUB PAGES: production (detected ${hostname}) - Using production backend`);
  }
  // PRIORITY 3: Localhost fallback (when no env var set)
  else if (isLocalhost) {
    detectedEnv = 'development';
    console.log(`🏠 LOCALHOST FALLBACK: development (${hostname}) - No env var found, defaulting to dev`);
  }
  // PRIORITY 4: Default to production for any other domain
  else {
    detectedEnv = 'production';
    console.log(`🌐 DEFAULT: production (unknown domain: ${hostname})`);
  }
  
  // Development environment
  if (detectedEnv === 'development') {
    if (!devUrl) {
      console.error('❌ VITE_DEV_API_URL is not set in .env file!');
      throw new Error('Development API URL not configured. Please set VITE_DEV_API_URL in your .env file.');
    }
    console.log('✅ Final Environment: development');
    console.log('✅ Final API URL:', devUrl);
    return devUrl;
  }
  
  // Production environment (GitHub Pages, Render, etc.)
  if (detectedEnv === 'production') {
    if (!prodUrl) {
      console.error('❌ VITE_PROD_API_URL is not set in .env file!');
      throw new Error('Production API URL not configured. Please set VITE_PROD_API_URL in your .env file.');
    }
    console.log('✅ Final Environment: production');
    console.log('✅ Final API URL:', prodUrl);
    return prodUrl;
  }
  
  // Fallback error (should never reach here)
  console.error(`❌ Invalid environment detected: ${detectedEnv}`);
  console.error('❌ Please check your .env file configuration');
  throw new Error(`Invalid environment: ${detectedEnv}. Please configure VITE_NODE_ENV, VITE_DEV_API_URL, and VITE_PROD_API_URL in your .env file.`);
};

// Environment information for debugging
export const ENV_INFO = {
  get current() {
    const hostname = window.location.hostname;
    const nodeEnv = import.meta.env.VITE_NODE_ENV;
    return nodeEnv || (hostname === 'localhost' || hostname === '127.0.0.1' ? 'development' : 'production');
  },
  get baseUrl() {
    return getBaseUrl();
  },
  get hostname() {
    return window.location.hostname;
  },
  isDevelopment() {
    return this.current === 'development';
  },
  isProduction() {
    return this.current === 'production';
  },
  isGitHubPages() {
    return window.location.hostname.includes('github.io');
  }
};

// Developer utility functions for testing
export const DEV_UTILS = {
  // Force production mode for testing local frontend with production backend
  forceProduction() {
    localStorage.setItem('FORCE_PRODUCTION', 'true');
    window.FORCE_PROD_MODE = true;
    console.log('🔧 DEV MODE: Enabled production backend for local testing');
    console.log('💡 Applied both localStorage and window variable overrides');
    window.location.reload();
  },
  
  // Revert to normal local development mode
  useLocalBackend() {
    localStorage.removeItem('FORCE_PRODUCTION');
    delete window.FORCE_PROD_MODE;
    console.log('🏠 DEV MODE: Enabled local backend for development');
    console.log('💡 Cleared both localStorage and window variable overrides');
    window.location.reload();
  },
  
  // Toggle between dev and prod modes
  toggleMode() {
    const isCurrentlyForced = localStorage.getItem('FORCE_PRODUCTION') === 'true';
    if (isCurrentlyForced) {
      this.useLocalBackend();
    } else {
      this.forceProduction();
    }
  },
  
  // Check current override status
  getStatus() {
    const isForced = localStorage.getItem('FORCE_PRODUCTION') === 'true';
    const currentUrl = getBaseUrl();
    console.log('🔍 DEV OVERRIDE STATUS:');
    console.log('- Force Production:', isForced);
    console.log('- Current API URL:', currentUrl);
    console.log('- Hostname:', window.location.hostname);
    return { isForced, currentUrl, hostname: window.location.hostname };
  },
  
  // Check if currently using production backend
  isUsingProduction() {
    return localStorage.getItem('FORCE_PRODUCTION') === 'true' || window.FORCE_PROD_MODE === true;
  }
};

// Simple API URLs
export const API_URLS = {
  // Users
  getAllUser_data: () => `${getBaseUrl()}/user_data/`,
  getUser_dataById: (id) => `${getBaseUrl()}/user_data/${id}`,
  createUser_data: () => `${getBaseUrl()}/user_data/`,
  updateUser_data: (id) => `${getBaseUrl()}/user_data/${id}`,
  deleteUser_data: (id) => `${getBaseUrl()}/user_data/${id}`,
  getUser_dataStats: () => `${getBaseUrl()}/user_data/stats`,
  
  // Areas
  getAllAreas: () => `${getBaseUrl()}/area/`,
  getAreaById: (id) => `${getBaseUrl()}/area/${id}`,
  createArea: () => `${getBaseUrl()}/area/`,
  deleteArea: (id) => `${getBaseUrl()}/area/${id}`,
  
  // Villages
  getAllVillages: () => `${getBaseUrl()}/village/`,
  getVillageById: (id) => `${getBaseUrl()}/village/${id}`,
  createVillage: () => `${getBaseUrl()}/village/`,
  deleteVillage: (id) => `${getBaseUrl()}/village/${id}`,
  
  // Authentication
  login: () => `${getBaseUrl()}/auth/login`,
  register: () => `${getBaseUrl()}/auth/register`,
  logout: () => `${getBaseUrl()}/auth/logout`,
  getCurrentUser: () => `${getBaseUrl()}/auth/me`,
  getAllUsers: () => `${getBaseUrl()}/auth/users`,  // Get all system users (admin only)
  createUser: () => `${getBaseUrl()}/auth/create-user`,  // Create user (admin only)
  updateUser: (id) => `${getBaseUrl()}/auth/users/${id}`,  // Update user (admin only)
  getReceiptCreators: () => `${getBaseUrl()}/receipts/creators`,  // Get users who have created receipts (for reports filtering)
  getReceiptReportsDropdown: () => `${getBaseUrl()}/receipts/reports/dropdown`,  // Get users with role IDs 1 & 5 for reports dropdown
  
  // Receipts
  createReceipt: () => `${getBaseUrl()}/receipts/`,
  getReceipt: (id) => `${getBaseUrl()}/receipts/${id}`,
  getAllReceipts: () => `${getBaseUrl()}/receipts/`,
  updateReceipt: (id) => `${getBaseUrl()}/receipts/${id}`,
  deleteReceipt: (id) => `${getBaseUrl()}/receipts/${id}`,
  getReceiptStats: () => `${getBaseUrl()}/receipts/stats/summary`
};
