import os
import random
import uuid
from datetime import date, datetime, timedelta
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_db_url = os.environ.get("DATABASE_URL", f"sqlite:///{Path(__file__).resolve().parents[1] / 'insureiq.db'}")
os.environ["DATABASE_URL"] = _db_url

from backend.auth.password import hash_password
from backend.database.db import SessionLocal, init_db
from backend.database.models import (
    ParkingType,
    Policy,
    Report,
    ReportType,
    RiskBandEnum,
    RiskPrediction,
    User,
    VehicleUse,
)


MAKES_MODELS = {
    "Toyota": {"Camry": 1800, "Corolla": 1500, "RAV4": 2000, "Fortuner": 2500, "Innova": 2500},
    "Honda": {"Civic": 1500, "Accord": 2000, "CR-V": 2000, "City": 1500, "Amaze": 1200},
    "Maruti Suzuki": {"Swift": 1200, "Baleno": 1200, "WagonR": 1000, "Ertiga": 1500, "Dzire": 1200, "Brezza": 1500, "Eeco": 1200},
    "Hyundai": {"Creta": 1600, "Venue": 1200, "i20": 1200, "Verna": 1600, "Santro": 1100, "Grand i10": 1200},
    "Kia": {"Seltos": 1600, "Sonet": 1200, "Carnival": 2500},
    "Tata": {"Nexon": 1200, "Harrier": 2000, "Safari": 2000, "Punch": 1200, "Altroz": 1200, "Tiago": 1200},
    "Mahindra": {"Scorpio": 2200, "XUV500": 2200, "XUV300": 1200, "Thar": 2000, "Bolero": 2500},
    "Skoda": {"Octavia": 2000, "Superb": 2000, "Kushaq": 1500},
    "Volkswagen": {"Polo": 1200, "Vento": 1600, "Taigun": 1500},
    "Ford": {"EcoSport": 1500, "Figo": 1200, "Endeavour": 2500},
    "Renault": {"Kwid": 1000, "Duster": 1500, "Triber": 1200},
    "Nissan": {"Magnite": 1000, "Kicks": 1500},
    "Jeep": {"Compass": 2000, "Grand Cherokee": 3000},
}

CITIES = {
    "Mumbai": ("metro", 18_000),
    "Delhi": ("metro", 16_000),
    "Bengaluru": ("metro", 17_500),
    "Chennai": ("metro", 16_500),
    "Hyderabad": ("tier1", 15_000),
    "Pune": ("tier1", 14_000),
    "Kolkata": ("tier1", 14_500),
    "Ahmedabad": ("tier2", 12_000),
    "Jaipur": ("tier2", 11_000),
    "Lucknow": ("tier2", 11_500),
    "Chandigarh": ("tier2", 10_500),
    "Kochi": ("tier3", 9_500),
    "Indore": ("tier3", 10_000),
    "Nagpur": ("tier3", 9_000),
    "Bhopal": ("tier3", 8_500),
    "Patna": ("tier3", 7_500),
    "Ranchi": ("tier3", 7_000),
    "Guwahati": ("tier3", 8_000),
    "Srinagar": ("tier3", 7_500),
    "Mysore": ("tier3", 8_500),
}

