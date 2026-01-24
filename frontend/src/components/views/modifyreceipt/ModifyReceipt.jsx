import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_URLS } from '../../../utils/fetchurl';
import StatusOverlay from '../../common/StatusOverlay';
import { handleAPIError, formatPermissionMessage } from '../../../utils/errorHandler';
import axios from 'axios';
import Select from 'react-select';
import './ModifyReceipt.css';

const ModifyReceipt = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const itemsPerPage = 10;

  // Filter states
  const [filters, setFilters] = useState({
    receipt_date: '',
    donor_or_receipt: '',  // Combined donor name and receipt number search
    village: '', // Village search (will use dropdown)
    receipt_no: '', // Receipt number search
    payment_mode: '',
    status: ''
  });

  // State for villages dropdown with search
  const [allVillages, setAllVillages] = useState([]); // All villages loaded from API
  const [villageSearchTerm, setVillageSearchTerm] = useState(''); // Current search term


  // Overlay state for messages
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: "",
    isError: false,
    errorType: "general",
    pendingAction: null
  });

  // Load distinct villages on component mount
  useEffect(() => {
    loadDistinctVillages();
  }, []);

  const loadDistinctVillages = async () => {
    try {
      const response = await axios.get(API_URLS.getDistinctVillages());
      
      if (response.data.status === 'success') {
        setAllVillages(response.data.data);
        console.log(`✅ Loaded ${response.data.data.length} distinct villages for dropdown`);
      }
    } catch (error) {
      console.error('Error loading villages:', error);
      // Don't show error to user - graceful fallback to input field
    }
  };

  // Filter villages based on search (show top 10)
  const filteredVillageOptions = useMemo(() => {
    if (!villageSearchTerm) {
      // No search - show first 10 villages
      return allVillages.slice(0, 10).map(village => ({
        value: village,
        label: village
      }));
    }
    
    // Search in local state
    const filtered = allVillages.filter(village =>
      village.toLowerCase().includes(villageSearchTerm.toLowerCase())
    );
    
    // Return top 10 results
    return filtered.slice(0, 10).map(village => ({
      value: village,
      label: village
    }));
  }, [allVillages, villageSearchTerm]);

  // Load receipts on component mount and when page changes (NOT when filters change)
  useEffect(() => {
    loadReceipts();
  }, [currentPage]);

  // Load receipts from API
  const loadReceipts = async () => {
    try {
      setLoading(true);
      
      // Build query parameters with custom filter logic
      const apiFilters = {};
      
      // Handle receipt date filter
      if (filters.receipt_date) {
        apiFilters.date_from = filters.receipt_date;
        apiFilters.date_to = filters.receipt_date;
      }
      
      // Handle combined donor name/receipt number search
      if (filters.donor_or_receipt) {
        apiFilters.donor_name = filters.donor_or_receipt;
        // Note: Receipt number search will be handled on backend
      }
      
      // Handle village search
      if (filters.village) {
        apiFilters.village = filters.village;
      }
      
      // Handle receipt number search
      if (filters.receipt_no) {
        apiFilters.receipt_no = filters.receipt_no;
      }
      
      // Handle other filters
      if (filters.payment_mode) {
        apiFilters.payment_mode = filters.payment_mode;
      }
      
      if (filters.status) {
        apiFilters.status = filters.status;
      }

      const queryParams = new URLSearchParams({
        page_num: currentPage,
        page_size: itemsPerPage,
        ...apiFilters
      });

      const response = await axios.get(`${API_URLS.getAllReceipts()}?${queryParams}`);
      
      // Check for graceful permission error first
      if (response.data.status === 'error' && response.data.error_code === 'PERMISSION_DENIED') {
        // Handle graceful permission error by showing user-friendly message
        const errorInfo = handleAPIError({ response }, "Failed to load receipts. Please try again.");
        
        let displayMessage = errorInfo.message;
        if (errorInfo.isPermissionError) {
          displayMessage = formatPermissionMessage(
            errorInfo.message,
            errorInfo.availableRoles,
            errorInfo.userRoles
          );
        }
        
        setOverlayState({
          isVisible: true,
          message: displayMessage,
          isError: true,
          errorType: errorInfo.type,
          pendingAction: null
        });
        
        return; // Exit early, don't set receipts data
      }
      
      if (response.data.status === 'success') {
        setReceipts(response.data.data);
        setTotalReceipts(response.data.total_count);
        setTotalPages(Math.ceil(response.data.total_count / itemsPerPage));
      } else {
        throw new Error('Failed to load receipts');
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      
      const errorInfo = handleAPIError(error, "Failed to load receipts. Please try again.");
      
      let displayMessage = errorInfo.message;
      if (errorInfo.isPermissionError) {
        displayMessage = formatPermissionMessage(
          errorInfo.message,
          errorInfo.availableRoles,
          errorInfo.userRoles
        );
      }

      setOverlayState({
        isVisible: true,
        message: displayMessage,
        isError: true,
        errorType: errorInfo.type,
        pendingAction: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes (no longer auto-triggers search)
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Note: Page reset happens in handleSearch, not here
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      receipt_date: '',
      donor_or_receipt: '',
      village: '',
      receipt_no: '',
      payment_mode: '',
      status: ''
    });
    setSearchTerm('');
    setVillageSearchTerm('');
    setCurrentPage(1);
  };

  // Handle search button click
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page
    loadReceipts();
  };

  // Handle edit receipt - navigate to CreateReceipt with receipt ID
  const handleEditReceipt = (receipt) => {
    // Navigate to CreateReceipt page with receipt ID as query parameter
    navigate(`/create-receipt?edit=${receipt.id}`);
  };


  // Handle delete receipt (cancel)
  const handleDeleteReceipt = async (receiptId, receiptNo) => {
    if (window.confirm(`Are you sure you want to cancel receipt ${receiptNo}?`)) {
      try {
        setLoading(true);
        await axios.delete(API_URLS.deleteReceipt(receiptId));
        
        setOverlayState({
          isVisible: true,
          message: `Receipt ${receiptNo} cancelled successfully!`,
          isError: false,
          errorType: "general",
          pendingAction: null
        });
        
        // Reload receipts
        loadReceipts();
      } catch (error) {
        console.error('Error cancelling receipt:', error);
        
        const errorInfo = handleAPIError(error, `Failed to cancel receipt ${receiptNo}. Please try again.`);
        
        let displayMessage = errorInfo.message;
        if (errorInfo.isPermissionError) {
          displayMessage = formatPermissionMessage(
            errorInfo.message,
            errorInfo.availableRoles,
            errorInfo.userRoles
          );
        }
        
        setOverlayState({
          isVisible: true,
          message: displayMessage,
          isError: true,
          errorType: errorInfo.type,
          pendingAction: null
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle pagination
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="modify-receipt-container">
      <h1 className="page-title">Modify Receipts</h1>
      <p className="page-subtitle">View and edit your receipts</p>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Receipt Date:</label>
            <input
              type="date"
              className="filter-input"
              value={filters.receipt_date}
              onChange={(e) => handleFilterChange('receipt_date', e.target.value)}
              title="Filter by specific receipt date"
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Donor Name / Receipt No:</label>
            <input
              type="text"
              placeholder="Search by donor name or receipt number..."
              className="filter-input combined-search"
              value={filters.donor_or_receipt}
              onChange={(e) => handleFilterChange('donor_or_receipt', e.target.value)}
              title="Search by donor name (e.g., 'John Doe') or receipt number (e.g., 'A-0001')"
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Village:</label>
            <div className="filter-select-wrapper">
              <Select
                options={filteredVillageOptions}
                value={filters.village ? { value: filters.village, label: filters.village } : null}
                onChange={(selected) => handleFilterChange('village', selected ? selected.value : '')}
                onInputChange={(value) => setVillageSearchTerm(value)}
                isSearchable={true}
                isClearable={true}
                placeholder="Select village..."
                menuPortalTarget={document.body}
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '38px',
                    height: '38px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    boxShadow: 'none',
                    '&:hover': {
                      borderColor: '#d1d5db'
                    }
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    padding: '0 0.75rem',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center'
                  }),
                  singleValue: (base) => ({
                    ...base,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 'calc(100% - 8px)',
                    fontSize: '0.9rem',
                    lineHeight: '1',
                    margin: 0,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }),
                  input: (base) => ({
                    ...base,
                    margin: 0,
                    padding: 0,
                    fontSize: '0.9rem'
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: '#a0aec0',
                    fontSize: '0.95rem',
                    lineHeight: '1',
                    margin: 0
                  }),
                  indicatorsContainer: (base) => ({
                    ...base,
                    height: '38px'
                  }),
                  indicatorSeparator: () => ({
                    display: 'none'
                  }),
                  dropdownIndicator: (base) => ({
                    ...base,
                    padding: '8px'
                  }),
                  clearIndicator: (base) => ({
                    ...base,
                    padding: '8px'
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999
                  }),
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999
                  })
                }}
              />
            </div>
          </div>
        </div>
        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Receipt No:</label>
            <input
              type="text"
              placeholder="Search by receipt number (e.g., A-0001)..."
              className="filter-input"
              value={filters.receipt_no}
              onChange={(e) => handleFilterChange('receipt_no', e.target.value)}
              title="Search by receipt number"
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Payment Mode:</label>
            <select
              className="filter-select"
              value={filters.payment_mode}
              onChange={(e) => handleFilterChange('payment_mode', e.target.value)}
            >
              <option value="">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Online">Online</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group filter-buttons">
            <button onClick={handleSearch} className="btn btn-search">
              🔍 Search
            </button>
            <button onClick={clearFilters} className="btn btn-clear">
              🗑️ Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <span>Showing {receipts.length} of {totalReceipts} receipts</span>
        <span>Page {currentPage} of {totalPages}</span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <span>Loading receipts...</span>
        </div>
      )}

      {/* Receipts Table */}
      {!loading && (
        <div className="table-container">
          <table className="receipts-table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Donor Name</th>
                <th>Village</th>
                <th>Residence</th>
                <th>Payment Mode</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-data">
                    No receipts found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt.id} className={receipt.status === 'cancelled' ? 'cancelled-row' : ''}>
                    <td className="receipt-no">{receipt.receipt_no}</td>
                    <td>{formatDate(receipt.receipt_date)}</td>
                    <td className="donor-name">{receipt.donor_name}</td>
                    <td>{receipt.village || '-'}</td>
                    <td>{receipt.residence || '-'}</td>
                    <td className="payment-mode">{receipt.payment_mode}</td>
                    <td className="amount">{formatCurrency(receipt.total_amount)}</td>
                    <td>
                      <span className={`status-badge ${receipt.status}`}>
                        {receipt.status}
                      </span>
                    </td>
                    <td className="actions">
                      {receipt.status !== 'cancelled' && (
                        <>
                          <button
                            onClick={() => handleEditReceipt(receipt)}
                            className="btn-action btn-edit-small"
                            title="Edit Receipt"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteReceipt(receipt.id, receipt.receipt_no)}
                            className="btn-action btn-delete"
                            title="Cancel Receipt"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {receipt.status === 'cancelled' && (
                        <span className="cancelled-text">Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1}
            className="btn btn-pagination"
          >
            ⬅️ Previous
          </button>
          
          <div className="page-numbers">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              if (
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 2 && page <= currentPage + 2)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`btn btn-page-number ${page === currentPage ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 3 || page === currentPage + 3) {
                return <span key={page} className="page-ellipsis">...</span>;
              }
              return null;
            })}
          </div>

          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages}
            className="btn btn-pagination"
          >
            Next ➡️
          </button>
        </div>
      )}


      {/* StatusOverlay for messages */}
      <StatusOverlay
        isVisible={overlayState.isVisible}
        message={overlayState.message}
        isError={overlayState.isError}
        errorType={overlayState.errorType}
        onRetry={null}
        onClose={() => setOverlayState({ ...overlayState, isVisible: false })}
        onLoginAgain={overlayState.errorType === 'unauthorized' || overlayState.errorType === 'auth' ? logout : null}
      />
    </div>
  );
};

export default ModifyReceipt;
