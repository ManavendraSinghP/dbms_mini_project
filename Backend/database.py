import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. EXPLICITLY LOAD THE .ENV FILE
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# 2. Priority: Explicit environment variable -> Local fallback
DEFAULT_LOCAL_URL = "mysql+pymysql://root:password@localhost:3306/christ_exam_planner"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_LOCAL_URL)

# Normalize provider schemes
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

# 3. Create the engine. (We rely on the '?ssl_mode=REQUIRED' already in your Aiven URL)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Automatically reconnect dropped connections
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800        # Prevent MySQL 8h wait_timeout disconnects
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()