FIRST_NAMES = [
    "Aarav", "Aditi", "Arjun", "Ananya", "Arnav", "Avni", "Aditya", "Aisha",
    "Rohan", "Riya", "Rahul", "Rashmi", "Rajesh", "Ritu", "Raj", "Riya",
    "Vikram", "Vivaan", "Vanya", "Vihaan", "Vishal", "Vijay", "Vijaya",
    "Sanjay", "Sneha", "Siddharth", "Sahil", "Sakshi", "Samir", "Sara",
    "Karan", "Kavya", "Kishore", "Kirti", "Kamal", "Kiran", "Kriti",
    "Nikhil", "Nikita", "Naveen", "Neha", "Naresh", "Nisha", "Nitin",
    "Anil", "Anita", "Ashok", "Asha", "Amit", "Amita", "Ajay", "Alka",
    "Bharat", "Bhavna", "Bhavesh", "Bina", "Brijesh", "Bandana",
    "Chetan", "Chhavi", "Chandra", "Chhaya", "Chirag", "Chitra",
    "Deepak", "Divya", "Dinesh", "Disha", "Dhanraj", "Deepti",
    "Gaurav", "Gita", "Gopal", "Gunjan", "Girish", "Geeta",
    "Harish", "Hema", "Hemant", "Harsh", "Heena", "Himani",
    "Ishaan", "Ishita", "Irfan", "Indira", "Ilesh", "Ira",
    "Jatin", "Jaya", "Jitesh", "Jasleen", "Jitendra", "Juhi",
    "Kunal", "Kusum", "Kishan", "Kavita", "Kapil", "Kamala",
    "Lakshmi", "Lalit", "Lavanya", "Lokesh", "Lalita", "Lakshay",
    "Manish", "Meera", "Mohan", "Mona", "Mukesh", "Manju",
    "Nitesh", "Nidhi", "Nawab", "Navita", "Nakul", "Nanda",
    "Ojas", "Omi", "Olivia", "Omkar", "Oshin",
    "Parth", "Priya", "Pankaj", "Pooja", "Pradeep", "Prerna",
    "Quadir", "Qureshi",
    "Ravi", "Riya", "Rakesh", "Rashika", "Ramesh", "Ranjana",
    "Sanjay", "Sunita", "Suresh", "Sakina", "Sanjay", "Srishti",
    "Tarun", "Tina", "Tushar", "Tanuja", "Tilak", "Tara",
    "Uday", "Uma", "Ujjwal", "Ujwala", "Utkarsh", "Urvashi",
    "Vikram", "Vani", "Vijay", "Vasudha", "Virat", "Vidya",
    "Waseem", "Wajid", "Waheeda",
    "Xerxes",
    "Yash", "Yami", "Yogesh", "Yashika", "Yashwant", "Yojana",
    "Zahir", "Zara", "Zulfiqar", "Zeenat", "Zahra", "Zakir",
]

LAST_NAMES = [
    "Patel", "Sharma", "Singh", "Gupta", "Kumar", "Johansson",
    "Reddy", "Nair", "Iyer", "Menon", "Rao", "Krishnan",
    "Shah", "Mehta", "Desai", "Pandit", "Chakraborty", "Banerjee",
    "Mukherjee", "Dutta", "Biswas", "Sarkar", "Sen", "Roy",
    "Verma", "Agarwal", "Jain", "Khanna", "Garg", "Bhatia",
    "Chopra", "Kapoor", "Sood", "Khatri", "Malhotra", "Sarin",
    "Thakur", "Yadav", "Chauhan", "Rana", "Solanki", "Parmar",
    "Naik", "Fernandes", "D'Costa", "D'Souza", "Mascarenhas",
    "Amin", "Dave", "Shroff", "Bhimji", "Jhaveri", "Patel",
    "Kulkarni", "Joshi", "Pai", "Shenoy", "Udupi", "Bhat",
    "Mahajan", "Sachdeva", "Anand", "Sinha", "Tiwari", "Dubey",
    "Mishra", "Prasad", "Choudhary", "Mahto", "Thakur",
]

INDIAN_CITIES_REPRESENTATIVE = list(CITIES.keys())


def weighted_choice(choices: list, weights: list) -> any:
    return random.choices(choices, weights=weights, k=1)[0]


def generate_policy_number() -> str:
    return f"POL-{random.randint(100000, 999999)}"


def generate_name() -> tuple[str, str]:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    return first, last


def city_tier(city: str) -> float:
    tier_map = {"metro": 1.0, "tier1": 0.65, "tier2": 0.4, "tier3": 0.25}
    return tier_map.get(CITIES.get(city, ("tier3", 0))[0], 0.25)


