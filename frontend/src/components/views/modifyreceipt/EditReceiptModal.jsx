import React, { useState, useEffect } from 'react';
import './EditReceiptModal.css';

const EditReceiptModal = ({ receipt, onSave, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    receipt_date: '',
    donor_name: '',
    village: '',
    residence: '',
    mobile: '',
    relation_address: '',
    payment_mode: '',
    payment_details: '',
    donation1_purpose: '',
    donation1_amount: 0,
    donation2_amount: 0,
    total_amount: 0,
    total_amount_words: ''
  });

  // Initialize form with receipt data
  useEffect(() => {
    if (receipt) {
      setFormData({
        receipt_date: receipt.receipt_date?.split('T')[0] || '',
        donor_name: receipt.donor_name || '',
        village: receipt.village || '',
        residence: receipt.residence || '',
        mobile: receipt.mobile || '',
        relation_address: receipt.relation_address || '',
        payment_mode: receipt.payment_mode || 'Cash',
        payment_details: receipt.payment_details || '',
        donation1_purpose: receipt.donation1_purpose || '',
        donation1_amount: receipt.donation1_amount || 0,
        donation2_amount: receipt.donation2_amount || 0,
        total_amount: receipt.total_amount || 0,
        total_amount_words: receipt.total_amount_words || ''
      });
    }
  }, [receipt]);

  // Format number with Indian comma system
  const formatIndianNumber = (num) => {
    if (!num) return '';
    const cleanNum = num.toString().replace(/,/g, '');
    if (!/^\d+$/.test(cleanNum)) return num;
    
    const numStr = cleanNum.toString();
    const lastThree = numStr.substring(numStr.length - 3);
    const otherNumbers = numStr.substring(0, numStr.length - 3);
    
    if (otherNumbers !== '') {
      return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    } else {
      return lastThree;
    }
  };

  // Remove commas to get actual number value
  const getNumericValue = (formattedNum) => {
    return formattedNum.toString().replace(/,/g, '');
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle amount fields with validation and formatting
    if (name === 'donation1_amount' || name === 'donation2_amount' || name === 'total_amount') {
      const numericValue = getNumericValue(value);
      if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
        const numValue = parseFloat(numericValue) || 0;
        setFormData(prev => ({
          ...prev,
          [name]: numValue
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Auto-calculate total when donations change
  useEffect(() => {
    const total = parseFloat(formData.donation1_amount) + parseFloat(formData.donation2_amount);
    if (total !== formData.total_amount) {
      setFormData(prev => ({
        ...prev,
        total_amount: total
      }));
    }
  }, [formData.donation1_amount, formData.donation2_amount]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.donor_name || !formData.total_amount || formData.total_amount <= 0) {
      alert('Please fill in required fields: Donor Name and Total Amount (must be greater than 0)');
      return;
    }

    // Prepare data for API
    const apiData = {
      receipt_date: formData.receipt_date,
      donor_name: formData.donor_name.trim(),
      village: formData.village?.trim() || null,
      residence: formData.residence?.trim() || null,
      mobile: formData.mobile?.trim() || null,
      relation_address: formData.relation_address?.trim() || null,
      payment_mode: formData.payment_mode,
      payment_details: formData.payment_details?.trim() || null,
      donation1_purpose: formData.donation1_purpose?.trim() || null,
      donation1_amount: parseFloat(formData.donation1_amount) || 0,
      donation2_amount: parseFloat(formData.donation2_amount) || 0,
      total_amount: parseFloat(formData.total_amount),
      total_amount_words: formData.total_amount_words?.trim() || null
    };

    onSave(apiData);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Receipt - {receipt.receipt_no}</h2>
          <button className="close-button" onClick={onClose} disabled={isLoading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-grid">
            {/* Basic Info */}
            <div className="form-section">
              <h3>Basic Information</h3>
              <div className="form-row">
                <label>
                  Receipt Date *
                  <input
                    type="date"
                    name="receipt_date"
                    value={formData.receipt_date}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </label>
                <label>
                  Donor Name *
                  <input
                    type="text"
                    name="donor_name"
                    value={formData.donor_name}
                    onChange={handleInputChange}
                    placeholder="Enter donor name"
                    required
                    disabled={isLoading}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Village
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleInputChange}
                    placeholder="Enter village"
                    disabled={isLoading}
                  />
                </label>
                <label>
                  Residence
                  <input
                    type="text"
                    name="residence"
                    value={formData.residence}
                    onChange={handleInputChange}
                    placeholder="Enter residence"
                    disabled={isLoading}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Mobile Number
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="Enter mobile number"
                    disabled={isLoading}
                  />
                </label>
                <label>
                  Relation/Address
                  <input
                    type="text"
                    name="relation_address"
                    value={formData.relation_address}
                    onChange={handleInputChange}
                    placeholder="Enter relation or address"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>

            {/* Payment Info */}
            <div className="form-section">
              <h3>Payment Information</h3>
              <div className="form-row">
                <label>
                  Payment Mode *
                  <select
                    name="payment_mode"
                    value={formData.payment_mode}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Online">Online</option>
                  </select>
                </label>
                <label>
                  Payment Details
                  <input
                    type="text"
                    name="payment_details"
                    value={formData.payment_details}
                    onChange={handleInputChange}
                    placeholder="Enter payment details"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>

            {/* Donation Info */}
            <div className="form-section">
              <h3>Donation Details</h3>
              <div className="form-row">
                <label>
                  Donation 1 Purpose
                  <input
                    type="text"
                    name="donation1_purpose"
                    value={formData.donation1_purpose}
                    onChange={handleInputChange}
                    placeholder="Enter donation purpose"
                    disabled={isLoading}
                  />
                </label>
                <label>
                  Donation 1 Amount
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="donation1_amount"
                    value={formData.donation1_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Donation 2 Amount
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="donation2_amount"
                    value={formData.donation2_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </label>
                <label>
                  Total Amount *
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="total_amount"
                    value={formData.total_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    disabled={isLoading}
                    className="total-amount-field"
                  />
                </label>
              </div>
              <div className="form-row">
                <label className="full-width">
                  Total Amount in Words
                  <input
                    type="text"
                    name="total_amount_words"
                    value={formData.total_amount_words}
                    onChange={handleInputChange}
                    placeholder="Enter amount in words"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-cancel"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-save"
              disabled={isLoading}
            >
              {isLoading ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReceiptModal;
