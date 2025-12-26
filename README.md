📂 Backend Setup
✅ Prerequisites
Python 3.9+

⚙️ Environment Setup
Navigate to the backend folder and create a virtual environment:

python -m venv env_be
Note: The virtual environment (env_be) is excluded via .gitignore.

Activate the virtual environment:

Windows (PowerShell):

powershell
.\env_be\Scripts\Activate.ps1
macOS/Linux:

source env_be/bin/activate
Install the required dependencies:

pip install -r requirements.txt
Run the FastAPI server with Uvicorn:

uvicorn main:app --reload --port 8002
The backend will be accessible at: https://svmps-frontend.onrender.com

--------------------------------------------------------------------------------

💻 Frontend Setup
✅ Prerequisites
Node.js (v14+ recommended)

⚙️ Environment Setup
Navigate to the frontend folder:

cd frontend
Install the frontend dependencies:
npm install

Start the development server:
npm run dev

The frontend will be accessible at: http://localhost:3000

to run and deploy the fresh frontend on git hub 
# Clean and build
>> npm run build
>>
>> # Deploy
>> npm run deploy
>>

-------------------------------------------------------------------------------

📌 Notes
Make sure to activate the Python environment every time before running the backend.

Default ports:

Backend: 8002

Frontend: 3000

Modify .env files or configuration as needed for your environment.

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