def compute_risk_score(policy_data: dict, city_risk: float) -> tuple[float, int, str]:
    base = 30.0

    vehicle_age = 2026 - policy_data["vehicle_year"]
    if vehicle_age > 10:
        base += 20
    elif vehicle_age > 7:
        base += 12
    elif vehicle_age > 5:
        base += 6
    elif vehicle_age > 3:
        base += 2

    if policy_data["prior_claims_count"] >= 3:
        base += 25
    elif policy_data["prior_claims_count"] == 2:
        base += 15
    elif policy_data["prior_claims_count"] == 1:
        base += 7

    if policy_data["vehicle_use"] == VehicleUse.rideshare:
        base += 12
    elif policy_data["vehicle_use"] == VehicleUse.commercial:
        base += 6

    if policy_data["parking_type"] == ParkingType.street:
        base += 10
    elif policy_data["parking_type"] == ParkingType.covered:
        base += 3

    if not policy_data["anti_theft_device"]:
        base += 5

    base += city_risk * 10

    engine_cc = policy_data["engine_cc"]
    if engine_cc > 2500:
        base += 6
    elif engine_cc > 2000:
        base += 3

    mileage = policy_data["annual_mileage_km"]
    if mileage > 20000:
        base += 5
    elif mileage > 15000:
        base += 2

    ncb = policy_data["ncb_percentage"]
    if ncb >= 50:
        base -= 8
    elif ncb >= 35:
        base -= 5
    elif ncb >= 20:
        base -= 2

    final_score = max(1, min(100, int(round(base))))
    prob = final_score / 100.0 * 0.65

    if final_score <= 30:
        band = RiskBandEnum.LOW
    elif final_score <= 60:
        band = RiskBandEnum.MEDIUM
    elif final_score <= 80:
        band = RiskBandEnum.HIGH
    else:
        band = RiskBandEnum.CRITICAL

    return prob, final_score, band


def generate_shap_features(policy_data: dict, city_risk: float) -> list[dict]:
    vehicle_age = 2026 - policy_data["vehicle_year"]
    features: list[dict] = []

    if policy_data["prior_claims_count"] > 0:
        features.append({
            "feature_name": "prior_claims_binary",
            "plain_name": "Prior Claim History",
            "shap_value": round(random.uniform(0.06, 0.15), 4),
            "feature_value": policy_data["prior_claims_count"],
            "direction": "increases_risk",
        })

    if vehicle_age > 7:
        features.append({
            "feature_name": "vehicle_age_years",
            "plain_name": "Vehicle Age",
            "shap_value": round(random.uniform(0.04, 0.12), 4),
            "feature_value": vehicle_age,
            "direction": "increases_risk",
        })

    if policy_data["parking_type"] == ParkingType.street:
        features.append({
            "feature_name": "parking_risk",
            "plain_name": "Street Parking",
            "shap_value": round(random.uniform(0.03, 0.09), 4),
            "feature_value": "street",
            "direction": "increases_risk",
        })

    if city_risk > 0.7:
        features.append({
            "feature_name": "city_tier",
            "plain_name": f"City Risk ({policy_data['city']})",
            "shap_value": round(random.uniform(0.02, 0.08), 4),
            "feature_value": policy_data["city"],
            "direction": "increases_risk",
        })

    if policy_data["ncb_percentage"] >= 50:
        features.append({
            "feature_name": "ncb_discount",
            "plain_name": "High NCB (50%+)",
            "shap_value": round(random.uniform(-0.06, -0.12), 4),
            "feature_value": policy_data["ncb_percentage"],
            "direction": "decreases_risk",
        })

    if policy_data["anti_theft_device"]:
        features.append({
            "feature_name": "anti_theft",
            "plain_name": "Anti-Theft Device Fitted",
            "shap_value": round(random.uniform(-0.03, -0.08), 4),
            "feature_value": True,
            "direction": "decreases_risk",
        })

    if policy_data["vehicle_use"] == VehicleUse.rideshare:
        features.append({
            "feature_name": "is_rideshare",
            "plain_name": "Rideshare Use",
            "shap_value": round(random.uniform(0.04, 0.10), 4),
            "feature_value": "rideshare",
            "direction": "increases_risk",
        })

    if policy_data["engine_cc"] > 2000:
        features.append({
            "feature_name": "engine_cc_normalised",
            "plain_name": "High Engine Capacity",
            "shap_value": round(random.uniform(0.01, 0.05), 4),
            "feature_value": policy_data["engine_cc"],
            "direction": "increases_risk",
        })

    features.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
    return features[:5]


