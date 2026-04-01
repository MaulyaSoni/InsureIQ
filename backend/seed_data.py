import uuid
import random
from datetime import datetime
from app.database import SessionLocal
from app.models import Policy

def seed_db():
    db = SessionLocal()
    
    # Check if there are already policies to avoid duplicating endlessly
    if db.query(Policy).count() > 0:
        print("Database already has policies. Skipping seed.")
        return

    makes_models = {
        "Toyota": ["Camry", "Corolla", "RAV4"],
        "Honda": ["Civic", "Accord", "CR-V"],
        "Ford": ["F-150", "Mustang", "Explorer"],
        "Tesla": ["Model 3", "Model Y"],
        "Maruti Suzuki": ["Swift", "Baleno", "WagonR"],
        "Hyundai": ["Creta", "Venue", "i20"]
    }

    names = ["John Doe", "Jane Smith", "Robert Johnson", "Emily Davis", "Aarav Patel", "Priya Sharma", "Rohan Gupta", "Sofia Garcia"]

    policies = []
    for _ in range(15):
        make = random.choice(list(makes_models.keys()))
        model = random.choice(makes_models[make])
        usage = random.choice(["personal", "personal", "personal", "commercial"]) # More biased to personal
        
        policy = Policy(
            id=str(uuid.uuid4()),
            policy_number=f"POL-{random.randint(100000, 999999)}",
            holder_name=random.choice(names),
            vehicle_type="Four Wheeler",
            vehicle_make=make,
            vehicle_model=model,
            production_year=random.randint(2015, 2024),
            engine_cc=random.choice([1000, 1200, 1500, 2000, 2500]),
            seats=random.choice([4, 5, 5, 7]),
            insured_value=random.randint(300000, 2500000), # 3 Lakhs to 25 Lakhs
            premium_amount=random.randint(10000, 50000),
            usage_type=usage,
            prior_claims=random.choice([0, 0, 0, 1, 1, 2, 3]), # Biased towards fewer claims
            region=random.choice(["North", "South", "East", "West"]),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        policies.append(policy)

    db.bulk_save_objects(policies)
    db.commit()
    db.close()
    
    print(f"Successfully added 15 dummy policies to the database!")

if __name__ == "__main__":
    seed_db()
