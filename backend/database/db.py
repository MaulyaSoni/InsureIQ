import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite:///./insureiq.db")


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
