import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URLS } from '../../../utils/fetchurl';
import { useRegularApiCall } from '../../../hooks/useApiCall';
import { useAuth } from '../../../contexts/AuthContext';
import StatusOverlay from '../../common/StatusOverlay';
import './Home.css';

const Home = () => {
  const [stats, setStats] = useState({
    total: 0,
    all: 0,
    nrs: 0,
    commitee: 0,
    siddhpur: 0
  });

  const [authError, setAuthError] = useState(null);
  const [showAuthErrorOverlay, setShowAuthErrorOverlay] = useState(false);

  const { loading, error, execute, reset } = useRegularApiCall();
  const { isAuthenticated, loading: authLoading } = useAuth(); // Add auth context

  useEffect(() => {
    // Only fetch stats when authenticated and auth is not loading
    if (isAuthenticated && !authLoading) {
      fetchStats();
    }
  }, [isAuthenticated, authLoading]);

  const fetchStats = async () => {
    try {
      await execute(
        ({ signal }) => axios.get(API_URLS.getUser_dataStats(), { signal }),
        {
          loadingMessage: "Loading dashboard statistics...",
          onSuccess: (response) => {
            console.log('✅ Home: Stats fetched successfully');
            // Backend returns { status, message, data: {...actual stats...} }
            setStats(response.data.data || response.data);
            setAuthError(null);
            setShowAuthErrorOverlay(false);
          },
          onError: (error) => {
            console.error('❌ Home: Failed to fetch user statistics:', error);
            // Just log the error here, handle auth errors in catch block only
          }
        }
      );
    } catch (err) {
      // Handle auth errors only here to avoid duplication
      const status = err.originalError?.response?.status;
      if (status === 401 || status === 403) {
        console.log('📊 Home: User does not have access to stats API - showing default values');
        
        // Clear any existing error states first
        reset();
        
        // Set default stats to 0
        setStats({
          total: 0,
          all: 0,
          nrs: 0,
          commitee: 0,
          siddhpur: 0
        });
        
        // Show authorization error overlay
        setAuthError({
          message: "You don't have permission to view statistics. You can still access other features.",
          type: 'unauthorized'
        });
        setShowAuthErrorOverlay(true);
      } else {
        console.error('📊 Home: Non-auth error in catch block:', err);
        // Let the error remain for general error overlay to handle
      }
    }
  };

  const handleRetry = () => {
    reset();
    fetchStats();
  };

  const handleAuthErrorClose = () => {
    setShowAuthErrorOverlay(false);
    setAuthError(null);
    // Also reset any general error to ensure clean state
    reset();
  };

  return (
    <>
      <StatusOverlay 
        isVisible={loading}
        message="Loading dashboard statistics..."
      />
      {/* General error overlay - only show if not loading and no auth error */}
      {!showAuthErrorOverlay && !authError && (
        <StatusOverlay 
          isVisible={error && !loading}
          message={error?.message}
          isError={true}
          onRetry={error?.canRetry ? handleRetry : null}
        />
      )}
      
      {/* Authorization error overlay - takes priority over general errors */}
      <StatusOverlay 
        isVisible={showAuthErrorOverlay && authError}
        message={authError?.message}
        isError={true}
        errorType="unauthorized"
        onClose={handleAuthErrorClose}
      />
      
      <div className="home-container">
        <div className="cards-grid">
          <Link to="/area" className="card">
            <h3 className="card-title">Area</h3>
            <p className="card-desc">Create and Delete Area</p>
          </Link>
          <Link to="/village" className="card">
            <h3 className="card-title">Village</h3>
            <p className="card-desc">Create and Delete Village</p>
          </Link>
          <Link to="/user" className="card">
            <h3 className="card-title">Create User Data</h3>
            <p className="card-desc">Create New User Data</p>
          </Link>
          <Link to="/showuser" className="card">
            <h3 className="card-title">Show User Data</h3>
            <p className="card-desc">Manage and Download User Data</p>
          </Link>
          <Link to="/receipts" className="card">
            <h3 className="card-title">Receipts</h3>
            <p className="card-desc">Create, modify and generate receipt reports</p>
          </Link>
          {/* You can add up to 4 more cards here later */}
        </div>
        
        <div className="stats-footer">
          <div className="stats-content">
            <span className="stat-item">TOTAL - {stats.total}</span>
            <span className="stat-item">ALL - {stats.all || 0}</span>
            <span className="stat-item">NRS - {stats.nrs || 0}</span>
            <span className="stat-item">COMMITEE - {stats.commitee || 0}</span>
            <span className="stat-item">SIDDHPUR - {stats.siddhpur || 0}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
