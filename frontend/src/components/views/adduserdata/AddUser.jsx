import React, { useState } from "react";
import axios from "axios";
import AsyncSelect from "react-select/async";
import { API_URLS } from "../../../utils/fetchurl";
import { useRegularApiCall } from "../../../hooks/useApiCall";
import { useAuth } from "../../../contexts/AuthContext";
import StatusOverlay from "../../common/StatusOverlay";
import "./adduserdata.css";

const AddUser = () => {
  const [formData, setFormData] = useState({
    usercode: "",
    name: "",
    surname: "",
    father_or_husband_name: "",
    mother_name: "",
    gender: "",
    birth_date: "",
    mobile_no1: "",
    mobile_no2: "",
    fk_area_id: "",
    fk_village_id: "",
    area: "",
    village: "",
    address: "",
    pincode: "",
    occupation: "",
    country: "",
    state: "",
    email_id: "",
    status: "Active",
    type: "ALL",
    receipt_flag: false,
    receipt_no: "",
    receipt_date: "",
    receipt_amt: "",
  });

  const [errors, setErrors] = useState({});
  
  // Enhanced popup state for StatusOverlay
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: "",
    isError: false,
    errorType: "general",
    pendingAction: null
  });
  
  // API call hooks
  const { loading, error, execute, reset } = useRegularApiCall();
  const { isAuthenticated, logout } = useAuth(); // Add auth context

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const cleanedData = { ...formData };
    Object.keys(cleanedData).forEach((key) => {
      if (cleanedData[key] === "") cleanedData[key] = null;
    });

    try {
      await execute(
        ({ signal }) => axios.post(API_URLS.createUser_data(), cleanedData, { signal }),
        {
          loadingMessage: "Creating user data...",
          onSuccess: () => {
            setErrors({});
            setFormData({
              usercode: "",
              name: "",
              surname: "",
              father_or_husband_name: "",
              mother_name: "",
              gender: "",
              birth_date: "",
              mobile_no1: "",
              mobile_no2: "",
              fk_area_id: "",
              fk_village_id: "",
              area: "",
              village: "",
              address: "",
              pincode: "",
              occupation: "",
              country: "",
              state: "",
              email_id: "",
              status: "Active",
              type: "ALL",
              receipt_flag: false,
              receipt_no: "",
              receipt_date: "",
              receipt_amt: "",
            });
            setOverlayState({
              isVisible: true,
              message: "User data created successfully.",
              isError: false,
              errorType: "general",
              pendingAction: null
            });
          },
          onError: (error) => {
            const status = error.originalError?.response?.status;
            if (status === 401) {
              // Reset API error state to prevent double popups
              reset();
              setOverlayState({
                isVisible: true,
                message: "You are not authorized to create user data. Please login with proper credentials.",
                isError: true,
                errorType: "unauthorized",
                pendingAction: null
              });
            } else if (status === 422) {
              // Handle validation errors
              const fieldErrors = {};
              if (error.originalError.response.data.detail) {
                error.originalError.response.data.detail.forEach((err) => {
                  const field = err.loc[err.loc.length - 1];
                  fieldErrors[field] = err.msg;
                });
                setErrors(fieldErrors);
              }
              // Reset API error state to prevent double popups
              reset();
              setOverlayState({
                isVisible: true,
                message: "Please check the form fields and fix validation errors.",
                isError: true,
                errorType: "general",
                pendingAction: null
              });
            } else {
              console.error(error);
              // Reset API error state to prevent double popups
              reset();
              setOverlayState({
                isVisible: true,
                message: error.originalError?.response?.data?.detail || "Error creating user data. Please try again.",
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

  const loadAreaOptions = async (inputValue) => {
    try {
      const res = await axios.get(API_URLS.getAllAreas(), {
        params: { area: inputValue }
      });
      return res.data.data.map((area) => ({
        label: area.area,
        value: area.area_id,
      }));
    } catch (err) {
      console.error("Area fetch failed", err);
      return [];
    }
  };

  const loadVillageOptions = async (inputValue) => {
    try {
      const res = await axios.get(API_URLS.getAllVillages(), {
        params: { village: inputValue }
      });
      return res.data.data.map((village) => ({
        label: village.village,
        value: village.village_id,
      }));
    } catch (err) {
      console.error("Village fetch failed", err);
      return [];
    }
  };

  const handleRetry = () => {
    reset();
    setOverlayState({ ...overlayState, isVisible: false });
  };

  const handleActionRetry = () => {
    reset();
  };

  const getOverlayProps = () => {
    if (overlayState.isVisible) return overlayState;
    if (loading) return { isVisible: true, message: "Creating user data...", isError: false, errorType: "general" };
    if (error && !loading) return { isVisible: true, message: error?.message || "Operation failed", isError: true, errorType: "general" };
    return { isVisible: false };
  };

  const currentOverlay = getOverlayProps();

  return (
    <>

      <div className="form-container">
        <h2>Create User Data</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" required />
        <input name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" />
        <input name="father_or_husband_name" value={formData.father_or_husband_name} onChange={handleChange} placeholder="Father/Husband Name" />
        <input name="mother_name" value={formData.mother_name} onChange={handleChange} placeholder="Mother Name" />
        <select name="gender" value={formData.gender} onChange={handleChange} style={{ width: "180px" }}>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
        <input name="mobile_no1" value={formData.mobile_no1} onChange={handleChange} placeholder="Mobile 1" />
        <input name="mobile_no2" value={formData.mobile_no2} onChange={handleChange} placeholder="Mobile 2" />

        <AsyncSelect
          cacheOptions
          defaultOptions
          loadOptions={loadAreaOptions}
          placeholder="Select Area"
          onChange={(selected) =>
            setFormData((prev) => ({
              ...prev,
              fk_area_id: selected?.value || "",
              area: selected?.label || "",
            }))
          }
          value={
            formData.fk_area_id
              ? { value: formData.fk_area_id, label: formData.area }
              : null
          }
          isClearable
          styles={{ container: (base) => ({ ...base, width: 180 }) }}
        />

        <AsyncSelect
          cacheOptions
          defaultOptions
          loadOptions={loadVillageOptions}
          placeholder="Select Village"
          onChange={(selected) =>
            setFormData((prev) => ({
              ...prev,
              fk_village_id: selected?.value || "",
              village: selected?.label || "",
            }))
          }
          value={
            formData.fk_village_id
              ? { value: formData.fk_village_id, label: formData.village }
              : null
          }
          isClearable
          styles={{ container: (base) => ({ ...base, width: 180 }) }}
        />

        <input name="address" value={formData.address} onChange={handleChange} placeholder="Address" />
        <input name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Pincode" />
        <input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Occupation" />
        <input name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
        <input name="state" value={formData.state} onChange={handleChange} placeholder="State" />
        <input name="email_id" value={formData.email_id} onChange={handleChange} placeholder="Email" />

        <select name="status" value={formData.status} onChange={handleChange} style={{ width: "180px" }}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Shifted">Shifted</option>
          <option value="Passed away">Passed away</option>
        </select>

        <select name="type" value={formData.type} onChange={handleChange} style={{ width: "180px" }}>
          <option value="NRS">NRS</option>
          <option value="ALL">ALL</option>
          <option value="Commitee">Commitee</option>
          <option value="Siddhpur">Siddhpur</option>
        </select>

        {/* Receipt section temporarily commented out */}
        {/* <div className="receipt-section">
          <label>
            Receipt Issued?
            <input
              type="checkbox"
              name="receipt_flag"
              checked={formData.receipt_flag}
              onChange={handleChange}
            />
          </label>
          <input name="receipt_no" value={formData.receipt_no} onChange={handleChange} placeholder="Receipt No" />
          <input name="receipt_date" type="date" value={formData.receipt_date} onChange={handleChange} />
          <input name="receipt_amt" type="number" value={formData.receipt_amt} onChange={handleChange} placeholder="Amount" />
        </div> */}

        <button type="submit">Create User Data</button>
        
        {/* Display validation errors */}
        {Object.keys(errors).length > 0 && (
          <div className="validation-errors">
            <h4>Please fix the following errors:</h4>
            <ul>
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>
                  <strong>{field}:</strong> {message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
      </div>
      
      {/* Single unified StatusOverlay for all states */}
      <StatusOverlay
        isVisible={currentOverlay.isVisible}
        message={currentOverlay.message}
        isError={currentOverlay.isError}
        errorType={currentOverlay.errorType}
        onRetry={
          error?.canRetry ? handleActionRetry :
          null
        }
        onClose={() => {
          if (overlayState.isVisible) {
            setOverlayState({ ...overlayState, isVisible: false });
          } else {
            reset();
          }
        }}
        onLoginAgain={currentOverlay.errorType === 'unauthorized' || currentOverlay.errorType === 'auth' ? logout : null}
      />
    </>
  );
};

export default AddUser;
