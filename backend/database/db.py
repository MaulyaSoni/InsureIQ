import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def _database_url() -> str:
    default_db = Path(__file__).resolve().parent.parent / "insureiq.db"
    return os.environ.get("DATABASE_URL", f"sqlite:///{default_db}")


connect_args = {"check_same_thread": False} if _database_url().startswith("sqlite") else {}
engine = create_engine(_database_url(), connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import backend.database.models  # noqa: F401 — register ORM metadata

    Base.metadata.create_all(bind=engine)
