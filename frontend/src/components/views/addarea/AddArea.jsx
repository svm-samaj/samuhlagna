import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URLS } from "../../../utils/fetchurl";
import { useRegularApiCall } from "../../../hooks/useApiCall";
import { useAuth } from "../../../contexts/AuthContext";
import StatusOverlay from "../../common/StatusOverlay";
import Pagination from "../../common/Pagination";
import "./Area.css";

const AddArea = () => {
  const [areas, setAreas] = useState([]);
  const [searchInput, setSearchInput] = useState(""); // Input field value
  const [searchTerm, setSearchTerm] = useState(""); // Actual search term for API
  const [newArea, setNewArea] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const areasPerPage = 10;

  // Enhanced popup state for StatusOverlay
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: "",
    isError: false,
    errorType: "general",
    pendingAction: null // for delete confirmations
  });

  // API call hooks
  const { loading: loadingAreas, error: areasError, execute: executeAreasCall, reset: resetAreasCall } = useRegularApiCall();
  const { loading: actionLoading, error: actionError, execute: executeActionCall, reset: resetActionCall } = useRegularApiCall();
  const { isAuthenticated, logout } = useAuth(); // Add auth context

  const fetchAreas = async (page = 1, searchValue = "") => {
    try {
      await executeAreasCall(
        ({ signal }) => axios.get(API_URLS.getAllAreas(), {
          params: {
            page_num: page,
            area: searchValue || undefined,
          },
          signal,
        }),
        {
          loadingMessage: "Loading areas...",
          onSuccess: (response) => {
            setAreas(response.data.data);
            setTotalCount(response.data.total_count);
          },
          onError: (error) => {
            console.error("Error fetching areas:", error);
          }
        }
      );
    } catch (err) {
      // Error handled by hook
    }
  };

  useEffect(() => {
    fetchAreas(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleAddArea = async () => {
    if (newArea.trim()) {
      try {
        await executeActionCall(
          ({ signal }) => axios.post(API_URLS.createArea(), {
            area: newArea.trim(),
          }, { signal }),
          {
            loadingMessage: "Adding area...",
            onSuccess: () => {
              setNewArea("");
              fetchAreas(currentPage, searchTerm);
            },
            onError: (error) => {
              const status = error.originalError?.response?.status;
              if (status === 401) {
                setOverlayState({
                  isVisible: true,
                  message: "You are not authorized to add areas. Please login with proper credentials.",
                  isError: true,
                  errorType: "unauthorized",
                  pendingAction: null
                });
              } else {
                setOverlayState({
                  isVisible: true,
                  message: error.originalError?.response?.data?.detail || "Error adding area. Please try again.",
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

  const handleDeleteArea = (id) => {
    // Show confirm dialog using StatusOverlay
    setOverlayState({
      isVisible: true,
      message: "Are you sure you want to delete this area? This action cannot be undone.",
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
        ({ signal }) => axios.delete(API_URLS.deleteArea(pendingAction.id), { signal }),
        {
          loadingMessage: "Deleting area...",
          onSuccess: () => {
            fetchAreas(currentPage, searchTerm);
            setOverlayState({
              isVisible: true,
              message: "Area deleted successfully.",
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
                message: "You are not authorized to delete areas. Please login with proper credentials.",
                isError: true,
                errorType: "unauthorized",
                pendingAction: null
              });
            } else {
              setOverlayState({
                isVisible: true,
                message: "Error deleting area. Please try again.",
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

  const totalPages = Math.ceil(totalCount / areasPerPage);

  // Loading and error handlers
  const handleAreasRetry = () => {
    resetAreasCall();
    fetchAreas(currentPage, searchTerm);
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
    
    // Areas loading
    if (loadingAreas) {
      return {
        isVisible: true,
        message: "Loading areas...",
        isError: false,
        errorType: "general",
        pendingAction: null
      };
    }
    
    // Areas error
    if (areasError && !loadingAreas) {
      return {
        isVisible: true,
        message: areasError?.message || "Failed to load areas",
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
      {/* Left - Add Area */}
      <div className="addarea-left">
        <h2>Add Area</h2>
        <input
          type="text"
          value={newArea}
          onChange={(e) => setNewArea(e.target.value)}
          placeholder="Enter area name"
        />
        <button onClick={handleAddArea}>Add</button>
      </div>

      {/* Right - Show/Search Areas */}
      <div className="addarea-right">
        <h2>Area List</h2>
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
            placeholder="Search areas"
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
        </div>

        <ul className="area-list">
          {areas.length > 0 ? (
            areas.map((area) => (
              <li key={area.area_id} className="area-item">
                {area.area} - {area.user_count}
                <button
                  className="delete-button"
                  onClick={() => handleDeleteArea(area.area_id)}
                >
                  ×
                </button>
              </li>
            ))
          ) : (
            <p>No areas found.</p>
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
          areasError?.canRetry ? handleAreasRetry :
          actionError?.canRetry ? handleActionRetry :
          null
        }
        onClose={() => {
          if (overlayState.isVisible) {
            setOverlayState({ ...overlayState, isVisible: false });
          } else {
            resetAreasCall();
            resetActionCall();
          }
        }}
        onLoginAgain={currentOverlay.errorType === 'unauthorized' || currentOverlay.errorType === 'auth' ? logout : null}
      />
    </>
  );
};

export default AddArea;
