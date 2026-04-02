from datetime import date

from backend.database.models import ParkingType, Policy, VehicleUse
from backend.ml import policy_to_vector

p = Policy(
    id="x",
    user_id="u",
    policy_number="P1",
    policyholder_name="Test",
    vehicle_make="Maruti",
    vehicle_model="Swift",
    vehicle_year=2020,
    engine_cc=1200,
    seating_capacity=5,
    vehicle_use=VehicleUse.personal,
    insured_value=650000.0,
    premium_amount=18000.0,
    prior_claims_count=1,
    prior_claim_amount=0.0,
    anti_theft_device=False,
    parking_type=ParkingType.garage,
    city="Mumbai",
    annual_mileage_km=12000,
    ncb_percentage=20.0,
    policy_start_date=date.today(),
    policy_duration_months=12,
)

v = policy_to_vector(p)
print("Feature vector shape:", v.shape)
