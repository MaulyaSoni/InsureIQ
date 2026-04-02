import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_db = f"sqlite:///{Path(__file__).resolve().parents[1] / 'insureiq.db'}"
os.environ["DATABASE_URL"] = _db

from backend.main import app
print(f"OK - {len(app.routes)} routes loaded")
