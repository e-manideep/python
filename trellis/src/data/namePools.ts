import type { CityId, VendorCategory, WorkOrderCategory } from "../types";

export type Tier = "premium" | "mid" | "emerging";

export interface Locality {
  name: string;
  cityId: CityId;
  tier: Tier;
}

export const CITIES = [
  { id: "blr" as CityId, name: "Bengaluru", state: "Karnataka" },
  { id: "pun" as CityId, name: "Pune", state: "Maharashtra" },
];

export const LOCALITIES: Locality[] = [
  { name: "Indiranagar", cityId: "blr", tier: "premium" },
  { name: "HSR Layout", cityId: "blr", tier: "premium" },
  { name: "Koramangala", cityId: "blr", tier: "premium" },
  { name: "Whitefield", cityId: "blr", tier: "mid" },
  { name: "Sarjapur Road", cityId: "blr", tier: "mid" },
  { name: "Hebbal", cityId: "blr", tier: "mid" },
  { name: "Electronic City", cityId: "blr", tier: "emerging" },
  { name: "Bannerghatta Road", cityId: "blr", tier: "emerging" },
  { name: "Yelahanka", cityId: "blr", tier: "emerging" },
  { name: "Koregaon Park", cityId: "pun", tier: "premium" },
  { name: "Baner", cityId: "pun", tier: "premium" },
  { name: "Kharadi", cityId: "pun", tier: "mid" },
  { name: "Viman Nagar", cityId: "pun", tier: "mid" },
  { name: "Wakad", cityId: "pun", tier: "mid" },
  { name: "Hinjewadi", cityId: "pun", tier: "emerging" },
  { name: "Kothrud", cityId: "pun", tier: "emerging" },
];

// Base rent (INR per sqft per month) and capital value (INR per sqft) by tier.
export const TIER_RENT_PSF: Record<Tier, [number, number]> = {
  premium: [34, 44],
  mid: [24, 32],
  emerging: [17, 23],
};
export const TIER_CAPITAL_PSF: Record<Tier, [number, number]> = {
  premium: [11500, 15000],
  mid: [8200, 10800],
  emerging: [6000, 7800],
};

export const DEVELOPERS = [
  "Silverleaf Habitats",
  "Northgate Infra",
  "Vantage Realty",
  "Terraform Estates",
  "Aurelia Constructions",
  "Sundew Developers",
  "Fernhill Builders",
  "Amberwood Projects",
  "Cedarcourt Developers",
  "Meridian Habitats",
  "Willowbrook Realty",
  "Oakridge Infraprojects",
];

const PROPERTY_PREFIX = [
  "Silverleaf",
  "Northgate",
  "Vantage",
  "Terraform",
  "Aurelia",
  "Sundew",
  "Fernhill",
  "Amberwood",
  "Cedarcourt",
  "Meridian",
  "Willowbrook",
  "Oakridge",
  "Lakeshore",
  "Ivory",
  "Palmgrove",
  "Rosewood",
  "Maple",
  "Cloverdale",
];
const PROPERTY_SUFFIX = [
  "Residency",
  "Meadows",
  "Enclave",
  "Heights",
  "Gardens",
  "County",
  "Grove",
  "Greens",
  "Courtyard",
  "Vista",
  "Orchard",
  "Terraces",
];

export function makePropertyName(rng: { pick: <T>(a: readonly T[]) => T }, usedNames: Set<string>): string {
  let name = "";
  let guard = 0;
  do {
    name = `${rng.pick(PROPERTY_PREFIX)} ${rng.pick(PROPERTY_SUFFIX)}`;
    guard++;
  } while (usedNames.has(name) && guard < 50);
  usedNames.add(name);
  return name;
}

export const INDIVIDUAL_OWNER_NAMES = [
  "Ramesh Iyer",
  "Sunita Deshpande",
  "Arjun Nair",
  "Kavita Rao",
  "Vikram Malhotra",
  "Deepa Kulkarni",
  "Manoj Pillai",
  "Anita Bhatt",
  "Suresh Menon",
  "Lakshmi Narayanan",
];

export const NRI_OWNER_NAMES = [
  "Rohit Sharma (Dubai, UAE)",
  "Priya Venkatesh (San Jose, USA)",
  "Anil Kapoor (London, UK)",
  "Meera Krishnan (Singapore)",
  "Sanjay Gupta (Toronto, Canada)",
  "Divya Reddy (Sydney, Australia)",
];

