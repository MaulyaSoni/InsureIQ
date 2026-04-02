import random
import uuid
from datetime import date, datetime

from backend.auth.password import hash_password
from backend.database.db import SessionLocal
from backend.database.models import ParkingType, Policy, User, VehicleUse


def seed_db():
    db = SessionLocal()

    user = db.query(User).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="demo@insureiq.local",
            full_name="Demo User",
            hashed_password=hash_password("demo1234"),
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if db.query(Policy).filter(Policy.user_id == user.id).count() > 0:
        print("Database already has policies for demo user. Skipping seed.")
        db.close()
        return

    makes_models = {
        "Toyota": ["Camry", "Corolla", "RAV4"],
        "Honda": ["Civic", "Accord", "CR-V"],
        "Maruti Suzuki": ["Swift", "Baleno", "WagonR"],
        "Hyundai": ["Creta", "Venue", "i20"],
    }

    names = ["Aarav Patel", "Priya Sharma", "John Doe"]

    policies = []
    for _ in range(15):
        make = random.choice(list(makes_models.keys()))
        model = random.choice(makes_models[make])
        usage = random.choice([VehicleUse.personal, VehicleUse.personal, VehicleUse.commercial])
        policies.append(
            Policy(
                id=str(uuid.uuid4()),
                user_id=user.id,
                policy_number=f"POL-{random.randint(100000, 999999)}",
                policyholder_name=random.choice(names),
                vehicle_make=make,
                vehicle_model=model,
                vehicle_year=random.randint(2015, 2024),
                engine_cc=random.choice([1000, 1200, 1500, 2000, 2500]),
                seating_capacity=random.choice([4, 5, 5, 7]),
                vehicle_use=usage,
                insured_value=float(random.randint(300_000, 2_500_000)),
                premium_amount=float(random.randint(10000, 50000)),
                prior_claims_count=random.choice([0, 0, 0, 1, 1, 2]),
                prior_claim_amount=0.0,
                anti_theft_device=random.choice([True, False]),
                parking_type=random.choice([ParkingType.garage, ParkingType.street, ParkingType.covered]),
                city=random.choice(["Mumbai", "Delhi", "Bengaluru", "Chennai"]),
                annual_mileage_km=random.randint(5000, 25000),
                ncb_percentage=float(random.choice([0, 20, 25, 35, 50])),
                policy_start_date=date(2026, 1, 1),
                policy_duration_months=12,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )

    db.add_all(policies)
    db.commit()
    db.close()
    print("Successfully added 15 demo policies (demo@insureiq.local / demo1234).")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    seed_db()
