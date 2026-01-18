import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URLS } from "../../../utils/fetchurl";
import { useRegularApiCall } from "../../../hooks/useApiCall";
import { useAuth } from "../../../contexts/AuthContext";
import StatusOverlay from "../../common/StatusOverlay";
import Pagination from "../../common/Pagination";
import "../addarea/Area.css";

const AddVillage = () => {
  const [villages, setVillages] = useState([]);
  const [searchInput, setSearchInput] = useState(""); // Input field value
  const [searchTerm, setSearchTerm] = useState(""); // Actual search term for API
  const [newVillage, setNewVillage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const villagesPerPage = 10;

  // API call hooks  
  // Enhanced popup state for StatusOverlay
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: "",
    isError: false,
    errorType: "general",
    pendingAction: null // for delete confirmations
  });

  const { loading: loadingVillages, error: villagesError, execute: executeVillagesCall, reset: resetVillagesCall } = useRegularApiCall();
  const { loading: actionLoading, error: actionError, execute: executeActionCall, reset: resetActionCall } = useRegularApiCall();
  const { isAuthenticated, logout } = useAuth(); // Add auth context

  const fetchVillages = async (page = 1, searchValue = "") => {
    try {
      await executeVillagesCall(
        ({ signal }) => axios.get(API_URLS.getAllVillages(), {
          params: {
            page_num: page,
            village: searchValue || undefined,
          },
          signal,
        }),
        {
          loadingMessage: "Loading villages...",
          onSuccess: (response) => {
            setVillages(response.data.data);
            setTotalCount(response.data.total_count);
          },
          onError: (error) => {
            console.error("Error fetching villages:", error);
          }
        }
      );
    } catch (err) {
      // Error handled by hook
    }
  };

  useEffect(() => {
    fetchVillages(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleAddVillage = async () => {
    if (newVillage.trim()) {
      try {
        await executeActionCall(
          ({ signal }) => axios.post(API_URLS.createVillage(), {
            village: newVillage.trim(),
          }, { signal }),
          {
            loadingMessage: "Adding village...",
            onSuccess: () => {
              setNewVillage("");
              fetchVillages(currentPage, searchTerm);
            },
            onError: (error) => {
              const status = error.originalError?.response?.status;
              if (status === 401) {
                setOverlayState({
                  isVisible: true,
                  message: "You are not authorized to add villages. Please login with proper credentials.",
                  isError: true,
                  errorType: "unauthorized",
                  pendingAction: null
                });
              } else {
                setOverlayState({
                  isVisible: true,
                  message: error.originalError?.response?.data?.detail || "Error adding village. Please try again.",
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
    }
  };

  const handleDeleteVillage = (id) => {
    // Show confirm dialog using StatusOverlay
    setOverlayState({
      isVisible: true,
      message: "Are you sure you want to delete this village? This action cannot be undone.",
      isError: true,
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
        ({ signal }) => axios.delete(API_URLS.deleteVillage(pendingAction.id), { signal }),
        {
          loadingMessage: "Deleting village...",
          onSuccess: () => {
            fetchVillages(currentPage, searchTerm);
            setOverlayState({
              isVisible: true,
              message: "Village deleted successfully.",
              isError: false,
              errorType: "general",
              pendingAction: null
            });
          },
          onError: (error) => {
            const status = error.originalError?.response?.status;
            if (status === 401) {
              setOverlayState({
                isVisible: true,
                message: "You are not authorized to delete villages. Please login with proper credentials.",
                isError: true,
                errorType: "unauthorized",
                pendingAction: null
              });
            } else {
              setOverlayState({
                isVisible: true,
                message: "Error deleting village. Please try again.",
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

  const totalPages = Math.ceil(totalCount / villagesPerPage);

  // Loading and error handlers
  const handleVillagesRetry = () => {
    resetVillagesCall();
    fetchVillages(currentPage, searchTerm);
  };

  const handleActionRetry = () => {
    resetActionCall();
  };

  // Determine what to show in the single overlay
  const getOverlayProps = () => {
    // Custom overlay states take priority
    if (overlayState.isVisible) {
      return overlayState;
    }
    
    // Action loading (add/delete operations)
    if (actionLoading) {
      return {
        isVisible: true,
        message: "Processing...",
        isError: false,
        errorType: "general",
        pendingAction: null
      };
    }
    
    // Action errors (add/delete failures)
    if (actionError && !actionLoading) {
      return {
        isVisible: true,
        message: actionError?.message || "Operation failed",
        isError: true,
        errorType: "general",
        pendingAction: null
      };
    }
    
    // Villages loading
    if (loadingVillages) {
      return {
        isVisible: true,
        message: "Loading villages...",
        isError: false,
        errorType: "general",
        pendingAction: null
      };
    }
    
    // Villages error
    if (villagesError && !loadingVillages) {
      return {
        isVisible: true,
        message: villagesError?.message || "Failed to load villages",
        isError: true,
        errorType: "general",
        pendingAction: null
      };
    }
    
    return { isVisible: false };
  };

  const currentOverlay = getOverlayProps();

  return (
    <>

      <div className="addarea-container">
      {/* Left - Add Village */}
      <div className="addarea-left">
        <h2>Add Village</h2>
        <input
          type="text"
          value={newVillage}
          onChange={(e) => setNewVillage(e.target.value)}
          placeholder="Enter village name"
        />
        <button onClick={handleAddVillage}>Add</button>
      </div>

      {/* Right - Show/Search Villages */}
      <div className="addarea-right">
        <h2>Village List</h2>
        <div className="search-container">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder="Search villages"
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
        </div>

        <ul className="area-list">
          {villages.length > 0 ? (
            villages.map((village) => (
              <li key={village.village_id} className="area-item">
                {village.village} - {village.user_count}
                <button
                  className="delete-button"
                  onClick={() => handleDeleteVillage(village.village_id)}
                >
                  ×
                </button>
              </li>
            ))
          ) : (
            <p>No villages found.</p>
          )}
        </ul>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
      </div>

      {/* Single unified StatusOverlay for all states */}
              <StatusOverlay
        isVisible={currentOverlay.isVisible}
        message={currentOverlay.message}
        isError={currentOverlay.isError}
        errorType={currentOverlay.errorType}
        onRetry={
          currentOverlay.pendingAction?.type === 'delete' ? handleConfirmDelete :
          villagesError?.canRetry ? handleVillagesRetry :
          actionError?.canRetry ? handleActionRetry :
          null
        }
        onClose={() => {
          if (overlayState.isVisible) {
            setOverlayState({ ...overlayState, isVisible: false });
          } else {
            resetVillagesCall();
            resetActionCall();
          }
        }}
        onLoginAgain={currentOverlay.errorType === 'unauthorized' || currentOverlay.errorType === 'auth' ? logout : null}
      />
    </>
  );
};

export default AddVillage;
