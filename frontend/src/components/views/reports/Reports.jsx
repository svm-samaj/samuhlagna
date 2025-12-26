import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { API_URLS } from '../../../utils/fetchurl';
import StatusOverlay from '../../common/StatusOverlay';
import { handleAPIError, formatPermissionMessage, isPermissionError } from '../../../utils/errorHandler';
import axios from 'axios';
import qs from 'qs';
import './Reports.css';

const Reports = () => {
  const { user, logout } = useAuth();
  
  // State management
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [latestTotalCount, setLatestTotalCount] = useState(0); // Latest total count from API
  const itemsPerPage = 15; // More items for reports

  // Report view state
  const [reportView, setReportView] = useState('detailed'); // 'detailed', 'summary'
  
  // Available users for "created by" filter
  const [availableUsers, setAvailableUsers] = useState([]);
  const [hasUserFilterPermission, setHasUserFilterPermission] = useState(true);
  
  // Dropdown state for created by filter
  const [isCreatedByDropdownOpen, setIsCreatedByDropdownOpen] = useState(false);
  
  // Track initial render to prevent duplicate API calls
  const [isInitialRender, setIsInitialRender] = useState(true);
  
  // Filter states for reports
  const [filters, setFilters] = useState({
    created_by: ['all'], // Multiple selection - default to 'all'
    date_from: '',
    date_to: '',
    payment_mode: '',
    donation_purpose: '',
    village: '',
    status: ''
  });

  // Applied filters state (what's actually sent to API)
  const [appliedFilters, setAppliedFilters] = useState({
    created_by: ['all'],
    date_from: '',
    date_to: '',
    payment_mode: '',
    donation_purpose: '',
    village: '',
    status: ''
  });

  // Summary data
  const [summaryData, setSummaryData] = useState({
    byCreator: [],
    byPaymentMode: [],
    byYear: []
    // byPurpose: [] // Commented out - replaced with byYear
  });

  // Overlay state for messages
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: '',
    isError: false,
    errorType: 'general',
    pendingAction: null
  });

  // Load receipts from API
  const loadReceipts = async () => {
    try {
      setLoading(true);
      
      // Build query parameters - no filters for summary view
      const apiFilters = {};
      
      // Only apply filters in detailed view
      if (reportView === 'detailed') {
        // Handle date range
        if (appliedFilters.date_from) apiFilters.date_from = appliedFilters.date_from;
        if (appliedFilters.date_to) apiFilters.date_to = appliedFilters.date_to;
        
        // Handle creators - backend only supports single creator filtering
        if (appliedFilters.created_by.length === 1 && !appliedFilters.created_by.includes('all')) {
          // Find the actual user ID for the selected filter
          let selectedUserId = appliedFilters.created_by[0];
          
          // If the filter value is not a number, find the corresponding user ID from availableUsers
          if (isNaN(selectedUserId)) {
            console.log('🆔 USER ID DEBUG - Looking up user ID for selectedUserId:', selectedUserId, typeof selectedUserId);
            console.log('🆔 USER ID DEBUG - Available users for lookup:', availableUsers.map(u => ({
              id: u.id, 
              username: u.username, 
              display_name: u.display_name,
              idType: typeof u.id,
              matches: u.id === selectedUserId || u.id === selectedUserId.toString()
            })));
            
            const selectedUser = availableUsers.find(u => 
              u.display_name === selectedUserId || u.username === selectedUserId
            );
            if (selectedUser) {
              selectedUserId = selectedUser.id;
              console.log(`🔍 ADMIN FILTER DEBUG: SUCCESS - Mapped "${appliedFilters.created_by[0]}" to user ID ${selectedUserId}`);
            } else {
              console.error(`🔍 ADMIN FILTER DEBUG: FAILED - Could not find user for filter: ${selectedUserId}`);
              console.error('🔍 ADMIN FILTER DEBUG: Available usernames:', availableUsers.map(u => u.username));
              console.error('🔍 ADMIN FILTER DEBUG: Available display_names:', availableUsers.map(u => u.display_name));
            }
          }
          
          // Single creator selected - send to API
          apiFilters.created_by = parseInt(selectedUserId);
          console.log(`🔍 ADMIN FILTER DEBUG: Final API filter - created_by = ${apiFilters.created_by} (type: ${typeof apiFilters.created_by})`);
          console.log('🔍 ADMIN FILTER DEBUG: All API filters being sent:', apiFilters);
        }
        // If multiple creators selected, we'll filter on frontend after getting results
        
        // Handle other filters
        if (appliedFilters.payment_mode) apiFilters.payment_mode = appliedFilters.payment_mode;
        if (appliedFilters.donation_purpose) apiFilters.donation1_purpose = appliedFilters.donation_purpose;
        if (appliedFilters.village) apiFilters.village = appliedFilters.village;
        if (appliedFilters.status) apiFilters.status = appliedFilters.status;
      }

      // Determine page size based on filtering needs
      let pageSize = itemsPerPage;
      if (reportView === 'summary') {
        pageSize = 10000; // Get all data for complete summary
      } else if (reportView === 'detailed' && 
                 appliedFilters.created_by.length > 1 && 
                 !appliedFilters.created_by.includes('all')) {
        pageSize = 100; // Load more data for frontend filtering
      }

      const queryParams = new URLSearchParams({
        page_num: currentPage,
        page_size: pageSize,
        ...apiFilters
      });

      const response = await axios.get(`${API_URLS.getAllReceipts()}?${queryParams}`);
      
      console.log('🔍 ADMIN FILTER DEBUG - API Response Status:', response.data.status);
      console.log('🔍 ADMIN FILTER DEBUG - API Response Data Count:', response.data.data ? response.data.data.length : 0);
      console.log('🔍 ADMIN FILTER DEBUG - Query URL:', `${API_URLS.getAllReceipts()}?${queryParams}`);
      
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
        let receiptsData = response.data.data;
        
        console.log('🔍 ADMIN FILTER DEBUG - Receipts returned from API:');
        console.log('🔍 ADMIN FILTER DEBUG - Total receipts:', receiptsData.length);
        if (receiptsData.length > 0) {
          const createdByValues = [...new Set(receiptsData.map(r => r.created_by))];
          console.log('🔍 ADMIN FILTER DEBUG - Unique created_by values in response:', createdByValues);
          console.log('🔍 ADMIN FILTER DEBUG - First few receipts created_by:', 
            receiptsData.slice(0, 5).map(r => ({ 
              receipt_no: r.receipt_no, 
              created_by: r.created_by,
              created_by_username: r.created_by_username 
            }))
          );
        }
        
        // Handle frontend filtering for multiple creators (detailed view only)
        if (reportView === 'detailed' && 
            appliedFilters.created_by.length > 1 && 
            !appliedFilters.created_by.includes('all')) {
          
          console.log('Filtering receipts by multiple creators:', appliedFilters.created_by);
          
          // Convert created_by filter values to user IDs for comparison
          const creatorIds = appliedFilters.created_by.map(filterValue => {
            // If it's already a number, use it
            if (!isNaN(filterValue)) {
              return parseInt(filterValue);
            }
            
            // Find user ID by display name or username
            const user = availableUsers.find(u => 
              u.display_name === filterValue || u.username === filterValue
            );
            
            if (user) {
              console.log(`🐛 DEBUG: Frontend filter mapped "${filterValue}" to user ID ${user.id}`);
              return parseInt(user.id);
            }
            
            console.warn(`⚠️ Frontend filter: Could not find user for ${filterValue}`);
            return null;
          }).filter(id => id !== null); // Remove nulls
          
          console.log('🐛 DEBUG: Final creator IDs for frontend filtering:', creatorIds);
          
          // Filter receipts on frontend
          receiptsData = receiptsData.filter(receipt => 
            creatorIds.includes(receipt.created_by)
          );
          
          console.log(`Filtered ${response.data.data.length} receipts down to ${receiptsData.length} for selected creators`);
        }
        
        setReceipts(receiptsData);
        
        // For multiple creator filtering, adjust totals based on filtered data
        if (reportView === 'detailed' && 
            appliedFilters.created_by.length > 1 && 
            !appliedFilters.created_by.includes('all')) {
          setTotalReceipts(receiptsData.length);
          setTotalPages(Math.ceil(receiptsData.length / itemsPerPage));
          setLatestTotalCount(receiptsData.length); // Update latest total count
          console.log(`📊 Latest Total Count updated: ${receiptsData.length} (frontend filtered)`)
        } else {
          setTotalReceipts(response.data.total_count);
          setTotalPages(reportView === 'summary' ? 1 : Math.ceil(response.data.total_count / itemsPerPage));
          setLatestTotalCount(response.data.total_count); // Update latest total count
          console.log(`📊 Latest Total Count updated: ${response.data.total_count} (from API)`)
        }
        
        // Calculate total amount from actual displayed receipts
        const total = receiptsData.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);
        setTotalAmount(total);
        
        // Load summary data if needed
        if (reportView === 'summary') {
          loadSummaryData();
        }
      } else {
        throw new Error('Failed to load receipts');
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Load available users for filter from database
  const loadAvailableUsers = async () => {
    try {
      console.log('🆔 LOADING USERS: Starting to load available users from API...');
      console.log('🆔 LOADING USERS: API URL:', API_URLS.getReceiptReportsDropdown());
      const response = await axios.get(API_URLS.getReceiptReportsDropdown(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      console.log('API Response:', response.data);
      console.log('Response status:', response.data.status);
      console.log('Response data array:', response.data.data);
      console.log('Response data length:', response.data.data ? response.data.data.length : 'undefined');
      
      if (response.data.status === 'success' && response.data.data) {
        // Format the creators for the dropdown
        const creators = response.data.data.map(user => ({
          id: user.id.toString(), // Convert to string for consistency
          username: user.username,
          display_name: user.username // Use username as-is, no transformation
        }));
        
        console.log('🆔 USER ID DEBUG: Raw API response data:', response.data.data);
        console.log('🆔 USER ID DEBUG: Users with role IDs 1 & 5 from database:', 
          response.data.data.map(user => `${user.username} = ID ${user.id}`)
        );
        console.log('🆔 USER ID DEBUG: Users array for dropdown:', creators.map(c => 
          `${c.username} (ID: ${c.id}, display_name: ${c.display_name})`
        ));
        
        console.log('Users with role IDs 1 & 5 found:', creators);
        console.log('🆔 SETTING USERS: About to set availableUsers to:', creators);
        setAvailableUsers(creators);
        setHasUserFilterPermission(true);
        
        // Immediate verification of what was set
        setTimeout(() => {
          console.log('🆔 VERIFICATION: availableUsers state after setting:', availableUsers.length);
        }, 100);
      } else {
        console.log('No users with role IDs 1 & 5 found in response or invalid format');
        setAvailableUsers([]);
        setHasUserFilterPermission(true); // Still has permission, just no data
      }
    } catch (error) {
      console.error('Error loading users with role IDs 1 & 5:', error);
      setAvailableUsers([]);
      
      if (error.response?.status === 403 || error.response?.status === 422) {
        // User doesn't have permission OR validation error - hide the filter gracefully
        console.log('User does not have permission to access user filter or validation error occurred');
        setHasUserFilterPermission(false);
        // Reset created_by filter to 'all' since user can't filter by specific creators
        setFilters(prev => ({
          ...prev,
          created_by: ['all']
        }));
        // Don't show error overlay for permission/validation issues
        console.log('Created By filter disabled due to access restrictions');
      } else if (error.response?.status === 401) {
        // Session expired - this is a real error that needs user action
        setHasUserFilterPermission(false);
        setOverlayState({
          isVisible: true,
          message: "Your session has expired. Please log in again.",
          isError: true,
          errorType: "general",
          pendingAction: null
        });
      } else {
        // Other errors - show generic error
        setHasUserFilterPermission(false);
        setOverlayState({
          isVisible: true,
          message: "Failed to load user data. Some filters may not be available.",
          isError: true,
          errorType: "general",
          pendingAction: null
        });
      }
    }
  };

  // Load summary data for consolidated reports
  const loadSummaryData = async () => {
    try {
      // Wait for available users to be loaded before calculating summaries
      if (availableUsers.length === 0) {
        console.log('Waiting for users to load before calculating summaries...');
        setTimeout(() => {
          if (availableUsers.length > 0) {
            calculateSummaryFromReceipts();
          }
        }, 1000);
      } else {
        calculateSummaryFromReceipts();
      }
    } catch (error) {
      console.error('Error loading summary data:', error);
    }
  };

  // Helper function to display usernames exactly as they are in database - NO TRANSFORMATION
  const transformUsernameToDisplay = (username) => {
    // Return username exactly as-is from database
    console.log(`✅ SIMPLE: Display username "${username}" as-is (no transformation)`);
    return username || 'Unknown';
  };

  // Helper function to get creator display name from ID
  const getCreatorDisplayName = (createdById, receiptData = null) => {
    if (!createdById) return 'Unknown';
    
    // If we have receipt data with creator username, use it as-is
    if (receiptData && receiptData.created_by_username) {
      return receiptData.created_by_username;
    }
    
    // Convert to string for comparison since availableUsers.id is string
    const createdByStr = createdById.toString();
    
    // Try to find user in availableUsers list (when user has permission)
    const foundUser = availableUsers.find(u => u.id === createdByStr);
    if (foundUser) {
      return foundUser.display_name;
    }
    
    // Look for any receipt with creator username info from current receipts
    if (receipts.length > 0) {
      const receiptWithCreator = receipts.find(r => 
        r.created_by === createdById && r.created_by_username
      );
      if (receiptWithCreator) {
        return receiptWithCreator.created_by_username;
      }
    }
    
    // Check if this is the current user from AuthContext
    if (user && user.id === createdById && user.username) {
      return user.username;
    }
    
    // Check if this is the current user from localStorage (fallback)
    try {
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        const currentUserData = JSON.parse(userDataStr);
        if (currentUserData && currentUserData.id === createdById && currentUserData.username) {
          return currentUserData.username;
        }
      }
    } catch (error) {
      console.warn('Error parsing user_data from localStorage:', error);
    }
    
    // Final fallback - try to get from availableUsers by ID (without transformation)
    if (createdById === 1 || createdById === 2) {
      const adminUser = availableUsers.find(u => u.id === createdById.toString());
      if (adminUser && adminUser.username) {
        return adminUser.username; // Use actual username from database
      }
    }
    
    return `User ID ${createdById}`;
  };

  // Calculate summary from current receipts
  const calculateSummaryFromReceipts = () => {
    const byCreator = {};
    const byPaymentMode = {};
    const byYear = {};
    // const byPurpose = {}; // Commented out - replaced with byYear

    console.log('Calculating summary from receipts:', receipts.length);
    console.log('Available users for mapping:', availableUsers);

    receipts.forEach(receipt => {
      // By Creator - map created_by ID to display name
      const creatorId = receipt.created_by;
      const creator = getCreatorDisplayName(creatorId, receipt);
      
      console.log(`Receipt ${receipt.receipt_no}: created_by=${creatorId} → ${creator}`);
      
      if (!byCreator[creator]) {
        byCreator[creator] = { count: 0, total: 0 };
      }
      byCreator[creator].count++;
      byCreator[creator].total += receipt.total_amount;

      // By Payment Mode
      const paymentMode = receipt.payment_mode;
      if (!byPaymentMode[paymentMode]) {
        byPaymentMode[paymentMode] = { count: 0, total: 0 };
      }
      byPaymentMode[paymentMode].count++;
      byPaymentMode[paymentMode].total += receipt.total_amount;

      // By Year - extract year from receipt_date
      const receiptDate = new Date(receipt.receipt_date);
      const year = receiptDate.getFullYear();
      const yearKey = isNaN(year) ? 'Unknown Year' : year.toString();
      
      if (!byYear[yearKey]) {
        byYear[yearKey] = { count: 0, total: 0 };
      }
      byYear[yearKey].count++;
      byYear[yearKey].total += receipt.total_amount;

      // By Purpose - Commented out
      // const purpose = receipt.donation1_purpose || 'Not specified';
      // if (!byPurpose[purpose]) {
      //   byPurpose[purpose] = { count: 0, total: 0 };
      // }
      // byPurpose[purpose].count++;
      // byPurpose[purpose].total += receipt.total_amount;
    });

    console.log('Summary by creator:', byCreator);
    console.log('Summary by year:', byYear);

    setSummaryData({
      byCreator: Object.entries(byCreator).map(([key, value]) => ({ name: key, ...value })),
      byPaymentMode: Object.entries(byPaymentMode).map(([key, value]) => ({ name: key, ...value })),
      byYear: Object.entries(byYear).map(([key, value]) => ({ name: key, ...value })).sort((a, b) => b.name.localeCompare(a.name)) // Sort by year descending
      // byPurpose: Object.entries(byPurpose).map(([key, value]) => ({ name: key, ...value })) // Commented out
    });
  };

  // Handle API errors with new centralized error handler
  const handleApiError = (error) => {
    console.error('Detailed API error:', error);
    
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
  };

  // Initial load - load users and initial data
  useEffect(() => {
    loadAvailableUsers();
    loadReceipts();
  }, []);

  // Load receipts when page, filters, or view changes (excluding initial render)
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
      return; // Skip the first render to avoid duplicate API call
    }
    loadReceipts();
  }, [currentPage, appliedFilters, reportView]);

  // Recalculate summaries when availableUsers changes
  useEffect(() => {
    if (reportView === 'summary' && receipts.length > 0 && availableUsers.length > 0) {
      console.log('Recalculating summaries with updated user data...');
      calculateSummaryFromReceipts();
    }
  }, [availableUsers, receipts, reportView]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown')) {
        setIsCreatedByDropdownOpen(false);
      }
    };

    if (isCreatedByDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCreatedByDropdownOpen]);

  // Handle filter changes (no longer triggers API call)
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Don't reset page or trigger API call - wait for search button
  };

  // Handle search button click
  const handleSearch = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      created_by: ['all'],
      date_from: '',
      date_to: '',
      payment_mode: '',
      donation_purpose: '',
      village: '',
      status: ''
    };
    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    setCurrentPage(1);
  };

  // Handle created by checkbox changes
  const handleCreatedByChange = (userId) => {
    console.log('🆔 USER ID DEBUG - Checkbox clicked with userId:', userId, 'type:', typeof userId);
    console.log('🆔 USER ID DEBUG - Current filters.created_by:', filters.created_by);
    console.log('🆔 USER ID DEBUG - Available users for mapping:', availableUsers.map(u => ({
      id: u.id, 
      username: u.username,
      display_name: u.display_name,
      idType: typeof u.id
    })));
    
    // Find which user this ID belongs to
    const clickedUser = availableUsers.find(u => u.id === userId || u.id === userId.toString());
    console.log('🆔 USER ID DEBUG - Clicked user object:', clickedUser);
    
    setFilters(prev => {
      let newCreatedBy;
      
      if (userId === 'all') {
        // If "All" is currently selected, unselect it and switch to individual mode
        if (prev.created_by.includes('all')) {
          console.log('Unchecking "All" - switching to individual mode');
          newCreatedBy = []; // Unselect all, allow individual selection
        } else {
          // If "All" is not selected, select it and clear individual selections
          console.log('Checking "All" - clearing individual selections');
          newCreatedBy = ['all'];
        }
      } else {
        // If a specific user is selected/unselected
        const currentSelection = prev.created_by.filter(id => id !== 'all'); // Remove "all" from current selection
        
        if (currentSelection.includes(userId)) {
          // If already selected, remove it
          console.log('Unchecking user:', userId);
          newCreatedBy = currentSelection.filter(id => id !== userId);
        } else {
          // If not selected, add it (and make sure "all" is not selected)
          console.log('Checking user:', userId);
          newCreatedBy = [...currentSelection, userId];
        }
      }
      
      console.log('🔍 ADMIN FILTER DEBUG - New created_by selection:', newCreatedBy);
      console.log('🔍 ADMIN FILTER DEBUG - This will trigger useEffect to call loadReceipts');
      
      // Find the user object for this ID to show what's being selected
      if (userId !== 'all' && newCreatedBy.includes(userId)) {
        const selectedUser = availableUsers.find(u => u.id === userId);
        console.log('🔍 ADMIN FILTER DEBUG - Selected user details:', selectedUser);
      }
      
      return {
        ...prev,
        created_by: newCreatedBy
      };
    });
    // Don't reset page or trigger API call - wait for search button
  };

  // Get display text for created by filter
  const getCreatedByDisplayText = () => {
    if (filters.created_by.includes('all')) {
      return '📊 All Users';
    } else if (filters.created_by.length === 0) {
      return '👤 Select Users...';
    } else if (filters.created_by.length === 1) {
      const foundUser = availableUsers.find(u => u.id === filters.created_by[0]);
      return foundUser ? `👤 ${foundUser.display_name}` : 'Select Users...';
    } else {
      return `👥 ${filters.created_by.length} Users Selected`;
    }
  };


  // This function is now replaced by handleClearFilters above



  // Pagination functions
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


  // Fetch all receipts for export with proper filtering
  const fetchAllReceiptsForExport = async () => {
    try {
      console.log('🔄 Fetching all receipts for export with applied filters...');
      
      // Build API filters from applied filters
      const apiFilters = buildApiFilters(appliedFilters);
      
      // Use single API call to get all filtered data (no pagination for export)
      const queryParams = new URLSearchParams({
        page_num: 1,
        page_size: 10000, // Large page size to get all data (not latestTotalCount as it may be filtered)
        ...apiFilters
      });

      console.log('📊 Export API filters:', apiFilters);
      console.log('📊 Export query params:', queryParams.toString());

      const response = await axios.get(`${API_URLS.getAllReceipts()}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        timeout: 60000 // 60 second timeout for exports
      });

      if (response.data.status === 'success') {
        let allReceipts = response.data.data || [];
        
        console.log(`📊 Fetched ${allReceipts.length} receipts for export`);
        
        // Apply frontend filtering for multiple creators if needed
        if (appliedFilters.created_by.length > 1 && !appliedFilters.created_by.includes('all')) {
          const creatorIds = appliedFilters.created_by.map(filterValue => {
            if (!isNaN(filterValue)) {
              return parseInt(filterValue);
            }
            
            const user = availableUsers.find(u => 
              u.display_name === filterValue || u.username === filterValue
            );
            
            return user ? parseInt(user.id) : null;
          }).filter(id => id !== null);
          
          allReceipts = allReceipts.filter(receipt => 
            creatorIds.includes(receipt.created_by)
          );
          
          console.log(`🔍 Frontend filtering applied: ${allReceipts.length} receipts after multiple creator filter`);
        }
        
        return allReceipts;
      } else {
        throw new Error('Failed to fetch receipts for export');
      }
    } catch (error) {
      console.error('❌ Error fetching receipts for export:', error);
      throw error;
    }
  };

  // Smart export function - exports current filtered data with original format
  const exportToCSV = async () => {
    try {
      console.log('🔄 Starting CSV export with original format...');
      
      // Determine if filters are applied
      const hasFilters = appliedFilters.date_from || appliedFilters.date_to || appliedFilters.payment_mode || 
                        appliedFilters.donation_purpose || appliedFilters.village || appliedFilters.status ||
                        (appliedFilters.created_by.length > 0 && !appliedFilters.created_by.includes('all'));
      
      const exportType = hasFilters ? 'filtered' : 'all';
      console.log(`📊 Starting CSV export (${exportType} data)...`);
      
      const allReceipts = await fetchAllReceiptsForExport();
      
      if (!allReceipts || allReceipts.length === 0) {
        console.warn('❌ No receipts to export');
        setOverlayState({
          isVisible: true,
          message: 'No receipts found to export with current filters',
          isError: true,
          errorType: "general",
          pendingAction: null
        });
        return;
      }
      
      console.log(`✅ Exporting ${allReceipts.length} receipts to CSV`);
      
      // Create CSV data with original format
      const csvData = allReceipts.map(receipt => ({
        'Receipt No': receipt.receipt_no,
        'Date': formatDate(receipt.receipt_date),
        'Donor Name': receipt.donor_name,
        'Village': receipt.village || '',
        'Residence': receipt.residence || '',
        'Mobile': receipt.mobile || '',
        'Payment Mode': receipt.payment_mode,
        'Donation Purpose': receipt.donation1_purpose || '',
        'Donation 1': receipt.donation1_amount || 0,
        'Donation 2': receipt.donation2_amount || 0,
        'Total Amount': receipt.total_amount,
        'Status': receipt.status,
        'Created By': getCreatorDisplayName(receipt.created_by, receipt)
      }));

      // Calculate totals from all receipts
      const totalDonation1 = allReceipts.reduce((sum, receipt) => sum + (receipt.donation1_amount || 0), 0);
      const totalDonation2 = allReceipts.reduce((sum, receipt) => sum + (receipt.donation2_amount || 0), 0);
      const grandTotal = allReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);

      // Add summary rows
      const summaryTitle = hasFilters ? 'FILTERED SUMMARY' : 'TOTAL SUMMARY';
      const recordsLabel = hasFilters ? `Total Filtered Records: ${allReceipts.length}` : `Total Records: ${allReceipts.length}`;
      
      const summaryData = [
        {},
        { 'Receipt No': summaryTitle, 'Donor Name': recordsLabel },
        { 'Receipt No': 'TOTALS', 'Donation Purpose': 'Total Donation 1:', 'Donation 1': totalDonation1 },
        { 'Receipt No': '', 'Donation Purpose': 'Total Donation 2:', 'Donation 2': totalDonation2 },
        { 'Receipt No': '', 'Donation Purpose': 'GRAND TOTAL:', 'Total Amount': grandTotal }
      ];

      const allData = [...csvData, ...summaryData];
      const headers = Object.keys(csvData[0]);
      
      const csvContent = [
        headers.join(','),
        ...allData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = hasFilters 
        ? `receipts_filtered_${new Date().toISOString().split('T')[0]}.csv`
        : `receipts_all_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ CSV export completed: ${allReceipts.length} records exported`);
      
      // Show success message
      const exportInfo = hasFilters 
        ? `CSV export completed! Exported ${allReceipts.length} filtered records.`
        : `CSV export completed! Exported all ${allReceipts.length} records.`;
        
      setOverlayState({
        isVisible: true,
        message: exportInfo,
        isError: false,
        errorType: "general",
        pendingAction: null
      });

      // Hide overlay after 3 seconds
      setTimeout(() => {
        setOverlayState(prev => ({ ...prev, isVisible: false }));
      }, 3000);

    } catch (error) {
      console.error('CSV Export Error:', error);
      let errorMessage = 'CSV Export failed';
      
      if (error.response?.status === 403) {
        errorMessage = 'Permission denied: You do not have access to export receipts';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Export timeout: The export is taking too long. Please try with more specific filters.';
      } else if (error.message) {
        errorMessage = `CSV Export failed: ${error.message}`;
      }
      
      setOverlayState({
        isVisible: true,
        message: `❌ ${errorMessage}`,
        isError: true,
        errorType: "general",
        pendingAction: null
      });
      setTimeout(() => setOverlayState(prev => ({ ...prev, isVisible: false })), 5000);
    }
  };

  // Smart PDF export function - exports current filtered data with original format
  const exportToPDF = async () => {
    try {
      // Determine if filters are applied
      const hasFilters = appliedFilters.date_from || appliedFilters.date_to || appliedFilters.payment_mode || 
                        appliedFilters.donation_purpose || appliedFilters.village || appliedFilters.status ||
                        (appliedFilters.created_by.length > 0 && !appliedFilters.created_by.includes('all'));
      
      const exportType = hasFilters ? 'filtered' : 'all';
      console.log(`🔄 Starting PDF export (${exportType} data)...`);
      
      const allReceipts = await fetchAllReceiptsForExport();
      
      if (!allReceipts || allReceipts.length === 0) {
        console.warn('❌ No receipts to export to PDF');
        setOverlayState({
          isVisible: true,
          message: 'No receipts found to export with current filters',
          isError: true,
          errorType: "general",
          pendingAction: null
        });
        return;
      }
      
      console.log(`✅ Exporting ${allReceipts.length} receipts to PDF`);
      
      // Calculate totals from all receipts
      const totalDonation1 = allReceipts.reduce((sum, receipt) => sum + (receipt.donation1_amount || 0), 0);
      const totalDonation2 = allReceipts.reduce((sum, receipt) => sum + (receipt.donation2_amount || 0), 0);
      const grandTotal = allReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);

      // Create HTML content for PDF with original format
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt Reports - ${new Date().toLocaleDateString()}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .header h1 { 
              color: #333; 
              margin: 0 0 5px 0;
              font-size: 24px;
            }
            .header p { 
              color: #666; 
              margin: 0;
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left;
            }
            th { 
              background-color: #f4f4f4; 
              font-weight: bold;
              font-size: 11px;
            }
            td { 
              font-size: 10px;
            }
            .summary-table {
              margin-top: 20px;
              width: 50%;
              margin-left: auto;
            }
            .summary-table th {
              background-color: #e8f4f8;
              text-align: right;
            }
            .summary-table td {
              font-weight: bold;
              text-align: right;
            }
            .grand-total {
              background-color: #d4edda !important;
              font-weight: bold;
              font-size: 12px;
            }
            .cancelled-row {
              background-color: #f8d7da;
              text-decoration: line-through;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Receipt Reports${hasFilters ? ' (Filtered)' : ''}</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>${hasFilters ? 'Filtered' : 'Total'} Records: ${allReceipts.length} | Total Amount: ${formatCurrency(grandTotal)}</p>
            ${hasFilters ? '<p style="font-size: 10px; color: #666;">Note: This report shows filtered data only</p>' : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Donor Name</th>
                <th>Village</th>
                <th>Residence</th>
                <th>Mobile</th>
                <th>Payment</th>
                <th>Purpose</th>
                <th>Donation 1</th>
                <th>Donation 2</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              ${allReceipts.map(receipt => `
                <tr class="${receipt.status === 'cancelled' ? 'cancelled-row' : ''}">
                  <td>${receipt.receipt_no}</td>
                  <td>${formatDate(receipt.receipt_date)}</td>
                  <td>${receipt.donor_name}</td>
                  <td>${receipt.village || '-'}</td>
                  <td>${receipt.residence || '-'}</td>
                  <td>${receipt.mobile || '-'}</td>
                  <td>${receipt.payment_mode}</td>
                  <td>${receipt.donation1_purpose || '-'}</td>
                  <td>${formatCurrency(receipt.donation1_amount || 0)}</td>
                  <td>${formatCurrency(receipt.donation2_amount || 0)}</td>
                  <td>${formatCurrency(receipt.total_amount)}</td>
                  <td>${receipt.status}</td>
                  <td>${getCreatorDisplayName(receipt.created_by, receipt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="summary-table">
            <thead>
              <tr>
                <th colspan="2">Summary Totals</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Total Records:</th>
                <td>${allReceipts.length}</td>
              </tr>
              <tr>
                <th>Total Donation 1:</th>
                <td>${formatCurrency(totalDonation1)}</td>
              </tr>
              <tr>
                <th>Total Donation 2:</th>
                <td>${formatCurrency(totalDonation2)}</td>
              </tr>
              <tr class="grand-total">
                <th>GRAND TOTAL:</th>
                <td>${formatCurrency(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>This report was generated from the Receipt Management System</p>
            <p>Filters Applied: ${getActiveFiltersText()}</p>
          </div>
        </body>
        </html>
      `;

      // Create a new window and print
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        console.warn('Popup blocked, trying alternative PDF export method...');
        try {
          // Fallback: Blob URL in new tab
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const newTab = window.open(url, '_blank');
          if (!newTab) {
            throw new Error('Unable to open new tab. Please check popup blockers.');
          }
          setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
          
          setOverlayState({
            isVisible: true,
            message: `PDF export opened in new tab! Use your browser's print function to save as PDF. (${allReceipts.length} records)`,
            isError: false,
            errorType: "general",
            pendingAction: null
          });
        } catch (fallbackError) {
          console.error('Fallback PDF export failed:', fallbackError);
          // Final fallback: download HTML file
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `receipt-report-${new Date().toISOString().split('T')[0]}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          setOverlayState({
            isVisible: true,
            message: `Report downloaded as HTML file! Open it in your browser and use Ctrl+P to print/save as PDF. (${allReceipts.length} records)`,
            isError: false,
            errorType: "general",
            pendingAction: null
          });
        }
      } else {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
          printWindow.print();
          // Close window after printing
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        };

        // Show success message with export info
        const exportInfo = hasFilters 
          ? `PDF export initiated for ${allReceipts.length} filtered records! Please check your browser's print dialog.`
          : `PDF export initiated for all ${allReceipts.length} records! Please check your browser's print dialog.`;
          
        setOverlayState({
          isVisible: true,
          message: exportInfo,
          isError: false,
          errorType: "general",
          pendingAction: null
        });

        // Auto-hide overlay after 3 seconds
        setTimeout(() => {
          setOverlayState({
            isVisible: false,
            message: "",
            isError: false,
            errorType: "general",
            pendingAction: null
          });
        }, 3000);
      }

    } catch (error) {
      console.error('PDF Export Error:', error);
      let errorMessage = 'PDF Export failed';
      
      if (error.response?.status === 403) {
        errorMessage = 'Permission denied: You do not have access to export receipts';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Export timeout: The export is taking too long. Please try with more specific filters.';
      } else if (error.message) {
        errorMessage = `PDF Export failed: ${error.message}`;
      }
      
      setOverlayState({
        isVisible: true,
        message: `❌ ${errorMessage}`,
        isError: true,
        errorType: "general",
        pendingAction: null
      });
      setTimeout(() => setOverlayState(prev => ({ ...prev, isVisible: false })), 5000);
    }
  };

  // Helper function to determine what will be exported
  const getExportDescription = () => {
    const hasFilters = appliedFilters.date_from || appliedFilters.date_to || appliedFilters.payment_mode || 
                      appliedFilters.donation_purpose || appliedFilters.village || appliedFilters.status ||
                      (appliedFilters.created_by.length > 0 && !appliedFilters.created_by.includes('all'));
    
    if (hasFilters) {
      return `Export filtered data (${totalReceipts} records)`;
    } else {
      return `Export all data (${totalReceipts} records)`;
    }
  };

  // Helper function to build API filters from applied filters
  const buildApiFilters = (filters) => {
    const apiFilters = {};
    
    // Handle date range
    if (filters.date_from) apiFilters.date_from = filters.date_from;
    if (filters.date_to) apiFilters.date_to = filters.date_to;
    
    // Handle other filters
    if (filters.payment_mode) apiFilters.payment_mode = filters.payment_mode;
    if (filters.donation_purpose) apiFilters.donation1_purpose = filters.donation_purpose;
    if (filters.village) apiFilters.village = filters.village;
    if (filters.status) apiFilters.status = filters.status;
    
    // Handle creator filtering - only single creator for backend API
    if (filters.created_by.length === 1 && !filters.created_by.includes('all')) {
      let selectedUserId = filters.created_by[0];
      
      // If the filter value is not a number, find the corresponding user ID
      if (isNaN(selectedUserId)) {
        const selectedUser = availableUsers.find(u => 
          u.display_name === selectedUserId || u.username === selectedUserId
        );
        if (selectedUser) {
          selectedUserId = selectedUser.id;
        }
      }
      
      apiFilters.created_by = parseInt(selectedUserId);
    }
    // Note: Multiple creators will be handled by frontend filtering if needed
    
    return apiFilters;
  };

  // Helper function to get active filters text
  const getActiveFiltersText = () => {
    const activeFilters = [];
    
    if (!appliedFilters.created_by.includes('all') && appliedFilters.created_by.length > 0) {
      const userNames = appliedFilters.created_by.map(id => {
        const foundUser = availableUsers.find(u => u.id === id);
        return foundUser ? foundUser.display_name : `User ${id}`;
      });
      activeFilters.push(`Created By: ${userNames.join(', ')}`);
    }
    
    if (appliedFilters.date_from) activeFilters.push(`Date From: ${appliedFilters.date_from}`);
    if (appliedFilters.date_to) activeFilters.push(`Date To: ${appliedFilters.date_to}`);
    if (appliedFilters.payment_mode) activeFilters.push(`Payment Mode: ${appliedFilters.payment_mode}`);
    if (appliedFilters.status) activeFilters.push(`Status: ${appliedFilters.status}`);
    if (appliedFilters.donation_purpose) activeFilters.push(`Purpose: ${appliedFilters.donation_purpose}`);
    if (appliedFilters.village) activeFilters.push(`Village: ${appliedFilters.village}`);
    
    return activeFilters.length > 0 ? activeFilters.join(' | ') : 'No filters applied';
  };

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="reports-container">
      {/* Page Header */}
      <div className="reports-header">
        <h1 className="page-title">📊 Receipt Reports</h1>
        <div className="report-view-tabs">
          <button 
            className={`tab-btn ${reportView === 'detailed' ? 'active' : ''}`}
            onClick={() => {
              setReportView('detailed');
              setCurrentPage(1);
            }}
          >
            📋 Detailed View
          </button>
          <button 
            className={`tab-btn ${reportView === 'summary' ? 'active' : ''}`}
            onClick={() => {
              setReportView('summary');
              setCurrentPage(1);
            }}
          >
            📈 Summary Reports
          </button>
        </div>
      </div>

      {/* Filters Section - Only show in Detailed View */}
      {reportView === 'detailed' && (
        <div className="filters-section">
        {/* First Row: Created By, Date Range, Payment Mode, Status */}
        <div className="filters-row">
          {/* Created By Filter (Custom Dropdown with Checkboxes) - Only show if user has permission */}
          {hasUserFilterPermission ? (
            <div className="filter-group">
              <label className="filter-label">Created By:</label>
              <div className="custom-dropdown">
                <div 
                  className="dropdown-button"
                  onClick={() => setIsCreatedByDropdownOpen(!isCreatedByDropdownOpen)}
                >
                  <span className={`dropdown-text ${filters.created_by.length === 0 ? 'empty-state' : ''}`}>
                    {getCreatedByDisplayText()}
                  </span>
                  <span className={`dropdown-arrow ${isCreatedByDropdownOpen ? 'open' : ''}`}>▼</span>
                </div>
                
                {isCreatedByDropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-item all-users-item">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={filters.created_by.includes('all')}
                          onChange={() => handleCreatedByChange('all')}
                        />
                        <span className="checkmark"></span>
                        <span className="checkbox-label">📊 All Users</span>
                      </label>
                    </div>
                    
                    <div className="dropdown-separator"></div>
                    
                    {availableUsers.length === 0 ? (
                      <div className="dropdown-item">
                        <span className="loading-text">Loading users...</span>
                      </div>
                    ) : (
                      availableUsers.map((user, index) => {
                        console.log(`🆔 CHECKBOX DEBUG [${index}]: Rendering checkbox for:`, {
                          username: user.username,
                          id: user.id,
                          idType: typeof user.id,
                          display_name: user.display_name,
                          isChecked: filters.created_by.includes(user.id)
                        });
                        
                        return (
                          <div key={user.id} className="dropdown-item">
                            <label className="checkbox-container">
                              <input
                                type="checkbox"
                                checked={filters.created_by.includes(user.id)}
                                onChange={() => {
                                  console.log(`🆔 CHECKBOX CLICK: User "${user.username}" clicked with ID: ${user.id} (${typeof user.id})`);
                                  handleCreatedByChange(user.id);
                                }}
                              />
                              <span className="checkmark"></span>
                              <span className="checkbox-label">👤 {user.display_name}</span>
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Show a placeholder when user doesn't have permission */
            <div className="filter-group">
              <label className="filter-label" style={{color: '#9ca3af'}}>Created By:</label>
              <div className="dropdown-button" style={{backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed'}}>
                <span className="dropdown-text">Filter not available</span>
                <span className="dropdown-arrow" style={{color: '#d1d5db'}}>▼</span>
              </div>
            </div>
          )}

          {/* Date From */}
          <div className="filter-group">
            <label className="filter-label">Date From:</label>
            <input
              type="date"
              className="filter-input"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="filter-group">
            <label className="filter-label">Date To:</label>
            <input
              type="date"
              className="filter-input"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>

          {/* Payment Mode */}
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

          {/* Status */}
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
        </div>

        {/* Second Row: Donation Purpose, Village, Action Buttons */}
        <div className="filters-row">
          {/* Donation Purpose */}
          <div className="filter-group">
            <label className="filter-label">Donation Purpose:</label>
            <input
              type="text"
              placeholder="Enter donation purpose..."
              className="filter-input"
              value={filters.donation_purpose}
              onChange={(e) => handleFilterChange('donation_purpose', e.target.value)}
            />
          </div>

          {/* Village */}
          <div className="filter-group">
            <label className="filter-label">Village:</label>
            <input
              type="text"
              placeholder="Enter village name..."
              className="filter-input"
              value={filters.village}
              onChange={(e) => handleFilterChange('village', e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="filter-group filter-buttons">
            <button onClick={handleSearch} className="reports-btn reports-btn-search">
              🔍 Search
            </button>
            <button onClick={handleClearFilters} className="reports-btn reports-btn-clear">
              🗑️ Clear Filters
            </button>
            <button 
              onClick={exportToCSV} 
              className="reports-btn reports-btn-export"
              title={getExportDescription()}
            >
              📊 Export CSV
            </button>
            <button 
              onClick={exportToPDF} 
              className="reports-btn reports-btn-export-pdf"
              title={getExportDescription()}
            >
              📄 Export PDF
            </button>
          </div>
          <div style={{fontSize: '12px', color: '#666', marginTop: '5px', textAlign: 'center'}}>
            {getExportDescription()}
          </div>
        </div>
        
        </div>
      )}

      {/* Results Summary - Only show in Detailed View */}
      {reportView === 'detailed' && (
        <div className="results-summary">
          <span>Showing {receipts.length} of {totalReceipts} receipts</span>
          <span>Total Amount: {formatCurrency(totalAmount)}</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <span>Loading reports...</span>
        </div>
      )}

      {/* Content based on report view */}
      {!loading && reportView === 'detailed' && (
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
                <th>Purpose</th>
                <th>Total Amount</th>
                <th>Created By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-data">
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
                    <td className="donation-purpose">{receipt.donation1_purpose || '-'}</td>
                    <td className="amount">{formatCurrency(receipt.total_amount)}</td>
                    <td className="created-by">{receipt.created_by_username || '-'}</td>
                    <td>
                      <span className={`status-badge ${receipt.status}`}>
                        {receipt.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Reports View */}
      {!loading && reportView === 'summary' && (
        <div className="summary-reports">
          {/* Summary Overview */}
          <div className="summary-overview">
            <div className="overview-card">
              <h3>📊 Overall Statistics</h3>
              <div className="overview-stats">
                <div className="stat-item">
                  <span className="stat-value">{totalReceipts}</span>
                  <span className="stat-label">Total Receipts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{formatCurrency(totalAmount)}</span>
                  <span className="stat-label">Total Amount*</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{availableUsers.length}</span>
                  <span className="stat-label">Active Creators</span>
                </div>
              </div>
            </div>
          </div>

          <div className="summary-grid">
            {/* By Creator Summary */}
            <div className="summary-card">
              <h3>📊 By Creator</h3>
              <div className="summary-table">
                <table>
                  <thead>
                    <tr>
                      <th>Creator</th>
                      <th>Count</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.byCreator.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.count}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Payment Mode Summary */}
            <div className="summary-card">
              <h3>💳 By Payment Mode</h3>
              <div className="summary-table">
                <table>
                  <thead>
                    <tr>
                      <th>Payment Mode</th>
                      <th>Count</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.byPaymentMode.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.count}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Year Summary */}
            <div className="summary-card">
              <h3>📅 By Year</h3>
              <div className="summary-table">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Count</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.byYear.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.count}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Purpose Summary - Commented out */}
            {/* 
            <div className="summary-card">
              <h3>🎯 By Purpose</h3>
              <div className="summary-table">
                <table>
                  <thead>
                    <tr>
                      <th>Purpose</th>
                      <th>Count</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.byPurpose.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.count}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            */}

          </div>
        </div>
      )}


      {/* Pagination */}
      {totalPages > 1 && reportView === 'detailed' && (
        <div className="pagination">
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1}
            className="reports-btn btn-pagination"
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
                    className={`reports-btn btn-page-number ${page === currentPage ? 'active' : ''}`}
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
            className="reports-btn btn-pagination"
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

export default Reports;
