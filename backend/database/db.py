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

    from sqlalchemy import text
    from sqlalchemy.engine import Engine

    if not isinstance(engine, Engine) or not hasattr(engine, "dialect"):
        return

    dialect_name = engine.dialect.name if hasattr(engine.dialect, "name") else str(engine.url.driver)

    if dialect_name == "sqlite":
        with engine.connect() as conn:
            existing_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            existing = {r[0] for r in existing_tables}

            _add_column_if_missing(conn, "users", "organization_id", "TEXT")
            _add_column_if_missing(conn, "users", "role", "TEXT DEFAULT 'ANALYST'")
            _add_column_if_missing(conn, "users", "invited_by", "TEXT")

            _add_column_if_missing(conn, "policies", "policy_end_date", "DATE")

            _add_column_if_missing(conn, "risk_predictions", "fraud_flagged", "INTEGER NOT NULL DEFAULT 0")
            _add_column_if_missing(conn, "risk_predictions", "fraud_signals", "TEXT NOT NULL DEFAULT '[]'")

            if "fraud_reviews" in existing:
                _add_column_if_missing(conn, "fraud_reviews", "notes", "TEXT")
                _add_column_if_missing(conn, "fraud_reviews", "reviewed_at", "TIMESTAMP")

            conn.commit()


def _add_column_if_missing(conn, table: str, column: str, sqlite_type: str) -> None:
    from sqlalchemy import text

    existing = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    if not existing:
        return
    col_names = {r[1] for r in existing}
    if column not in col_names:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sqlite_type}"))
