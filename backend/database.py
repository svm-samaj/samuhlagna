from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool

DATABASE_URL = (
    "postgresql+psycopg2://neondb_owner:npg_MAJDqzi0Nvt1@"
    "ep-autumn-frog-adxfjews-pooler.c-2.us-east-1.aws.neon.tech/neondb"
    "?sslmode=require&channel_binding=require"
)

# Enhanced connection configuration for Render + Neon stability
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,                # Number of connections to maintain
    max_overflow=10,            # Additional connections beyond pool_size  
    pool_pre_ping=True,         # Test connections before use
    pool_recycle=300,           # Recycle connections every 5 minutes
    pool_timeout=20,            # Timeout for getting connection from pool
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10,   # Connection timeout in seconds
        "application_name": "svmps_backend"
    },
    echo=False                  # Set to True for SQL debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
Base = declarative_base()
