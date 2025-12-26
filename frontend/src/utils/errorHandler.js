/**
 * Centralized Error Handler for API Responses
 * Handles both HTTP errors and graceful permission errors
 */

export const handleAPIError = (error, defaultMessage = "An error occurred") => {
  let errorMessage = defaultMessage;
  let errorType = "general";
  let shouldShowPopup = true;

  // Check if this is a graceful permission error (HTTP 200 with error_code)
  if (error?.response?.data?.error_code === "PERMISSION_DENIED") {
    return {
      message: error.response.data.message || "You don't have permission to perform this action.",
      type: "permission",
      shouldShowPopup: true,
      isPermissionError: true,
      availableRoles: error.response.data.available_roles || [],
      userRoles: error.response.data.user_roles || []
    };
  }

  // Check if this is a successful response but with an error status
  if (error?.response?.data?.status === "error") {
    return {
      message: error.response.data.message || defaultMessage,
      type: error.response.data.error_code?.toLowerCase() || "general",
      shouldShowPopup: true,
      isPermissionError: error.response.data.error_code === "PERMISSION_DENIED",
      availableRoles: error.response.data.available_roles || [],
      userRoles: error.response.data.user_roles || []
    };
  }

  // Handle HTTP error responses
  if (error.response) {
    console.error('Response error data:', error.response.data);
    console.error('Response status:', error.response.status);
    
    switch (error.response.status) {
      case 401:
        errorMessage = "Your session has expired. Please log in again.";
        errorType = "unauthorized";
        break;
      case 403:
        errorMessage = "You don't have permission to access this feature.";
        errorType = "permission";
        break;
      case 422:
        // Unprocessable Entity - validation error
        const validationError = error.response.data?.detail;
        if (Array.isArray(validationError)) {
          errorMessage = `Validation error: ${validationError[0]?.msg || 'Invalid request parameters'}`;
        } else if (typeof validationError === 'string') {
          errorMessage = `Validation error: ${validationError}`;
        } else {
          errorMessage = "Invalid request parameters. Please check your input.";
        }
        errorType = "validation";
        break;
      case 500:
        errorMessage = "Server error. Please try again later.";
        errorType = "server";
        break;
      default:
        const detail = error.response.data?.detail || error.response.data?.message;
        errorMessage = `Error (${error.response.status}): ${typeof detail === 'string' ? detail : 'Unknown server error'}`;
    }
  } else if (error.request) {
    errorMessage = "Network error. Please check your connection.";
    errorType = "network";
  } else {
    errorMessage = `Unexpected error: ${error.message || 'Unknown error occurred'}`;
  }

  return {
    message: errorMessage,
    type: errorType,
    shouldShowPopup: true,
    isPermissionError: errorType === "permission",
    availableRoles: [],
    userRoles: []
  };
};

/**
 * Format permission error message (simplified version)
 */
export const formatPermissionMessage = (message, availableRoles = [], userRoles = []) => {
  // Return just the simple message without role details
  return message;
};

/**
 * Check if response contains graceful permission error
 */
export const isPermissionError = (response) => {
  return (
    response?.data?.error_code === "PERMISSION_DENIED" ||
    response?.data?.status === "error" && response?.data?.error_code === "PERMISSION_DENIED"
  );
};

/**
 * Check if response is successful (even with permission restrictions)
 */
export const isSuccessfulResponse = (response) => {
  return (
    response?.status === 200 || 
    response?.data?.status === "success" ||
    (response?.data?.status === "error" && response?.data?.error_code === "PERMISSION_DENIED")
  );
};
