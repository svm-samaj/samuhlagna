from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from router.user_data import router as user_data_router
from router.village_area import router as village_area_router
from router.auth import router as auth_router
from router.receipts import router as receipts_router
from models import auth  # Import auth models for table creation

# Import database
from database import engine
import models.user_data  # Import to ensure tables are created
import models.village_area
import models.receipts  # Import receipts models for table creation

app = FastAPI(
    title="SVMPS API",
    description="Shree Vishwakarma Mewada Suthar Samaj API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
models.user_data.Base.metadata.create_all(bind=engine)
models.village_area.Base.metadata.create_all(bind=engine)
models.auth.Base.metadata.create_all(bind=engine)  # Create auth tables
models.receipts.Base.metadata.create_all(bind=engine)  # Create receipts tables

# Include routers
app.include_router(user_data_router, tags=["user_data"])
app.include_router(village_area_router, tags=["village_area"])
app.include_router(auth_router)
app.include_router(receipts_router)  # Add receipts router

@app.get("/")
async def root():
    return {
        "message": "SVMPS API is running",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running properly"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
