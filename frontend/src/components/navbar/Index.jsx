import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Index.css';

const Navbar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    closeSidebar();
    logout();
  };

  return (
    <>
      <header className="navbar-container">
        <div className="navbar-left">
          <img
            src="Hamburger.svg"
            alt="Menu"
            className="hamburger-icon"
            onClick={toggleSidebar}
          />
        </div>
        <div className="scrolling-banner">
        <div className="scrolling-text">
          Shree Vishwakarma Dhandhar Mewada Suthar Samaj Samuh Lagna Trust Siddhpur
        </div>
      </div>
        <div className="navbar-right">
          <button className="navbar-logout-button" onClick={handleLogout} title="Logout">
            ⏻
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeSidebar}>×</button>
        
        {/* User Info Display */}
        <div className="user-info-card">
          <div className="user-avatar">
            <span className="user-icon">👤</span>
          </div>
          <div className="user-details">
            <div className="user-name">{user?.username || 'Guest'}</div>
            <div className="user-role">{user?.roles ? user.roles.join(', ') : 'User'}</div>
            <div className="user-status">🟢 Online</div>
          </div>
        </div>
        
        <div className="sidebar-divider"></div>
        
        <Link to="/home" className="sidebar-link" onClick={closeSidebar}>Home</Link>
        <Link to="/area" className="sidebar-link" onClick={closeSidebar}>Area</Link>
        <Link to="/village" className="sidebar-link" onClick={closeSidebar}>Village</Link>
        <Link to="/user" className="sidebar-link" onClick={closeSidebar}>Create User Data</Link>
        <Link to="/showuser" className="sidebar-link" onClick={closeSidebar}>Show User Data</Link>
        <Link to="/receipts" className="sidebar-link" onClick={closeSidebar}>Receipts</Link>
        
        {/* Admin Only Section */}
        {user?.roles?.includes('admin') && (
          <>
            <div className="sidebar-divider"></div>
            <div className="sidebar-section-title">Admin Panel</div>
            <Link to="/admin/users" className="sidebar-link sidebar-link-admin" onClick={closeSidebar}>
              👥 User Management
            </Link>
          </>
        )}
        
        <button className="login-button" onClick={handleLogout}>
          Log Out {user?.username ? `(${user.username})` : ''}
        </button>
      </div>
      
      

      {/* Optional overlay */}
      {sidebarOpen && <div className="overlay" onClick={closeSidebar}></div>}
    </>
  );
};

export default Navbar;
