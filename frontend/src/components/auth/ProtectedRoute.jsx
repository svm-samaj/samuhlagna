import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import NotAuthenticatedPopup from './NotAuthenticatedPopup';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading while auth context is initializing
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show not authenticated popup if user is not logged in
  if (!isAuthenticated) {
    return <NotAuthenticatedPopup />;
  }

  // Render protected content if authenticated
  return children;
};

export default ProtectedRoute;