EXPLANATIONS = {
    RiskBandEnum.LOW: [
        "Clean driving history with no prior claims. The policyholder demonstrates low-risk behaviour.",
        "Vehicle fitted with anti-theft device and parked in secure garage. Minimal external risk factors.",
        "Strong No Claim Bonus (NCB) record over multiple years. Consistently safe driving profile.",
        "Vehicle age within optimal range with regular servicing. Technical condition assessed as low risk.",
    ],
    RiskBandEnum.MEDIUM: [
        "Moderate risk profile with some prior incidents. Recommend continued monitoring.",
        "Vehicle used for daily commute in urban traffic. Standard risk for metropolitan area.",
        "Some prior claim history but managed responsibly. Premium loading may apply.",
        "Vehicle parked on street in a high-traffic area. Consider covered parking to reduce premium.",
    ],
    RiskBandEnum.HIGH: [
        "Multiple prior claims on record. Insurer may apply loading or require inspection.",
        "Vehicle used for commercial or rideshare purposes significantly increases risk exposure.",
        "Old vehicle with high mileage. Depreciation and reliability concerns elevate risk.",
        "Parking in high-theft zone. Urban crime statistics elevate assessed risk.",
    ],
    RiskBandEnum.CRITICAL: [
        "Very high claim frequency. Recommend referral to underwriting for special consideration.",
        "Multiple severe prior claims. Insurer may decline coverage or apply significant loading.",
        "High-risk usage pattern combined with adverse parking situation. Referral required.",
        "Vehicle in high-theft metropolitan zone with prior fraud indicators. Manual review needed.",
    ],
}


