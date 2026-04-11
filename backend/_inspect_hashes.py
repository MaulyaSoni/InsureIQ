import sys

sys.path.insert(0, "d:/InsureIQ")

from backend.database.db import SessionLocal
from backend.database.models import User


def main() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).all()
        lines = []
        for u in users:
            hp = u.hashed_password or ""
            prefix = hp[:12]
            lines.append(f"{u.email}\tlen={len(hp)}\tprefix={prefix}")
        with open("d:/InsureIQ/backend/_inspect_hashes_out_utf8.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
    finally:
        db.close()


if __name__ == "__main__":
    main()
