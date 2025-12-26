import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_URLS } from '../../utils/fetchurl';
import './Login.css';

const Login = () => {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from auth context

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    console.log('Logging in with:', { userid, password });

    try {
      // Make API call to backend login endpoint
      // Backend expects OAuth2PasswordRequestForm (form data), not JSON
      const formData = new URLSearchParams();
      formData.append('username', userid);
      formData.append('password', password);
      
      const response = await fetch(API_URLS.login(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();
      console.log('API Response:', { status: response.status, data }); // Debug log

      if (response.ok && data.access_token) {
        console.log('Login successful, fetching user data...');
        
        // Now fetch user data using the token
        try {
          const userResponse = await fetch(API_URLS.getCurrentUser(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Content-Type': 'application/json',
            },
          });
          
          const userData = await userResponse.json();
          console.log('User data fetched:', userData);
          
          if (userResponse.ok && userData.status === 'success') {
            // Use auth context to store both token and user data
            login(data, userData.data);
            
            // Navigate to home page
            navigate('/home');
          } else {
            console.error('Failed to fetch user data:', userData);
            // Still proceed with login but without detailed user info
            login(data);
            navigate('/home');
          }
        } catch (userError) {
          console.error('Error fetching user data:', userError);
          // Still proceed with login but without detailed user info
          login(data);
          navigate('/home');
        }
      } else {
        // Handle API error response
        let errorMessage = 'Invalid userid or password';
        
        if (data.detail) {
          // Handle FastAPI validation errors
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.msg || err).join(', ');
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else {
            errorMessage = JSON.stringify(data.detail);
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <label>User ID</label>
          <input
            type="text"
            placeholder="Enter your userid"
            value={userid}
            onChange={(e) => setUserid(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="login-error">{error}</p>}

          <div className="login-options">
            <label><input type="checkbox" /> Remember me</label>
            <a href="#">Forgot Password?</a>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
