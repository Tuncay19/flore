import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Dersde SQLite kifayətdir. Sonra Postgres-ə keçmək üçün yalnız DATABASE_URL dəyişir.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./flowershop.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
