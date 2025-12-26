import React, { useEffect, useState } from "react";
import axios from "axios";
import qs from "qs";
import AsyncSelect from "react-select/async";
import { API_URLS } from "../../../utils/fetchurl";
import { useBigDataApiCall, useRegularApiCall } from "../../../hooks/useApiCall";
import { useAuth } from "../../../contexts/AuthContext";
import StatusOverlay from "../../common/StatusOverlay";
import Pagination from "../../common/Pagination";
import "./showuserdata.css";
import "./SearchButtons.css";

const ShowUser = () => {
  const [user_data, setUser_data] = useState([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [typeFilters, setTypeFilters] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedVillages, setSelectedVillages] = useState([]);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editSelectedArea, setEditSelectedArea] = useState(null);
  const [editSelectedVillage, setEditSelectedVillage] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Enhanced popup state for StatusOverlay
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: "",
    isError: false,
    errorType: "general",
    pendingAction: null // for delete confirmations
  });

  // API call hooks
  const { loading: usersLoading, error: usersError, execute: executeUsersCall, reset: resetUsersCall } = useBigDataApiCall();
  const { loading: actionLoading, error: actionError, execute: executeActionCall, reset: resetActionCall } = useRegularApiCall();
  const { isAuthenticated, logout } = useAuth(); // Add auth context

  const fetchUsers = async (pageNum = 1, search = "") => {
    try {
      await executeUsersCall(
        ({ signal }) => {
          const params = {
            page_num: pageNum,
            page_size: pageSize,
            name: search,
            type_filter: typeFilters,
            area_ids: selectedAreas.map((a) => a.value),
            village_ids: selectedVillages.map((v) => v.value),
          };

          return axios.get(API_URLS.getAllUser_data(), {
            params,
            signal,
            paramsSerializer: (params) =>
              qs.stringify(params, { arrayFormat: "repeat" }),
          });
        },
        {
          loadingMessage: "Loading user data... This may take up to 60 seconds for large datasets.",
          onSuccess: (response) => {
            setUser_data(response.data.data);
            setTotalCount(response.data.total_count);
            // Only clear selections when filters change, not on page navigation
            // setSelectedUserIds([]);  // Commented out for persistent selection
            // setSelectAll(false);     // Will be updated based on current page
          },
          onError: (error) => {
            console.error('Failed to fetch user data:', error);
          }
        }
      );
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setUser_data([]);
        setTotalCount(0);
        setSelectedUserIds([]);
        setSelectAll(false);
      } else {
        console.error("❌ Failed to fetch user data:", err);
      }
    }
  };

  // Handle individual checkbox change
  const handleCheckboxChange = (userId) => {
    setSelectedUserIds(prev => {
      const newSelected = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      
      // Console log the selected IDs for demonstration
      console.log('Selected User IDs:', newSelected);
      
      return newSelected;
    });
  };

  // Update select all state when user_data or selectedUserIds change
  useEffect(() => {
    const currentPageUserIds = user_data.map(user => user.user_id);
    const allCurrentPageSelected = currentPageUserIds.length > 0 && 
      currentPageUserIds.every(id => selectedUserIds.includes(id));
    setSelectAll(allCurrentPageSelected);
  }, [user_data, selectedUserIds]);

  // Handle select all checkbox change
  const handleSelectAllChange = () => {
    if (selectAll) {
      // Deselect all
      setSelectedUserIds([]);
      setSelectAll(false);
      console.log('Selected User IDs:', []);
    } else {
      // Select all current page user_data
      const allUserIds = user_data.map(user => user.user_id);
      setSelectedUserIds(allUserIds);
      setSelectAll(true);
      console.log('Selected User IDs:', allUserIds);
    }
  };

  // Only fetch users on page change or initial load, not on filter changes
  useEffect(() => {
    fetchUsers(page, searchTerm);
  }, [page, pageSize]); // Removed automatic filter dependencies

  // Initial load
  useEffect(() => {
    fetchUsers(1, "");
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Don't automatically trigger search or reset page
  };

  // New function to handle search button click
  const handleSearchClick = () => {
    setPage(1); // Reset to first page when search is triggered
    fetchUsers(1, searchTerm);
    // Clear selections when search is triggered
    setSelectedUserIds([]);
    setSelectAll(false);
  };

  // Clear all filters function
  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilters([]);
    setSelectedAreas([]);
    setSelectedVillages([]);
    setPage(1);
    fetchUsers(1, "");
    setSelectedUserIds([]);
    setSelectAll(false);
  };

  const handleDelete = (id) => {
    setOverlayState({
      isVisible: true,
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      isError: true, // Treat as error for confirmation styling
      errorType: "general",
      pendingAction: { type: 'delete', id }
    });
  };

  const handleConfirmDelete = async () => {
    const { pendingAction } = overlayState;
    if (!pendingAction || pendingAction.type !== 'delete') return;

    setOverlayState({ ...overlayState, isVisible: false }); // Close confirm

    try {
      await executeActionCall(
        ({ signal }) => axios.delete(API_URLS.deleteUser_data(pendingAction.id), { signal }),
        {
          loadingMessage: "Deleting user data...",
          onSuccess: () => {
            setShowEditPopup(false);
            setEditUser(null);
            setEditForm({});
            setEditSelectedArea(null);
            setEditSelectedVillage(null);
            fetchUsers(page, searchTerm);
            setOverlayState({
              isVisible: true,
              message: "User data deleted successfully.",
              isError: false,
              errorType: "general",
              pendingAction: null
            });
          },
          onError: (error) => {
            const status = error.originalError?.response?.status;
            if (status === 401) {
              // Reset API error state to prevent double popups
              resetActionCall();
              setOverlayState({
                isVisible: true,
                message: "You are not authorized to delete user data. Please login with proper credentials.",
                isError: true,
                errorType: "unauthorized",
                pendingAction: null
              });
            } else {
              console.error("❌ Failed to delete user data:", error);
              // Reset API error state to prevent double popups
              resetActionCall();
              setOverlayState({
                isVisible: true,
                message: "Failed to delete user data. Please try again.",
                isError: true,
                errorType: "general",
                pendingAction: null
              });
            }
          }
        }
      );
    } catch (err) {
      // Error handled by hook
    }
    setOverlayState(prev => ({ ...prev, pendingAction: null })); // Clear pending action
  };

  const handleEditClick = (user) => {
    console.log("User data:", user); // Debug log
    setEditUser(user.user_id);
    
    // Set the form data
    const formData = {
      ...user,
      fk_area_id: user.fk_area_id || user.area_id,
      fk_village_id: user.fk_village_id || user.village_id,
      area: user.area,
      village: user.village
    };
    console.log("Form data:", formData); // Debug log
    setEditForm(formData);
    
    // Set the selected area and village for AsyncSelect
    // Since we only have names, we'll need to find the IDs by loading options
    setEditSelectedArea(null);
    setEditSelectedVillage(null);
    
    // Load area ID if area name exists
    if (user.area) {
      loadAreaOptions(user.area).then((options) => {
        console.log("Area options:", options);
        console.log("Looking for area:", user.area);
        const matchedArea = options.find(option => option.label === user.area);
        console.log("Matched area:", matchedArea);
        if (matchedArea) {
          setEditSelectedArea(matchedArea);
          setEditForm(prev => ({
            ...prev,
            fk_area_id: matchedArea.value,
            area: matchedArea.label
          }));
        }
      });
    }
    
    // Load village ID if village name exists
    if (user.village) {
      loadVillageOptions(user.village).then((options) => {
        console.log("Village options:", options);
        console.log("Looking for village:", user.village);
        const matchedVillage = options.find(option => option.label === user.village);
        console.log("Matched village:", matchedVillage);
        if (matchedVillage) {
          setEditSelectedVillage(matchedVillage);
          setEditForm(prev => ({
            ...prev,
            fk_village_id: matchedVillage.value,
            village: matchedVillage.label
          }));
        }
      });
    }
    
    setShowEditPopup(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    try {
        await executeActionCall(
          ({ signal }) => axios.put(API_URLS.updateUser_data(editUser), editForm, { signal }),
        {
          loadingMessage: "Updating user data...",
          onSuccess: () => {
            setEditUser(null);
            setShowEditPopup(false);
            setEditSelectedArea(null);
            setEditSelectedVillage(null);
            fetchUsers(page, searchTerm);
            setOverlayState({
              isVisible: true,
              message: "User data updated successfully.",
              isError: false,
              errorType: "general",
              pendingAction: null
            });
          },
          onError: (error) => {
            const status = error.originalError?.response?.status;
            if (status === 401) {
              // Reset API error state to prevent double popups
              resetActionCall();
              setOverlayState({
                isVisible: true,
                message: "You are not authorized to update user data. Please login with proper credentials.",
                isError: true,
                errorType: "unauthorized",
                pendingAction: null
              });
            } else {
              console.error("❌ Failed to update user data:", error.originalError?.response?.data || error);
              // Reset API error state to prevent double popups
              resetActionCall();
              setOverlayState({
                isVisible: true,
                message: "Failed to update user data. Please try again.",
                isError: true,
                errorType: "general",
                pendingAction: null
              });
            }
          }
        }
      );
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditUser(null);
    setEditForm({});
    setEditSelectedArea(null);
    setEditSelectedVillage(null);
  };

  const handleDownloadPDF = async () => {
  try {
    // Check if specific users are selected
    if (selectedUserIds.length > 0) {
      // Download only selected users
      const params = {
        user_ids: selectedUserIds,
        pdf: true,
      };

      console.log('📄 PDF Download - Selected Users:', selectedUserIds);
      console.log('📄 PDF Download - Params:', params);

      const response = await axios.get(API_URLS.getAllUser_data(), {
        params,
        paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `selected_users_report_${selectedUserIds.length}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Download all users with current filters
      const params = {
        name: searchTerm,
        type_filter: typeFilters,
        area_ids: selectedAreas.map((a) => a.value),
        village_ids: selectedVillages.map((v) => v.value),
        pdf: true,
      };

      const response = await axios.get(API_URLS.getAllUser_data(), {
        params,
        paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_report.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    } catch (error) {
    console.error("❌ Failed to download PDF:", error);
    // Reset any existing error states
    resetActionCall();
    setOverlayState({
      isVisible: true,
      message: "Error downloading PDF. Please try again.",
      isError: true,
      errorType: "general",
      pendingAction: null
    });
  }
};

  const handleDownloadCSV = async () => {
    try {
      // Check if specific users are selected
      if (selectedUserIds.length > 0) {
        // Download only selected users
        const params = {
          user_ids: selectedUserIds,
          csv: true,
        };

        console.log('📊 CSV Download - Selected Users:', selectedUserIds);
        console.log('📊 CSV Download - Params:', params);

        const response = await axios.get(API_URLS.getAllUser_data(), {
          params,
          paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
          responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `selected_users_report_${selectedUserIds.length}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Download all users with current filters
        const params = {
          name: searchTerm,
          type_filter: typeFilters,
          area_ids: selectedAreas.map((a) => a.value),
          village_ids: selectedVillages.map((v) => v.value),
          csv: true,
        };

        const response = await axios.get(API_URLS.getAllUser_data(), {
          params,
          paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
          responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'users_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("❌ Failed to download Excel:", error);
      // Reset any existing error states
      resetActionCall();
      setOverlayState({
        isVisible: true,
        message: "Error downloading Excel file. Please try again.",
        isError: true,
        errorType: "general",
        pendingAction: null
      });
    }
  };


  const loadAreaOptions = async (inputValue) => {
    try {
      const res = await axios.get(API_URLS.getAllAreas(), {
        params: { area: inputValue },
      });
      return res.data.data.map((area) => ({
        label: area.area,
        value: area.area_id,
      }));
    } catch (err) {
      console.error("❌ Error loading area options", err);
      return [];
    }
  };

  const loadVillageOptions = async (inputValue) => {
    try {
      const res = await axios.get(API_URLS.getAllVillages(), {
        params: { village: inputValue },
      });
      return res.data.data.map((village) => ({
        label: village.village,
        value: village.village_id,
      }));
    } catch (err) {
      console.error("❌ Error loading village options", err);
      return [];
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Loading and error handlers
  const handleUsersRetry = () => {
    resetUsersCall();
    fetchUsers(page, searchTerm);
  };

  const handleActionRetry = () => {
    resetActionCall();
  };

  const getOverlayProps = () => {
    if (overlayState.isVisible) return overlayState;
    if (actionLoading) return { isVisible: true, message: "Processing...", isError: false, errorType: "general" };
    if (actionError && !actionLoading) return { isVisible: true, message: actionError?.message || "Operation failed", isError: true, errorType: "general" };
    if (usersLoading) return { isVisible: true, message: "Loading user data... This may take up to 60 seconds for large datasets.", isError: false, errorType: "general" };
    if (usersError && !usersLoading) return { isVisible: true, message: usersError?.message || "Failed to load users", isError: true, errorType: "general" };
    return { isVisible: false };
  };

  const currentOverlay = getOverlayProps();

  return (
    <>

      <div className="show-user-container">
        <h2>Show User Data</h2>
        
        {/* Row 1: Search input + Action buttons + Download buttons */}
        <div className="filter-row compact-row row-one">
          <input
            type="text"
            className="search-input mini"
            placeholder="Search user data..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchClick();
              }
            }}
          />
          
          <div className="action-buttons">
            <button className="search-btn mini" onClick={handleSearchClick}>
              🔍 Search
            </button>
            <button className="clear-btn mini" onClick={handleClearFilters}>
              🗑️ Clear
            </button>
          </div>
          
          <div className="download-buttons">
            <button className="download-btn pdf-btn mini" onClick={handleDownloadPDF}>
              {selectedUserIds.length > 0 
                ? `📄 PDF (${selectedUserIds.length})` 
                : '📄 PDF'
              }
            </button>
            <button className="download-btn csv-btn mini" onClick={handleDownloadCSV}>
              {selectedUserIds.length > 0 
                ? `📊 Excel (${selectedUserIds.length})` 
                : '📊 Excel'
              }
            </button>
          </div>
        </div>

        {/* Row 2: Type filters + Area/Village dropdowns */}
        <div className="filter-row compact-row row-two">
          <div className="type-buttons">
            {["ALL", "NRS", "COMMITEE", "SIDDHPUR"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setTypeFilters((prev) =>
                    prev.includes(type)
                      ? prev.filter((t) => t !== type)
                      : [...prev, type]
                  );
                }}
                className={`type-btn mini ${typeFilters.includes(type) ? "active-type" : ""}`}
              >
                {type}
              </button>
            ))}
          </div>
          
          <div className="dropdowns-section">
            <div className="select-wrapper mini">
              <AsyncSelect
                isMulti
                cacheOptions
                defaultOptions
                loadOptions={loadAreaOptions}
                onChange={(selected) => {
                  setSelectedAreas(selected || []);
                }}
                value={selectedAreas}
                placeholder="Area"
                classNamePrefix="react-select-menu"
                menuPortalTarget={document.body}
              />
            </div>
            
            <div className="select-wrapper mini">
              <AsyncSelect
                isMulti
                cacheOptions
                defaultOptions
                loadOptions={loadVillageOptions}
                onChange={(selected) => {
                  setSelectedVillages(selected || []);
                }}
                value={selectedVillages}
                placeholder="Village"
                classNamePrefix="react-select-menu"
                menuPortalTarget={document.body}
              />
            </div>
          </div>
        </div>


      <div className="table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAllChange}
                  title="Select All"
                />
              </th>
              <th>Actions</th>
              <th>ID</th>
              <th>Name</th>
              <th>Father/Husband</th>
              <th>Surname</th>
              <th>Village</th>
              <th>Area</th>
              <th>Status</th>
              <th>Type</th>
              <th>Address</th>
              <th>Pincode</th>
              <th>State</th>
              <th>User Code</th>
              <th>Mother</th>
              <th>Gender</th>
              <th>Birth Date</th>
              <th>Mobile 1</th>
              <th>Mobile 2</th>
              <th>Email</th>
              <th>Occupation</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {user_data.length ? (
              user_data.map((user) => (
                <tr key={user.user_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.user_id)}
                      onChange={() => handleCheckboxChange(user.user_id)}
                    />
                  </td>
                  <td>
                    <button className="edit-btn" onClick={() => handleEditClick(user)}>Edit</button>
                  </td>
                  <td>{user.user_id}</td>
                  <td>{user.name || "-"}</td>
                  <td>{user.father_or_husband_name || "-"}</td>
                  <td>{user.surname || "-"}</td>
                  <td>{user.village || "-"}</td>
                  <td>{user.area || "-"}</td>
                  <td>{user.status || "-"}</td>
                  <td>{user.type || "-"}</td>
                  <td>{user.address || "-"}</td>
                  <td>{user.pincode || "-"}</td>
                  <td>{user.state || "-"}</td>
                  <td>{user.usercode || "-"}</td>
                  <td>{user.mother_name || "-"}</td>
                  <td>{user.gender || "-"}</td>
                  <td>{user.birth_date || "-"}</td>
                  <td>{user.mobile_no1 || "-"}</td>
                  <td>{user.mobile_no2 || "-"}</td>
                  <td>{user.email_id || "-"}</td>
                  <td>{user.occupation || "-"}</td>
                  <td>{user.country || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="22" className="no-data">No user data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-container">
        <div className="page-size-selector">
          <label htmlFor="pageSize">Show </label>
          <select 
            id="pageSize"
            value={pageSize} 
            onChange={(e) => {
              const newSize = parseInt(e.target.value);
              setPageSize(newSize);
              setPage(1); // Reset to first page when changing page size
            }}
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span> per page</span>
        </div>
        
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        
        <div className="total-count">
          Total Records: {totalCount}
          {selectedUserIds.length > 0 && (
            <span className="selected-count">
              | Selected: {selectedUserIds.length} user data records
              <button 
                className="clear-selection-btn"
                onClick={() => {
                  setSelectedUserIds([]);
                  setSelectAll(false);
                }}
                title="Clear all selections"
              >
                ✕ Clear
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Edit User Popup */}
      {showEditPopup && (
        <div className="popup-overlay">
          <div className="popup-container">
            <div className="popup-header">
              <h2>Edit User Data</h2>
              <button className="close-btn" onClick={handleCloseEditPopup}>×</button>
            </div>
            {console.log("EditForm data:", editForm)} {/* Debug log */}
            <form className="edit-form" onSubmit={(e) => { e.preventDefault(); handleEditSubmit(); }}>
              <input 
                name="name" 
                value={editForm.name || ""} 
                onChange={handleEditChange} 
                placeholder="Name" 
                required 
              />
              <input 
                name="surname" 
                value={editForm.surname || ""} 
                onChange={handleEditChange} 
                placeholder="Surname" 
              />
              <input 
                name="father_or_husband_name" 
                value={editForm.father_or_husband_name || ""} 
                onChange={handleEditChange} 
                placeholder="Father/Husband Name" 
              />
              <input 
                name="mother_name" 
                value={editForm.mother_name || ""} 
                onChange={handleEditChange} 
                placeholder="Mother Name" 
              />
              <select 
                name="gender" 
                value={editForm.gender || ""} 
                onChange={handleEditChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input 
                name="birth_date" 
                type="date" 
                value={editForm.birth_date || ""} 
                onChange={handleEditChange} 
              />
              <input 
                name="mobile_no1" 
                value={editForm.mobile_no1 || ""} 
                onChange={handleEditChange} 
                placeholder="Mobile 1" 
              />
              <input 
                name="mobile_no2" 
                value={editForm.mobile_no2 || ""} 
                onChange={handleEditChange} 
                placeholder="Mobile 2" 
              />

              <AsyncSelect
                classNamePrefix="react-select-menu"
                cacheOptions
                defaultOptions
                loadOptions={loadAreaOptions}
                menuPortalTarget={document.body}
                placeholder="Select Area"
                onChange={(selected) => {
                  setEditSelectedArea(selected);
                  setEditForm((prev) => ({
                    ...prev,
                    fk_area_id: selected?.value || "",
                    area: selected?.label || "",
                  }));
                }}
                value={editSelectedArea}
                isClearable
                styles={{ container: (base) => ({ ...base, width: "100%" }) }}
              />

              <AsyncSelect
                classNamePrefix="react-select-menu"
                cacheOptions
                defaultOptions
                loadOptions={loadVillageOptions}
                menuPortalTarget={document.body}
                placeholder="Select Village"
                onChange={(selected) => {
                  setEditSelectedVillage(selected);
                  setEditForm((prev) => ({
                    ...prev,
                    fk_village_id: selected?.value || "",
                    village: selected?.label || "",
                  }));
                }}
                value={editSelectedVillage}
                isClearable
                styles={{ container: (base) => ({ ...base, width: "100%" }) }}
              />

              <input 
                name="address" 
                value={editForm.address || ""} 
                onChange={handleEditChange} 
                placeholder="Address" 
              />
              <input 
                name="pincode" 
                value={editForm.pincode || ""} 
                onChange={handleEditChange} 
                placeholder="Pincode" 
              />
              <input 
                name="occupation" 
                value={editForm.occupation || ""} 
                onChange={handleEditChange} 
                placeholder="Occupation" 
              />
              <input 
                name="country" 
                value={editForm.country || ""} 
                onChange={handleEditChange} 
                placeholder="Country" 
              />
              <input 
                name="state" 
                value={editForm.state || ""} 
                onChange={handleEditChange} 
                placeholder="State" 
              />
              <input 
                name="email_id" 
                value={editForm.email_id || ""} 
                onChange={handleEditChange} 
                placeholder="Email" 
              />
              <input 
                name="usercode" 
                value={editForm.usercode || ""} 
                onChange={handleEditChange} 
                placeholder="User Code" 
              />

              <select 
                name="status" 
                value={editForm.status || ""} 
                onChange={handleEditChange}
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Shifted">Shifted</option>
                <option value="Passed away">Passed away</option>
              </select>

              <select 
                name="type" 
                value={editForm.type || ""} 
                onChange={handleEditChange}
              >
                <option value="">Select Type</option>
                <option value="NRS">NRS</option>
                <option value="ALL">ALL</option>
                <option value="COMMITEE">COMMITEE</option>
                <option value="SIDDHPUR">SIDDHPUR</option>
              </select>

              <div className="popup-buttons">
                <button type="submit" className="save-btn">Update User Data</button>
                <button type="button" className="delete-btn" onClick={() => handleDelete(editUser)}>Delete User Data</button>
                <button type="button" className="cancel-btn" onClick={handleCloseEditPopup}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Single unified StatusOverlay for all states */}
      <StatusOverlay
        isVisible={currentOverlay.isVisible}
        message={currentOverlay.message}
        isError={currentOverlay.isError}
        errorType={currentOverlay.errorType}
        onRetry={
          currentOverlay.pendingAction?.type === 'delete' ? handleConfirmDelete :
          usersError?.canRetry ? handleUsersRetry :
          actionError?.canRetry ? handleActionRetry :
          null
        }
        onClose={() => {
          if (overlayState.isVisible) {
            setOverlayState({ ...overlayState, isVisible: false });
          } else {
            resetUsersCall();
            resetActionCall();
          }
        }}
        onLoginAgain={currentOverlay.errorType === 'unauthorized' || currentOverlay.errorType === 'auth' ? logout : null}
      />
    </>
  );
};

export default ShowUser;
