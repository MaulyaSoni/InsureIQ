from backend.database.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
    print("Tables:", [t[0] for t in tables])

    for table in ["users", "policies", "risk_predictions"]:
        try:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
            print(f"{table}: {count[0]} rows")
        except Exception as e:
            print(f"{table}: error - {e}")
