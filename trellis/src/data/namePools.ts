import type { CityId, VendorCategory, WorkOrderCategory } from "../types";

export type Tier = "premium" | "mid" | "emerging";

export interface Locality {
  name: string;
  cityId: CityId;
  tier: Tier;
}

// Hyderabad + Secunderabad — the historic twin city, both part of the Hyderabad
// metropolitan area (Telangana). Kept as two "cities" so the portfolio's city-breakdown
// views still compare two real, distinct submarkets rather than one flat pool.
export const CITIES = [
  { id: "hyd" as CityId, name: "Hyderabad", state: "Telangana" },
  { id: "sec" as CityId, name: "Secunderabad", state: "Telangana" },
];

export const LOCALITIES: Locality[] = [
  { name: "Jubilee Hills", cityId: "hyd", tier: "premium" },
  { name: "Banjara Hills", cityId: "hyd", tier: "premium" },
  { name: "Kokapet", cityId: "hyd", tier: "premium" },
  { name: "Gachibowli", cityId: "hyd", tier: "mid" },
  { name: "Financial District", cityId: "hyd", tier: "mid" },
  { name: "Kondapur", cityId: "hyd", tier: "mid" },
  { name: "Tellapur", cityId: "hyd", tier: "emerging" },
  { name: "Madhapur", cityId: "hyd", tier: "emerging" },
  { name: "Nallagandla", cityId: "hyd", tier: "emerging" },
  { name: "Trimulgherry", cityId: "sec", tier: "premium" },
  { name: "Begumpet", cityId: "sec", tier: "mid" },
  { name: "Marredpally", cityId: "sec", tier: "mid" },
  { name: "Alwal", cityId: "sec", tier: "emerging" },
  { name: "Sainikpuri", cityId: "sec", tier: "emerging" },
  { name: "ECIL", cityId: "sec", tier: "emerging" },
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
  "Reddy", "Rao", "Sharma", "Nair", "Iyer", "Gupta", "Menon", "Goud",
  "Chowdary", "Naidu", "Prasad", "Krishnan", "Verma", "Reddy", "Rao", "Shetty",
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
  "Interior Design": ["Nestcraft Interiors", "Studio Verve Design", "Casarra Interiors", "Bloomline Design Studio"],
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
