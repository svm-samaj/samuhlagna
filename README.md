# SVMPS Frontend - Receipt Management System

A comprehensive receipt management system for Shree Vishwakarma Dhandhar Mewada Suthar Samaj Samuh Lagna Trust, Siddhpur.

## 📋 Project Overview

This application manages donation receipts, user data, villages, and areas with role-based access control. Built with FastAPI (backend) and React (frontend).

### Features
- 👥 User Management (Admin Panel)
- 🧾 Receipt Creation & Management
- 📊 Reports & Analytics
- 🏘️ Village & Area Management
- 🔐 Role-Based Access Control
- 📱 Responsive UI

---

## 📂 Backend Setup

### ✅ Prerequisites
- Python 3.9+

### ⚙️ Environment Setup

1. **Navigate to the backend folder and create a virtual environment:**
   ```bash
python -m venv env_be
   ```
Note: The virtual environment (env_be) is excluded via .gitignore.

2. **Activate the virtual environment:**

   **Windows (PowerShell):**
   ```powershell
.\env_be\Scripts\Activate.ps1
   ```

   **macOS/Linux:**
   ```bash
source env_be/bin/activate
   ```

3. **Install the required dependencies:**
   ```bash
   cd backend
pip install -r requirements.txt
   ```

4. **Run the FastAPI server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

---

## 💻 Frontend Setup

### ✅ Prerequisites
- Node.js (v14+ recommended)

### ⚙️ Environment Setup

1. **Navigate to the frontend folder:**
   ```bash
cd frontend
   ```

2. **⚠️ IMPORTANT: Create `.env` file**
   
   Create a `.env` file in the `frontend/` directory with these variables:
   
   ```env
   VITE_NODE_ENV=development
   VITE_DEV_API_URL=http://127.0.0.1:8000
   VITE_PROD_API_URL=https://svmps-frontend.onrender.com
   ```

3. **Install frontend dependencies:**
   ```bash
npm install
   ```

4. **Start the development server:**
   ```bash
npm run dev
   ```

   The frontend will be accessible at: `http://localhost:3000`

### 🚀 Build & Deploy

**Build for production:**
```bash
npm run build:prod
```

**Deploy to GitHub Pages:**
```bash
npm run deploy
```

---

## 🔧 Environment Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_NODE_ENV` | Environment mode | `development` or `production` |
| `VITE_DEV_API_URL` | Local backend URL | `http://127.0.0.1:8000` |
| `VITE_PROD_API_URL` | Production backend URL | `https://svmps-frontend.onrender.com` |

### Developer Tools (Browser Console)

Test production backend locally:
```javascript
DEV_UTILS.forceProduction();  // Switch to production backend
DEV_UTILS.useLocalBackend();  // Switch back to local
DEV_UTILS.getStatus();         // Check current config
```

---

## 📌 Important Notes

- ✅ **Backend Port**: 8000 (development)
- ✅ **Frontend Port**: 3000
- ⚠️ **Environment File**: Must create `.env` in `frontend/` directory
- ⚠️ **No Hardcoded URLs**: All API URLs use environment variables
- ⚠️ **Git Ignored**: `.env` file is not committed to repository

📁 Project Structure
svmps_frontend/
│
├── backend/
│   ├── env_be/                # Python virtual environment (excluded from Git)
│   ├── main.py                # FastAPI entry point
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── node_modules/          # Node dependencies
│   ├── public/                # Static assets
│   ├── src/                   # Source code
│   └── package.json           # npm config
│
└── README.md

## 📊 Database Schema

### Receipts Table
```sql
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    
    -- Receipt identification (format: RC1/2025/1234)
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL,
    
    -- Donor information
    donor_name VARCHAR(255) NOT NULL,
    village VARCHAR(255),
    residence VARCHAR(255), 
    mobile VARCHAR(15),
    relation_address TEXT,
    
    -- Payment information
    payment_mode VARCHAR(10) CHECK (payment_mode IN ('Cash', 'Check', 'Online')) NOT NULL,
    payment_details VARCHAR(500),
    
    -- Donation details
    donation1_purpose VARCHAR(500),
    donation1_amount DECIMAL(15,2) DEFAULT 0.00,
    donation2_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    total_amount_words TEXT,
    
    -- Status tracking
    status VARCHAR(10) CHECK (status IN ('completed', 'cancelled')) DEFAULT 'completed',
    
    -- User reference
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX idx_receipt_no ON receipts (receipt_no);
CREATE INDEX idx_receipt_date ON receipts (receipt_date);
CREATE INDEX idx_donor_name ON receipts (donor_name);
CREATE INDEX idx_mobile ON receipts (mobile);
CREATE INDEX idx_created_by ON receipts (created_by);
CREATE INDEX idx_status ON receipts (status);
```

### Receipt Number Format
- **Format**: `{creator_code}/{year}/{receipt_id:04d}` (4-digit zero-padded ID)
- **Creator Codes**: Based on username and role
  - `admin` (superadmin) → `RCA` (Receipt Creator Admin)
  - `receipt_creator1` → `RC1` (Receipt Creator 1)
  - `receipt_creator2` → `RC2` (Receipt Creator 2)  
- **Examples**: 
  - `RCA/2025/0001` (Admin created receipt ID 1 in 2025)
  - `RC1/2025/0002` (receipt_creator1 created receipt ID 2 in 2025)
  - `RC2/2025/0003` (receipt_creator2 created receipt ID 3 in 2025)
- **Generation**: Auto-generated after database insert using username-based logic
- **Note**: Only admin and receipt_creator* users can create receipts