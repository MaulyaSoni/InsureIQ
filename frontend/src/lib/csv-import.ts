import type { Policy, VehicleType, UsageType } from "@/types/insurance";

const VALID_VEHICLE_TYPES: VehicleType[] = ["sedan", "suv", "hatchback", "truck", "two_wheeler", "commercial"];
const VALID_USAGE_TYPES: UsageType[] = ["personal", "commercial", "taxi", "fleet"];

interface CSVParseResult {
  policies: Omit<Policy, "id" | "created_at" | "updated_at">[];
  errors: string[];
}

export function parseCSV(text: string): CSVParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { policies: [], errors: ["CSV must have a header row and at least one data row"] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[()₹]/g, ""));
  const policies: CSVParseResult["policies"] = [];
  const errors: string[] = [];

  const findCol = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));
  const cols = {
    holder_name: findCol(["holder_name", "holder", "name", "policyholder"]),
    vehicle_type: findCol(["vehicle_type", "veh_type", "type"]),
    vehicle_make: findCol(["vehicle_make", "make", "brand"]),
    vehicle_model: findCol(["vehicle_model", "model"]),
    production_year: findCol(["production_year", "year", "mfg_year"]),
    engine_cc: findCol(["engine_cc", "engine", "cc"]),
    seats: findCol(["seats", "seating"]),
    insured_value: findCol(["insured_value", "insured", "sum_insured"]),
    premium_amount: findCol(["premium_amount", "premium"]),
    usage_type: findCol(["usage_type", "usage"]),
    prior_claims: findCol(["prior_claims", "claims"]),
    region: findCol(["region", "state", "location"]),
    policy_number: findCol(["policy_number", "policy_no", "policy_id"]),
  };

  const required = ["holder_name", "vehicle_type", "vehicle_make", "vehicle_model", "insured_value", "premium_amount"] as const;
  for (const r of required) {
    if (cols[r] === -1) errors.push(`Missing required column: ${r}`);
  }
  if (errors.length > 0) return { policies: [], errors };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(",").map((v) => v.trim());
    const row = i + 1;

    const get = (col: number) => (col >= 0 && col < values.length ? values[col] : "");
    const vehicleType = get(cols.vehicle_type).toLowerCase().replace(/\s+/g, "_") as VehicleType;
    const usageType = (get(cols.usage_type) || "personal").toLowerCase() as UsageType;

    if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
      errors.push(`Row ${row}: Invalid vehicle_type "${get(cols.vehicle_type)}"`);
      continue;
    }
    if (!VALID_USAGE_TYPES.includes(usageType)) {
      errors.push(`Row ${row}: Invalid usage_type "${get(cols.usage_type)}"`);
      continue;
    }

    const insuredValue = Number(get(cols.insured_value));
    const premiumAmount = Number(get(cols.premium_amount));
    if (isNaN(insuredValue) || isNaN(premiumAmount)) {
      errors.push(`Row ${row}: Invalid numeric value for insured_value or premium_amount`);
      continue;
    }

    policies.push({
      policy_number: get(cols.policy_number) || `INS-${Date.now().toString().slice(-6)}-${i}`,
      holder_name: get(cols.holder_name),
      vehicle_type: vehicleType,
      vehicle_make: get(cols.vehicle_make),
      vehicle_model: get(cols.vehicle_model),
      production_year: Number(get(cols.production_year)) || 2023,
      engine_cc: Number(get(cols.engine_cc)) || 1200,
      seats: Number(get(cols.seats)) || 5,
      insured_value: insuredValue,
      premium_amount: premiumAmount,
      usage_type: usageType,
      prior_claims: Number(get(cols.prior_claims)) || 0,
      region: get(cols.region) || "Unknown",
    });
  }

  return { policies, errors };
}

export function generateSampleCSV(): string {
  return `holder_name,vehicle_type,vehicle_make,vehicle_model,production_year,engine_cc,seats,insured_value,premium_amount,usage_type,prior_claims,region
Rahul Verma,sedan,Honda,City,2022,1498,5,1100000,15000,personal,0,Maharashtra
Deepa Nair,suv,Kia,Seltos,2023,1493,5,1400000,20000,personal,1,Kerala
Suresh Gupta,truck,Ashok Leyland,Dost,2020,2953,3,800000,28000,commercial,2,Gujarat`;
}
