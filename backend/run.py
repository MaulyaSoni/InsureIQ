from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    port = int(os.getenv("PORT", "8000"))
    reload_enabled = os.getenv("BACKEND_RELOAD", "1") == "1"
    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, reload=reload_enabled)


if __name__ == "__main__":
    main()