export const FUND_OWNER_NAMES = [
  "Southbridge Realty Partners",
  "Ashoka Yield Fund II",
  "Meridian Capital Real Estate Trust",
  "Bluepeak Institutional Housing Fund",
];

export const RESIDENT_FIRST_NAMES = [
  "Aditya", "Priya", "Rahul", "Sneha", "Karthik", "Ananya", "Vishal", "Neha",
  "Arjun", "Divya", "Rohan", "Pooja", "Siddharth", "Kavya", "Nikhil", "Shreya",
  "Amit", "Ritu", "Varun", "Meghana", "Sandeep", "Anjali", "Gaurav", "Nisha",
  "Praveen", "Swathi", "Manish", "Deepika", "Ashwin", "Lakshmi",
];
export const RESIDENT_LAST_NAMES = [
  "Sharma", "Rao", "Nair", "Iyer", "Reddy", "Gupta", "Menon", "Kulkarni",
  "Patel", "Deshpande", "Krishnan", "Bhat", "Pillai", "Verma", "Joshi", "Shetty",
];

export const VENDOR_NAME_BY_CATEGORY: Record<VendorCategory, string[]> = {
  Plumbing: ["AquaFix Services", "BlueDrop Plumbing Co.", "RapidFlow Plumbers"],
  Electrical: ["Volt Line Electricals", "BrightWire Electrical Works", "AmpCircuit Services"],
  HVAC: ["CoolAir HVAC Solutions", "ThermoZone Climate Systems"],
  "Lift/Elevator": ["SkyLift Elevator Services", "VertiMove Elevator Co."],
  Painting: ["ColorCraft Painters", "PrimeCoat Painting Services"],
  "Pest Control": ["SafeGuard Pest Solutions", "ShieldTech Pest Control"],
  "Civil/Structural": ["BuildRight Civil Contractors", "StoneArch Structural Works"],
  Housekeeping: ["SparkleClean FM Services", "PristinePlus Housekeeping"],
  "Security Systems": ["SecureNet Systems", "GuardianEye Security Solutions"],
  Landscaping: ["GreenScape Gardens", "EverGreen Landscaping Co."],
};

export const WORK_ORDER_TEMPLATES: Record<WorkOrderCategory, string[]> = {
  Plumbing: ["Leaking pipe under kitchen sink", "Bathroom fitting replacement", "Low water pressure on upper floors", "Overflow tank valve repair"],
  Electrical: ["MCB tripping repeatedly", "Common area lighting failure", "Faulty wiring in balcony socket", "Inverter/DG changeover issue"],
  HVAC: ["Split AC not cooling", "AC gas refill required", "Central lobby AC unit servicing", "Compressor noise complaint"],
  "Lift/Elevator": ["Lift stuck between floors", "Lift door sensor malfunction", "Scheduled elevator AMC service", "Unusual lift vibration"],
  Painting: ["Wall seepage and paint peeling", "Common corridor repainting", "Exterior facade touch-up", "Ceiling damp patch"],
  "Pest Control": ["Cockroach infestation in basement", "Termite inspection request", "Mosquito fogging - common areas", "Rodent sighting in parking"],
  "Civil/Structural": ["Crack in compound wall", "Parking floor tile damage", "Clubhouse roof leakage", "Compound gate hinge repair"],
  Housekeeping: ["Deep cleaning - clubhouse", "Garbage chute blockage", "Common toilet sanitation", "Terrace cleaning request"],
  "Security Systems": ["CCTV camera offline - Block C", "Boom barrier malfunction", "Intercom system fault", "Access card reader not working"],
  Landscaping: ["Garden irrigation line repair", "Tree trimming near Block A", "Lawn re-turfing", "Playground equipment maintenance"],
};

export const AMENITY_POOL = [
  "Clubhouse", "Swimming Pool", "Gymnasium", "Children's Play Area", "Multipurpose Hall",
  "Landscaped Gardens", "Jogging Track", "Indoor Games Room", "24x7 Security", "Power Backup",
  "Covered Parking", "EV Charging Points", "Rainwater Harvesting", "Solar Water Heating",
];
