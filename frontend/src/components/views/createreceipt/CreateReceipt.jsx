import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StatusOverlay from '../../common/StatusOverlay';
import SiddhapurLogo from '../../../assets/images/Siddhapur_Logo_01.png';
import OrganizationLogo from '../../../assets/images/organization-logo.bmp';
import { API_URLS } from '../../../utils/fetchurl';
import { handleAPIError, formatPermissionMessage } from '../../../utils/errorHandler';
import axios from 'axios';
import './CreateReceipt.css';

// Function to convert numbers to English words
const numberToEnglishWords = (num) => {
  if (!num || num === '' || isNaN(num)) return '';
  
  const number = parseInt(num);
  if (number === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const hundreds = ['', 'One Hundred', 'Two Hundred', 'Three Hundred', 'Four Hundred', 'Five Hundred', 'Six Hundred', 'Seven Hundred', 'Eight Hundred', 'Nine Hundred'];
  
  if (number < 10) {
    return ones[number];
  } else if (number < 20) {
    return teens[number - 10];
  } else if (number < 100) {
    return tens[Math.floor(number / 10)] + (number % 10 ? ' ' + ones[number % 10] : '');
  } else if (number < 1000) {
    return hundreds[Math.floor(number / 100)] + (number % 100 ? ' ' + numberToEnglishWords(number % 100) : '');
  } else if (number < 100000) {
    return numberToEnglishWords(Math.floor(number / 1000)) + ' Thousand' + (number % 1000 ? ' ' + numberToEnglishWords(number % 1000) : '');
  } else if (number < 10000000) {
    return numberToEnglishWords(Math.floor(number / 100000)) + ' Lakh' + (number % 100000 ? ' ' + numberToEnglishWords(number % 100000) : '');
  } else {
    return numberToEnglishWords(Math.floor(number / 10000000)) + ' Crore' + (number % 10000000 ? ' ' + numberToEnglishWords(number % 10000000) : '');
  }
};

const CreateReceipt = () => {
  const [receiptData, setReceiptData] = useState({
    receiptNo: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format for HTML date input
    name: '',
    village: '',
    residence: '',
    mobile: '',
    relation: '',
    paymentMode: '',
    paymentDetails: '',
    donation1Purpose: '',
    donation1: '',
    donation2: '',
    total: ''
  });

  // State for total words display
  const [totalWordsDisplay, setTotalWordsDisplay] = useState('');

  const [isPreviewMode, setIsPreviewMode] = useState(false);

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

  // Enhanced popup state for StatusOverlay
  const [overlayState, setOverlayState] = useState({
    isVisible: false,
    message: "",
    isError: false,
    errorType: "general",
    pendingAction: null
  });

  const { logout, user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);
  
  // State to track if receipt is saved (to show actual receipt number)
  const [isSaved, setIsSaved] = useState(false);
  
  // State to track receipt ID for updates
  const [receiptId, setReceiptId] = useState(null);
  
  // State to determine if we're in edit mode (updating existing receipt)
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State to track if we're loading an existing receipt
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  
  // State to track the original context - true if came from modify receipt list
  const [cameFromModifyList, setCameFromModifyList] = useState(false);

  // Auto-generate receipt number on component mount OR load existing receipt
  useEffect(() => {
    const editReceiptId = searchParams.get('edit');
    if (editReceiptId) {
      // User came from modify receipt list to edit existing receipt
      setCameFromModifyList(true);
      loadReceiptForEdit(parseInt(editReceiptId));
    } else {
      // User came to create new receipt
      setCameFromModifyList(false);
    generateReceiptNumber();
    }
  }, [searchParams]);

  // Auto-calculate total when donations change
  useEffect(() => {
    const donation1Amount = parseFloat(getNumericValue(receiptData.donation1)) || 0;
    const donation2Amount = parseFloat(getNumericValue(receiptData.donation2)) || 0;
    const calculatedTotal = donation1Amount + donation2Amount;
    
    // Update total if there's a sum, or clear it if both fields are empty
    if (calculatedTotal > 0) {
      const totalString = formatIndianNumber(calculatedTotal.toString());
      setReceiptData(prev => ({
        ...prev,
        total: totalString
      }));
      // Update total words display with English words
      setTotalWordsDisplay(numberToEnglishWords(calculatedTotal.toString()));
    } else if (receiptData.donation1 === '' && receiptData.donation2 === '') {
      setReceiptData(prev => ({
        ...prev,
        total: ''
      }));
      setTotalWordsDisplay('');
    }
  }, [receiptData.donation1, receiptData.donation2]);

  const generateReceiptNumber = () => {
    // Generate placeholder receipt number showing user will get RCX/YYYY/XXXX format
    const currentYear = new Date().getFullYear();
    const receiptNo = `RCX/${currentYear}/XXXX`;
    
    setReceiptData(prev => ({
      ...prev,
      receiptNo: receiptNo
    }));
    
    setIsSaved(false); // Reset saved state when generating new receipt
    setReceiptId(null); // Clear receipt ID for new receipt
    setIsEditMode(false); // Reset to create mode
  };

  // Load existing receipt for editing
  const loadReceiptForEdit = async (id) => {
    try {
      setIsLoadingReceipt(true);
      console.log('Loading receipt for edit:', id);
      
      const response = await axios.get(API_URLS.getReceipt(id));
      
      // Check for graceful permission error first
      if (response.data.status === 'error' && response.data.error_code === 'PERMISSION_DENIED') {
        // Handle graceful permission error by throwing with response data
        const permissionError = new Error(response.data.message || 'Permission denied');
        permissionError.response = response;
        throw permissionError;
      }
      
      if (response.data.status === 'success' && response.data.data) {
        const receipt = response.data.data;
        console.log('Loaded receipt data:', receipt);
        
        // Map backend data to frontend format
        setReceiptData({
          receiptNo: receipt.receipt_no,
          date: receipt.receipt_date?.split('T')[0] || receipt.receipt_date,
          name: receipt.donor_name || '',
          village: receipt.village || '',
          residence: receipt.residence || '',
          mobile: receipt.mobile || '',
          relation: receipt.relation_address || '',
          paymentMode: receipt.payment_mode === 'Cash' ? 'કેશ / Cash' : 
                      receipt.payment_mode === 'Check' ? 'ચેક / Check' :
                      receipt.payment_mode === 'Online' ? 'ઓનલાઈન / Online' : 'કેશ / Cash',
          paymentDetails: receipt.payment_details || '',
          donation1Purpose: receipt.donation1_purpose || '',
          donation1: receipt.donation1_amount ? formatIndianNumber(receipt.donation1_amount.toString()) : '',
          donation2: receipt.donation2_amount ? formatIndianNumber(receipt.donation2_amount.toString()) : '',
          total: receipt.total_amount ? formatIndianNumber(receipt.total_amount.toString()) : ''
        });
        
        // Set total words display
        if (receipt.total_amount_words) {
          setTotalWordsDisplay(receipt.total_amount_words.replace(' Rupees', ''));
        }
        
        // Set states for editing existing receipt
        setReceiptId(receipt.id);
        setIsSaved(true);
        setIsEditMode(true);
        setIsPreviewMode(true); // Start in preview mode like after saving
        
        console.log('Receipt loaded successfully for editing');
      } else {
        throw new Error('Receipt not found');
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
      
      let errorMessage = "Failed to load receipt for editing.";
      if (error.response?.status === 404) {
        errorMessage = "Receipt not found. It may have been deleted.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to edit this receipt.";
      }
      
      setOverlayState({
        isVisible: true,
        message: errorMessage,
        isError: true,
        errorType: "general",
        pendingAction: { type: 'goBackToModify' }
      });
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle amount fields with validation and formatting
    if (name === 'donation1' || name === 'donation2') {
      // Remove commas and validate input
      const numericValue = getNumericValue(value);
      if (numericValue === '' || /^\d*\.?\d*$/.test(numericValue)) {
        const formattedValue = formatIndianNumber(numericValue);
        setReceiptData(prev => ({
          ...prev,
          [name]: formattedValue
        }));
      }
    } else {
      setReceiptData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveReceipt = async () => {
    try {
      // Validate required fields
      if (!receiptData.name || !receiptData.total) {
        setOverlayState({
          isVisible: true,
          message: "Please fill in required fields: Name and Total Amount",
          isError: true,
          errorType: "validation",
          pendingAction: null
        });
        return;
      }

      // Validate total amount
      const totalAmount = parseFloat(getNumericValue(receiptData.total));
      if (!totalAmount || totalAmount <= 0) {
        setOverlayState({
          isVisible: true,
          message: "Please enter a valid total amount",
          isError: true,
          errorType: "validation",
          pendingAction: null
        });
        return;
      }

      setIsSaving(true);
      console.log('Saving receipt data:', receiptData);
      
      // Helper function to safely parse float
      const safeParseFloat = (value) => {
        if (!value || value === '') return 0.00;
        const numericValue = getNumericValue(value);
        const parsed = parseFloat(numericValue);
        return isNaN(parsed) ? 0.00 : parsed;
      };
      
      // Helper function to extract payment mode
      const getPaymentMode = (paymentModeValue) => {
        if (!paymentModeValue || paymentModeValue === '') {
          return 'Cash'; // Default to Cash
        }
        
        // Handle Gujarati/English mixed values like "કેશ / Cash"
        if (paymentModeValue.includes('/')) {
          const englishPart = paymentModeValue.split('/')[1]?.trim();
          if (englishPart) {
            return englishPart;
          }
        }
        
        // Map common variations
        const modeMap = {
          'cash': 'Cash',
          'Cash': 'Cash',
          'check': 'Check', 
          'Check': 'Check',
          'cheque': 'Check',
          'Cheque': 'Check',
          'online': 'Online',
          'Online': 'Online'
        };
        
        return modeMap[paymentModeValue] || 'Cash';
      };

      // Prepare data for API (match backend ReceiptCreate model)
      const apiData = {
        receipt_date: receiptData.date,
        donor_name: receiptData.name.trim(),
        village: receiptData.village?.trim() || null,
        residence: receiptData.residence?.trim() || null,
        mobile: receiptData.mobile?.trim() || null,
        relation_address: receiptData.relation?.trim() || null,
        payment_mode: getPaymentMode(receiptData.paymentMode),
        payment_details: receiptData.paymentDetails?.trim() || null,
        donation1_purpose: receiptData.donation1Purpose?.trim() || null,
        donation1_amount: safeParseFloat(receiptData.donation1),
        donation2_amount: safeParseFloat(receiptData.donation2),
        total_amount: totalAmount,
        total_amount_words: totalWordsDisplay ? `${totalWordsDisplay} Rupees` : null
      };

      console.log('API payload:', apiData);
      
      // Additional debugging to check data types
      console.log('Data types validation:');
      console.log('- receipt_date:', typeof apiData.receipt_date, apiData.receipt_date);
      console.log('- donor_name:', typeof apiData.donor_name, `"${apiData.donor_name}"`);
      console.log('- payment_mode:', typeof apiData.payment_mode, `"${apiData.payment_mode}"`);
      console.log('- donation1_amount:', typeof apiData.donation1_amount, apiData.donation1_amount);
      console.log('- donation2_amount:', typeof apiData.donation2_amount, apiData.donation2_amount);
      console.log('- total_amount:', typeof apiData.total_amount, apiData.total_amount);

      // Make API call - create new receipt OR update existing receipt
      let response;
      if (isEditMode && receiptId) {
        console.log('Updating existing receipt with ID:', receiptId);
        response = await axios.put(API_URLS.updateReceipt(receiptId), apiData);
      } else {
        console.log('Creating new receipt');
        response = await axios.post(API_URLS.createReceipt(), apiData);
      }
      
      console.log('Receipt created successfully:', response.data);
      
      // Check for graceful permission error first
      if (response.data.status === 'error' && response.data.error_code === 'PERMISSION_DENIED') {
        // Handle graceful permission error by throwing with response data
        const permissionError = new Error(response.data.message || 'Permission denied');
        permissionError.response = response;
        throw permissionError;
      }
      
      if (response.data.status === 'success' && response.data.data) {
        // Update receipt data with actual receipt number from backend
        const savedReceipt = response.data.data;
        
        setReceiptData(prev => ({
          ...prev,
          receiptNo: savedReceipt.receipt_no // This will be like "RCA/2025/0001" or "RC1/2025/0002"
        }));
        
        // Store receipt ID and set states based on context
        if (!isEditMode) {
          // Only set receipt ID on first creation
          setReceiptId(savedReceipt.id);
        }
        setIsSaved(true); // Mark as saved to show actual receipt number
        
        // Only set edit mode if we came from modify receipt list
        // If user came from create receipt page, keep it as create mode for "Create New Receipt" button
        if (cameFromModifyList) {
          setIsEditMode(true); // User came from modify list, show "Back to List"
        }
        // If !cameFromModifyList, keep isEditMode as false so "Create New Receipt" shows
      
      // Show success message and switch to preview mode
        const action = isEditMode ? 'updated' : 'created';
      setOverlayState({
        isVisible: true,
          message: `Receipt ${savedReceipt.receipt_no} ${action} successfully!`,
        isError: false,
        errorType: "general",
        pendingAction: { type: 'switchToPreview' }
      });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      
      const errorInfo = handleAPIError(error, "Error saving receipt. Please try again.");
      
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
      setIsSaving(false);
    }
  };

  const optimizePrintStyles = () => {
    const printCSS = document.createElement('style');
    printCSS.innerHTML = `
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .create-receipt-container { background: white !important; }
        .receipt { 
          font-family: 'Noto Sans Gujarati', 'Noto Sans', Arial, sans-serif !important; 
          width: 200mm !important; 
          border: 3px solid #000 !important;
          padding: 5px !important;
          margin: 15mm auto 0 auto !important;
          transform: none !important;
          max-height: 135mm !important;
          position: relative !important;
          font-size: 11pt !important;
        }
        .receipt::before {
          content: "Original receipt" !important;
          position: absolute !important;
          top: -8mm !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #000 !important;
          text-align: center !important;
          width: 100% !important;
          display: block !important;
        }
        .copy-receipt::before {
          content: "Duplicate receipt" !important;
          position: absolute !important;
          top: -8mm !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #000 !important;
          text-align: center !important;
          width: 100% !important;
          display: block !important;
        }
        .receipt-header { 
          background: #000 !important; 
          color: #ffffff !important; 
          display: flex !important;
          height: 60px !important;
        }
        .receipt-header * { color: #ffffff !important; }
        .receipt-header .title { 
          color: #ffffff !important; 
          font-weight: 700 !important; 
          font-size: 18px !important;
        }
        .footer-sign { 
          margin-top: 8px !important; 
          padding-right: 10px !important; 
          font-size: 11px !important;
          font-weight: 800 !important;
        }
        .donation thead th { 
          background: #d9d9d9 !important; 
          color: #000 !important; 
          border: 2px solid #000 !important;
          font-size: 10px !important;
          height: 18px !important;
          padding: 1px 3px !important;
        }
        .devotional-line { font-size: 14px !important; }
        .contact-line { font-size: 10px !important; }
        .form-row label { font-size: 10px !important; }
        .form-row .input-line { font-size: 10px !important; height: 16px !important; padding: 1px 3px !important; }
        .donation tbody td { font-size: 9px !important; height: 12px !important; padding: 1px 4px !important; }
        .donation .total-row td { font-size: 11px !important; height: 14px !important; padding: 1px 4px !important; }
        .donation .total-row td:first-child { text-align: left !important; padding-left: 8px !important; font-weight: normal !important; }
        .form-row { margin-bottom: 3px !important; gap: 4px !important; }
        .donation { margin-top: 3px !important; }
        .receipt-form-area { padding: 3px 3px 0 3px !important; }
        .payment-dropdown { height: 20px !important; padding: 1px 3px !important; }
      }
    `;
    document.head.appendChild(printCSS);
    
    // Remove after print is done
    setTimeout(() => {
      if (document.head.contains(printCSS)) {
        document.head.removeChild(printCSS);
      }
    }, 5000);
  };

  const handlePrintReceipt = () => {
    // Optimize print styles
    optimizePrintStyles();
    
    // Wait for DOM to update and styles to apply
    setTimeout(() => {
      // Ensure all images are loaded before printing
      const images = document.querySelectorAll('.receipt img');
      let imagesLoaded = 0;
      const totalImages = images.length;
      
      const checkImagesAndPrint = () => {
        if (imagesLoaded === totalImages) {
          // Additional delay to ensure styles are fully applied
          setTimeout(() => {
            window.print();
          }, 200);
        }
      };
      
      if (totalImages === 0) {
        // No images to wait for
        setTimeout(() => {
          window.print();
        }, 300);
      } else {
        images.forEach((img) => {
          if (img.complete) {
            imagesLoaded++;
          } else {
            img.onload = () => {
              imagesLoaded++;
              checkImagesAndPrint();
            };
            img.onerror = () => {
              imagesLoaded++; // Count even failed images
              checkImagesAndPrint();
            };
          }
        });
        checkImagesAndPrint();
      }
    }, 150);
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download functionality using libraries like jsPDF or react-pdf
    console.log('Downloading PDF:', receiptData);
    setOverlayState({
      isVisible: true,
      message: "PDF download functionality will be implemented soon!",
      isError: false,
      errorType: "general",
      pendingAction: null
    });
  };

  const handleReset = () => {
    setIsSaved(false); // Reset saved state
    setReceiptId(null); // Clear receipt ID
    setIsEditMode(false); // Reset to create mode
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format for HTML date input
    setReceiptData({
      receiptNo: '',
      date: todayDate,
      name: '',
      village: '',
      residence: '',
      mobile: '',
      relation: '',
      paymentMode: '',
      paymentDetails: '',
      donation1Purpose: '',
      donation1: '',
      donation2: '',
      total: ''
    });
    setTotalWordsDisplay('');
    generateReceiptNumber();
    setIsPreviewMode(false);
  };

  const handleCreateNewReceipt = () => {
    // Directly reset to create new receipt - no loading screen needed
    handleReset();
  };

  // Handle overlay actions
  const handleOverlayAction = (action) => {
    if (action?.type === 'switchToPreview') {
      setIsPreviewMode(true);
    } else if (action?.type === 'goBackToModify') {
      // Navigate back to modify receipts page
      navigate('/modify-receipt');
    }
    setOverlayState({ ...overlayState, isVisible: false });
  };

  return (
    <div className="create-receipt-container">
      {/* Loading state for existing receipt */}
      {isLoadingReceipt && (
        <div className="loading-receipt">
          <div className="loading-spinner">⏳</div>
          <span>Loading receipt for editing...</span>
        </div>
      )}

      {!isLoadingReceipt && !isPreviewMode && (
        <div className="receipt-actions">
          <h1 className="page-title">{isEditMode ? 'Edit Receipt' : 'Create Receipt'}</h1>
          <div className="action-buttons">
            <button 
              onClick={handleSaveReceipt} 
              className="btn btn-save"
              disabled={isSaving || isPreviewMode}
            >
              {isSaving ? '⏳ Saving...' : (isEditMode ? '✏️ Update Receipt' : '💾 Save Receipt')}
            </button>
          </div>
        </div>
      )}

      {!isLoadingReceipt && isPreviewMode && (
        <div className="receipt-actions no-print">
          <h1 className="page-title">Receipt Preview</h1>
          <div className="action-buttons">
            <button onClick={() => setIsPreviewMode(false)} className="btn btn-edit">
              ✏️ Edit Receipt
            </button>
            <button onClick={handlePrintReceipt} className="btn btn-print">
              🖨️ Print Receipt
            </button>
            {cameFromModifyList && (
              <button onClick={() => navigate('/modify-receipt')} className="btn btn-back">
                ⬅️ Back to List
              </button>
            )}
            {!cameFromModifyList && (
              <button onClick={handleCreateNewReceipt} className="btn btn-new">
                ➕ Create New Receipt
              </button>
            )}
          </div>
        </div>
      )}

      <div className="receipt-form">
        <div className="receipt">
          <div className="devotional-line">
            ॥ શ્રી વિશ્વકર્મણે નમઃ ॥
          </div>
          <div className="receipt-header">
            <div className="left">
              <div className="logo-container left-container">
                <img 
                  src={SiddhapurLogo} 
                  alt="Siddhapur Logo" 
                  className="receipt-logo left-logo"
                />
              </div>
            </div>
            <div className="title">
              શ્રી વિશ્વકર્મા ધાનધાર મેવાડા સુથાર સમાજ <br />
              સમૂહ લગ્ન ટ્રસ્ટ, સિધ્ધપુર
            </div>
            <div className="right">
              <div className="logo-container">
                <img 
                  src={OrganizationLogo} 
                  alt="Organization Logo" 
                  className="receipt-logo right-logo"
                />
              </div>
            </div>
          </div>
          
          <div className="contact-info">
            <div className="contact-line">રજી. નં. એ/૯૭૮, પાટણ તા.૩-૧૨-૨૦૦૮</div>
            <div className="contact-line">C/o."સેવા સદન" મેવાડા ટીમ્બરની સામે, દેથળી રોડ, સિધ્ધપુર - ૩૮૪૧૫૧</div>
          </div>
          
          <div className="separator"></div>

          <div className="receipt-form-area">
            <div className="form-row">
              <label>રસીદ નં.</label>
              <input
                className="input-line receipt-no-readonly"
                type="text"
                name="receiptNo"
                value={receiptData.receiptNo}
                onChange={handleInputChange}
                readOnly={true}
                placeholder="Receipt Number"
                style={{borderBottom: 'none'}}
                title="Receipt number is auto-generated and cannot be edited"
              />
              <div style={{flex: 1}}></div>
              <label style={{width: '40px', marginLeft: '80px'}}>તારીખ</label>
              <input
                className="input-line date-input"
                type="date"
                name="date"
                value={receiptData.date}
                onChange={handleInputChange}
                readOnly={isPreviewMode}
                style={{marginRight: '5px', borderBottom: 'none'}}
              />
            </div>
            
            <div className="form-row">
              <label>શ્રી/શ્રીમતી,</label>
              <input
                className="input-line"
                type="text"
                name="name"
                value={receiptData.name}
                onChange={handleInputChange}
                placeholder="Name"
                readOnly={isPreviewMode}
              />
            </div>
            
            <div className="form-row">
              <label>મૂળ વતન :</label>
              <input
                className="input-line"
                type="text"
                name="village"
                value={receiptData.village}
                onChange={handleInputChange}
                placeholder="Village"
                readOnly={isPreviewMode}
              />
              <label style={{width: '90px'}}>રહેઠાણ :</label>
              <input
                className="input-line"
                type="text"
                name="residence"
                value={receiptData.residence}
                onChange={handleInputChange}
                placeholder="Residence"
                readOnly={isPreviewMode}
              />
            </div>
            
            <div className="form-row">
              <label>મોબાઇલ નં.</label>
              <input
                className="input-line"
                type="text"
                name="mobile"
                value={receiptData.mobile}
                onChange={handleInputChange}
                placeholder="Mobile Number"
                readOnly={isPreviewMode}
              />
              <label style={{width: '90px'}}>સરનામું</label>
              <input
                className="input-line"
                type="text"
                name="relation"
                value={receiptData.relation}
                onChange={handleInputChange}
                placeholder="Address/Relation"
                readOnly={isPreviewMode}
              />
            </div>
            
            <div className="form-row">
              <label style={{width: '180px'}}>કેશ/ચેક/ઓનલાઈન થી</label>
              <select
                className="payment-dropdown"
                name="paymentMode"
                value={receiptData.paymentMode}
                onChange={handleInputChange}
                disabled={isPreviewMode}
              >
                <option value="">પસંદ કરો</option>
                <option value="કેશ / Cash">કેશ / Cash</option>
                <option value="ચેક / Check">ચેક / Check</option>
                <option value="ઓનલાઈન / Online">ઓનલાઈન / Online</option>
              </select>
              <input
                className="input-line"
                type="text"
                name="paymentDetails"
                value={receiptData.paymentDetails}
                onChange={handleInputChange}
                placeholder=""
                readOnly={isPreviewMode}
                style={{marginLeft: '10px'}}
              />
            </div>
          </div>

          <table className="donation">
            <thead>
              <tr>
                <th className="col-no">ક્રમ</th>
                <th className="col-desc">દાનની વિગત</th>
                <th className="col-amt">રકમ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-no">1</td>
                <td className="col-desc">
                  કંડોગ્રીઃ (કોર્પસ ફંડ) / 
                  <input
                    type="text"
                    name="donation1Purpose"
                    value={receiptData.donation1Purpose}
                    onChange={handleInputChange}
                    placeholder="ખર્ચ પ્રકાર લખો"
                    readOnly={isPreviewMode}
                  />
                  સમૂહ લગ્ન ખર્ચ / દાન ભેટ
                </td>
                <td className="col-amt">
                  <input
                    type="text"
                    name="donation1"
                    value={receiptData.donation1}
                    onChange={handleInputChange}
                    placeholder="Amount"
                    readOnly={isPreviewMode}
                  />
                </td>
              </tr>
              <tr>
                <td className="col-no">2</td>
                <td className="col-desc">અન્ય દાન :</td>
                <td className="col-amt">
                  <input
                    type="text"
                    name="donation2"
                    value={receiptData.donation2}
                    onChange={handleInputChange}
                    placeholder="Amount"
                    readOnly={isPreviewMode}
                  />
                </td>
              </tr>
              <tr className="total-row">
                <td colSpan="2" style={{textAlign:'left', paddingLeft:'8px', verticalAlign:'middle', fontSize:'1rem', fontWeight:'normal', height:'32px'}}>
                  <span style={{fontWeight:'bold'}}>અંકે રૂપિયા: </span><span style={{fontWeight:'normal'}}>{totalWordsDisplay && `${totalWordsDisplay} Rupees`}</span>
                </td>
                <td className="col-amt">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span style={{fontWeight:'bold', fontSize:'1rem'}}>કુલ</span>
                    <input
                      type="text"
                      name="total"
                      value={receiptData.total}
                      onChange={handleInputChange}
                      readOnly
                      style={{width:'auto', minWidth:'60px', textAlign:'right', border:'none', background:'transparent', fontSize:'0.85rem', fontWeight:'normal'}}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{height:'30px'}}></div>
          
          <div className="footer-sign">સ્વીકૃત કરનારની સહી</div>
        </div>
      </div>
{/* ----------------------------------------------  duplicate receipt ----------------------------------------------- */}
      <div className="receipt-form">
        <div className="receipt copy-receipt">
          <div className="devotional-line">
            ॥ શ્રી વિશ્વકર્મણે નમઃ ॥
          </div>
          <div className="receipt-header">
            <div className="left">
              <div className="logo-container left-container">
                <img 
                  src={SiddhapurLogo} 
                  alt="Siddhapુર Logo" 
                  className="receipt-logo left-logo"
                />
              </div>
            </div>
            <div className="title">
              શ્રી વિશ્વકર્મા ધાનધાર મેવાડા સુથાર સમાજ <br />
              સમૂહ લગ્ન ટ્રસ્ટ, સિધ્ધપુર
            </div>
            <div className="right">
              <div className="logo-container">
                <img 
                  src={OrganizationLogo} 
                  alt="Organization Logo" 
                  className="receipt-logo right-logo"
                />
              </div>
            </div>
          </div>
          
          <div className="contact-info">
            <div className="contact-line">રજી. નં. એ/૯૭૮, પાટણ તા.૩-૧૨-૨૦૦૮</div>
            <div className="contact-line">C/o."સેવા સદન" મેવાડા ટીમ્બરની સામે, દેથળી રોડ, સિધ્ધપુર - ૩૮૪૧૫૧</div>
          </div>
          
          <div className="separator"></div>

          <div className="receipt-form-area">
            <div className="form-row">
              <label>રસીદ નં.</label>
              <input
                className="input-line receipt-no-readonly"
                type="text"
                name="receiptNo"
                value={receiptData.receiptNo}
                onChange={handleInputChange}
                readOnly={true}
                placeholder="Receipt Number"
                style={{borderBottom: 'none'}}
                title="Receipt number is auto-generated and cannot be edited"
              />
              <div style={{flex: 1}}></div>
              <label style={{width: '40px', marginLeft: '80px'}}>તારીખ</label>
              <input
                className="input-line date-input"
                type="date"
                name="date"
                value={receiptData.date}
                onChange={handleInputChange}
                readOnly={isPreviewMode}
                style={{marginRight: '5px', borderBottom: 'none'}}
              />
            </div>
            
            <div className="form-row">
              <label>શ્રી/શ્રીમતી,</label>
              <input
                className="input-line"
                type="text"
                name="name"
                value={receiptData.name}
                onChange={handleInputChange}
                placeholder="Name"
                readOnly={isPreviewMode}
              />
            </div>
            
            <div className="form-row">
              <label>મૂળ વતન :</label>
              <input
                className="input-line"
                type="text"
                name="village"
                value={receiptData.village}
                onChange={handleInputChange}
                placeholder="Village"
                readOnly={isPreviewMode}
              />
              <label style={{width: '90px'}}>રહેઠાણ :</label>
              <input
                className="input-line"
                type="text"
                name="residence"
                value={receiptData.residence}
                onChange={handleInputChange}
                placeholder="Residence"
                readOnly={isPreviewMode}
              />
            </div>
            
            <div className="form-row">
              <label>મોબાઇલ નં.</label>
              <input
                className="input-line"
                type="text"
                name="mobile"
                value={receiptData.mobile}
                onChange={handleInputChange}
                placeholder="Mobile Number"
                readOnly={isPreviewMode}
              />
              <label style={{width: '90px'}}>સરનામું</label>
              <input
                className="input-line"
                type="text"
                name="relation"
                value={receiptData.relation}
                onChange={handleInputChange}
                placeholder="Address/Relation"
                readOnly={isPreviewMode}
              />
            </div>
            
            <div className="form-row">
              <label style={{width: '180px'}}>કેશ/ચેક/ઓનલાઈન થી</label>
              <select
                className="payment-dropdown"
                name="paymentMode"
                value={receiptData.paymentMode}
                onChange={handleInputChange}
                disabled={isPreviewMode}
              >
                <option value="">પસંદ કરો</option>
                <option value="કેશ / Cash">કેશ / Cash</option>
                <option value="ચેક / Check">ચેક / Check</option>
                <option value="ઓનલાઈન / Online">ઓનલાઈન / Online</option>
              </select>
              <input
                className="input-line"
                type="text"
                name="paymentDetails"
                value={receiptData.paymentDetails}
                onChange={handleInputChange}
                placeholder=""
                readOnly={isPreviewMode}
                style={{marginLeft: '10px'}}
              />
            </div>
          </div>

          <table className="donation">
            <thead>
              <tr>
                <th className="col-no">ક્રમ</th>
                <th className="col-desc">દાનની વિગત</th>
                <th className="col-amt">રકમ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-no">1</td>
                <td className="col-desc">
                  કંડોગ્રીઃ (કોર્પસ ફંડ) / 
                  <input
                    type="text"
                    name="donation1Purpose"
                    value={receiptData.donation1Purpose}
                    onChange={handleInputChange}
                    placeholder="ખર્ચ પ્રકાર લખો"
                    readOnly={isPreviewMode}
                  />
                  સમૂહ લગ્ન ખર્ચ / દાન ભેટ
                </td>
                <td className="col-amt">
                  <input
                    type="text"
                    name="donation1"
                    value={receiptData.donation1}
                    onChange={handleInputChange}
                    placeholder="Amount"
                    readOnly={isPreviewMode}
                  />
                </td>
              </tr>
              <tr>
                <td className="col-no">2</td>
                <td className="col-desc">અન્ય દાન :</td>
                <td className="col-amt">
                  <input
                    type="text"
                    name="donation2"
                    value={receiptData.donation2}
                    onChange={handleInputChange}
                    placeholder="Amount"
                    readOnly={isPreviewMode}
                  />
                </td>
              </tr>
              <tr className="total-row">
                <td colSpan="2" style={{textAlign:'left', paddingLeft:'8px', verticalAlign:'middle', fontSize:'1rem', fontWeight:'normal', height:'32px'}}>
                  <span style={{fontWeight:'bold'}}>અંકે રૂપિયા: </span><span style={{fontWeight:'normal'}}>{totalWordsDisplay && `${totalWordsDisplay} Rupees`}</span>
                </td>
                <td className="col-amt">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span style={{fontWeight:'bold', fontSize:'1rem'}}>કુલ</span>
                    <input
                      type="text"
                      name="total"
                      value={receiptData.total}
                      onChange={handleInputChange}
                      readOnly
                      style={{width:'auto', minWidth:'60px', textAlign:'right', border:'none', background:'transparent', fontSize:'0.85rem', fontWeight:'normal'}}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{height:'30px'}}></div>
          
          <div className="footer-sign">સ્વીકૃત કરનારની સહી</div>
        </div>
      </div>

      {/* StatusOverlay for all popup messages */}
      <StatusOverlay
        isVisible={overlayState.isVisible}
        message={overlayState.message}
        isError={overlayState.isError}
        errorType={overlayState.errorType}
        onRetry={null}
        onClose={() => {
          handleOverlayAction(overlayState.pendingAction);
        }}
        onLoginAgain={overlayState.errorType === 'unauthorized' || overlayState.errorType === 'auth' ? logout : null}
      />
    </div>
  );
};

export default CreateReceipt;