def seed_db():
    init_db()
    db = SessionLocal()

    # Clean up any stale demo user with old .local email
    old_demo = db.query(User).filter(User.email == "demo@insureiq.local").first()
    if old_demo:
        db.query(RiskPrediction).filter(RiskPrediction.user_id == old_demo.id).delete()
        db.query(Policy).filter(Policy.user_id == old_demo.id).delete()
        db.delete(old_demo)
        db.commit()

    user = db.query(User).filter(User.email == "demo@insureiq.com").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="demo@insureiq.com",
            full_name="Demo User",
            hashed_password=hash_password("demo1234"),
            is_active=True,
            created_at=datetime.utcnow(),
            last_login=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created demo user: demo@insureiq.com / demo1234")
    else:
        existing_count = db.query(Policy).filter(Policy.user_id == user.id, Policy.is_active.is_(True)).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} active policies for demo user. Skipping seed.")
            db.close()
            return
        print(f"Using existing user: {user.email}")

    print("Generating 300 realistic Indian vehicle insurance policies...")

    policies = []
    batch_size = 50

    for i in range(300):
        make = random.choice(list(MAKES_MODELS.keys()))
        model_dict = MAKES_MODELS[make]
        model = random.choice(list(model_dict.keys()))
        engine_cc = model_dict[model]

        first, last = generate_name()
        full_name = f"{first} {last}"

        vehicle_year = random.choices(
            [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
            weights=[3, 5, 8, 10, 15, 18, 16, 12, 8, 5],
        )[0]

        vehicle_age = 2026 - vehicle_year
        seating_capacity = random.choices([2, 4, 5, 5, 5, 7], weights=[2, 5, 30, 35, 20, 8])[0]

        vehicle_use = weighted_choice(
            [VehicleUse.personal, VehicleUse.personal, VehicleUse.personal, VehicleUse.commercial, VehicleUse.rideshare],
            [50, 30, 10, 7, 3],
        )

        idv_base = engine_cc * random.uniform(85, 115)
        if vehicle_use == VehicleUse.commercial:
            idv_base *= 1.2
        elif vehicle_use == VehicleUse.rideshare:
            idv_base *= 1.15
        idv_base *= (2026 - vehicle_year) * 0.05 + 0.8
        idv_base = max(150_000, min(5_000_000, idv_base))

        city = random.choice(INDIAN_CITIES_REPRESENTATIVE)
        tier, _ = CITIES[city]

        premium_base = idv_base * random.uniform(0.025, 0.055)
        if vehicle_use == VehicleUse.commercial:
            premium_base *= 1.15
        elif vehicle_use == VehicleUse.rideshare:
            premium_base *= 1.10
        premium_base *= random.uniform(0.9, 1.1)

        prior_claims = weighted_choice([0, 0, 0, 1, 1, 2, 3], [40, 25, 15, 10, 5, 3, 2])
        prior_amount = 0.0
        if prior_claims > 0:
            prior_amount = float(prior_claims * random.randint(15000, 80000))

        ncb = weighted_choice([0, 20, 25, 35, 50], [20, 20, 25, 20, 15])

        parking = random.choices(
            [ParkingType.garage, ParkingType.covered, ParkingType.street],
            weights=[30, 35, 35],
        )[0]

        anti_theft = random.choices([True, False], weights=[45, 55])[0]

        annual_km = int(random.lognormvariate(9.8, 0.5))

        start_offset_days = random.randint(0, 730)
        policy_start = date.today() - timedelta(days=start_offset_days)
        pol_duration = random.choice([12, 12, 24, 36])
        pol_duration_days = pol_duration * 30

        policy_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "policy_number": generate_policy_number(),
            "policyholder_name": full_name,
            "vehicle_make": make,
            "vehicle_model": model,
            "vehicle_year": vehicle_year,
            "engine_cc": engine_cc,
            "seating_capacity": seating_capacity,
            "vehicle_use": vehicle_use,
            "insured_value": round(idv_base, -3),
            "premium_amount": round(premium_base, -3),
            "prior_claims_count": prior_claims,
            "prior_claim_amount": round(prior_amount, -3),
            "anti_theft_device": anti_theft,
            "parking_type": parking,
            "city": city,
            "annual_mileage_km": annual_km,
            "ncb_percentage": float(ncb),
            "policy_start_date": policy_start,
            "policy_end_date": policy_start + timedelta(days=pol_duration_days),
            "policy_duration_months": pol_duration,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        city_risk = city_tier(city)
        prob, score, band = compute_risk_score(policy_dict, city_risk)
        shap_features = generate_shap_features(policy_dict, city_risk)
        explanation = random.choice(EXPLANATIONS[band])

        prediction = RiskPrediction(
            id=str(uuid.uuid4()),
            policy_id=policy_dict["id"],
            user_id=user.id,
            claim_probability=round(prob, 6),
            risk_score=score,
            risk_band=band,
            shap_features=shap_features,
            llm_explanation=explanation,
            model_version="xgb_v1_seed",
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
        )

        policy = Policy(**policy_dict)
        db.add(policy)
        db.add(prediction)

        if (i + 1) % batch_size == 0:
            db.commit()
            print(f"  Inserted {i + 1}/300 policies...")

    db.commit()
    db.close()

    print()
    print("=" * 50)
    print("Seed complete! 300 policies created:")
    print()
    print("  Login:  demo@insureiq.local")
    print("  Pass:   demo1234")
    print()
    print("  Risk band distribution (approximate):")
    print("  - LOW:      ~30%")
    print("  - MEDIUM:   ~40%")
    print("  - HIGH:     ~20%")
    print("  - CRITICAL: ~10%")
    print("=" * 50)


if __name__ == "__main__":
    seed_db()
