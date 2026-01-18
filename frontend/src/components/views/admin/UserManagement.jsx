import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URLS } from '../../../utils/fetchurl';
import { useAuth } from '../../../contexts/AuthContext';
import StatusOverlay from '../../common/StatusOverlay';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { token, logout } = useAuth();

  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: "",
    isError: false,
    errorType: "general"
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    roles: []
  });

  const [editForm, setEditForm] = useState({
    password: '',
    is_active: true,
    roles: []
  });

  const availableRoles = [
    'admin',
    'user_data_editor',
    'user_data_viewer',
    'receipt_creator',
    'receipt_viewer'
  ];

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URLS.getAllUsers(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.data);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        setOverlayState({
          isVisible: true,
          message: "Unauthorized. Please login as admin.",
          isError: true,
          errorType: "unauthorized"
        });
      } else {
        setOverlayState({
          isVisible: true,
          message: error.response?.data?.detail || "Failed to load users",
          isError: true,
          errorType: "general"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        API_URLS.createUser(),
        {
          username: createForm.username,
          password: createForm.password,
          is_active: true,
          is_superuser: false,
          roles: createForm.roles
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOverlayState({
        isVisible: true,
        message: "User created successfully!",
        isError: false,
        errorType: "general"
      });
      setShowCreateModal(false);
      setCreateForm({ username: '', password: '', roles: [] });
      fetchUsers();
    } catch (error) {
      setOverlayState({
        isVisible: true,
        message: error.response?.data?.detail || "Failed to create user",
        isError: true,
        errorType: "general"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const handleUpdateUser = async (userId) => {
    setLoading(true);
    try {
      const updateData = {};
      if (editForm.password) updateData.password = editForm.password;
      if (editForm.is_active !== undefined) updateData.is_active = editForm.is_active;
      if (editForm.roles.length > 0) updateData.roles = editForm.roles;

      await axios.put(
        API_URLS.updateUser(userId),
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOverlayState({
        isVisible: true,
        message: "User updated successfully!",
        isError: false,
        errorType: "general"
      });
      setEditingUser(null);
      setEditForm({ password: '', is_active: true, roles: [] });
      fetchUsers();
    } catch (error) {
      setOverlayState({
        isVisible: true,
        message: error.response?.data?.detail || "Failed to update user",
        isError: true,
        errorType: "general"
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (userId, currentStatus) => {
    setLoading(true);
    try {
      await axios.put(
        API_URLS.updateUser(userId),
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOverlayState({
        isVisible: true,
        message: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
        isError: false,
        errorType: "general"
      });
      fetchUsers();
    } catch (error) {
      setOverlayState({
        isVisible: true,
        message: error.response?.data?.detail || "Failed to toggle user status",
        isError: true,
        errorType: "general"
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      password: '',
      is_active: user.is_active,
      roles: user.roles || []
    });
  };

  const handleRoleToggle = (role, isCreateForm = false) => {
    if (isCreateForm) {
      setCreateForm(prev => ({
        ...prev,
        roles: prev.roles.includes(role)
          ? prev.roles.filter(r => r !== role)
          : [...prev.roles, role]
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        roles: prev.roles.includes(role)
          ? prev.roles.filter(r => r !== role)
          : [...prev.roles, role]
      }));
    }
  };

  return (
    <div className="user-management-container">
      <div className="um-header">
        <h1>👥 User Management</h1>
        <button className="um-btn um-btn-primary" onClick={() => setShowCreateModal(true)}>
          ➕ Create User
        </button>
      </div>

      <div className="um-table-container">
        <table className="um-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Status</th>
              <th>Superuser</th>
              <th>Roles</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>
                  <span className={`um-status ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </td>
                <td>{user.is_superuser ? '⭐ Yes' : 'No'}</td>
                <td>
                  <div className="um-roles">
                    {user.roles?.map(role => (
                      <span key={role} className="um-role-badge">{role}</span>
                    ))}
                  </div>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="um-actions">
                    <button
                      className="um-btn um-btn-edit"
                      onClick={() => openEditModal(user)}
                      title="Edit User"
                    >
                      ✏️
                    </button>
                    <button
                      className={`um-btn ${user.is_active ? 'um-btn-danger' : 'um-btn-success'}`}
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active ? '🔒' : '🔓'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="um-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>Create New User</h2>
              <button className="um-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="um-form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                />
              </div>
              <div className="um-form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
              </div>
              <div className="um-form-group">
                <label>Roles</label>
                <div className="um-roles-checkbox">
                  {availableRoles.map(role => (
                    <label key={role} className="um-checkbox-label">
                      <input
                        type="checkbox"
                        checked={createForm.roles.includes(role)}
                        onChange={() => handleRoleToggle(role, true)}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
              <div className="um-modal-footer">
                <button type="button" className="um-btn um-btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="um-btn um-btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="um-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>Edit User: {editingUser.username}</h2>
              <button className="um-close-btn" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(editingUser.id); }}>
              <div className="um-form-group">
                <label>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
              <div className="um-form-group">
                <label className="um-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                  Active User
                </label>
              </div>
              <div className="um-form-group">
                <label>Roles</label>
                <div className="um-roles-checkbox">
                  {availableRoles.map(role => (
                    <label key={role} className="um-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.roles.includes(role)}
                        onChange={() => handleRoleToggle(role, false)}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
              <div className="um-modal-footer">
                <button type="button" className="um-btn um-btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="um-btn um-btn-primary">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StatusOverlay
        isVisible={overlayState.isVisible || loading}
        message={loading ? "Processing..." : overlayState.message}
        isError={overlayState.isError}
        errorType={overlayState.errorType}
        onClose={() => setOverlayState({ ...overlayState, isVisible: false })}
        onLoginAgain={overlayState.errorType === 'unauthorized' ? logout : null}
      />
    </div>
  );
};

export default UserManagement;

