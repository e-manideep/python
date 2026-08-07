import { Rng } from "./rng";
import {
  CITIES,
  LOCALITIES,
  TIER_RENT_PSF,
  TIER_CAPITAL_PSF,
  DEVELOPERS,
  makePropertyName,
  INDIVIDUAL_OWNER_NAMES,
  NRI_OWNER_NAMES,
  FUND_OWNER_NAMES,
  RESIDENT_FIRST_NAMES,
  RESIDENT_LAST_NAMES,
  VENDOR_NAME_BY_CATEGORY,
  WORK_ORDER_TEMPLATES,
  AMENITY_POOL,
  type Locality,
} from "./namePools";
import { addMonths, daysBetween, isoDate, lastNMonths, monthIndex, monthOf } from "../lib/dates";
import type {
  City,
  CityId,
  CommunityPost,
  ComplianceItem,
  Lease,
  Owner,
  Property,
  PropertyType,
  RentPayment,
  Resident,
  Transaction,
  TrellisDataset,
  Unit,
  UnitConfig,
  Vendor,
  VendorCategory,
  WorkOrder,
  WorkOrderCategory,
} from "../types";

export const SEED = 90210;
export const HISTORY_MONTHS = 18;

const CONFIG_AREA: Record<UnitConfig, [number, number]> = {
  "1BHK": [540, 700],
  "2BHK": [950, 1260],
  "3BHK": [1360, 1780],
  "4BHK": [1900, 2450],
  Villa: [2200, 3600],
};

const APT_CONFIG_WEIGHTS: [UnitConfig, number][] = [
  ["1BHK", 15],
  ["2BHK", 45],
  ["3BHK", 30],
  ["4BHK", 10],
];

const WORK_ORDER_CATEGORY_WEIGHTS: [WorkOrderCategory, number][] = [
  ["Plumbing", 20],
  ["Electrical", 18],
  ["HVAC", 10],
  ["Housekeeping", 14],
  ["Civil/Structural", 10],
  ["Painting", 8],
  ["Pest Control", 8],
  ["Security Systems", 7],
  ["Landscaping", 5],
];

const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  Critical: 4,
  High: 24,
  Medium: 72,
  Low: 168,
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function round0(n: number) {
  return Math.round(n);
}

function reraNumber(rng: Rng, cityId: CityId, seq: number): string {
  if (cityId === "blr") {
    const dd = String(rng.int(1, 28)).padStart(2, "0");
    const mm = String(rng.int(1, 12)).padStart(2, "0");
    const yy = rng.int(15, 22);
    return `PRM/KA/RERA/1251/${300 + seq}/PR/${dd}${mm}${yy}/${rng.int(100000, 999999)}`;
  }
  return `P5210${String(20000 + seq * 37).padStart(7, "0")}`;
}

function makeComplianceItems(rng: Rng, propertyId: string, hasLift: boolean, healthFactor: number): ComplianceItem[] {
  const items: ComplianceItem[] = [];
  const kinds: ComplianceItem["type"][] = ["RERA Registration", "Fire Safety NOC", "Building Insurance", "Lease Documentation"];
  if (hasLift) kinds.push("Lift AMC");
  for (const type of kinds) {
    const riskRoll = rng.float(0, 1);
    // lower healthFactor properties are more likely to have lapsed compliance
    const expiredThreshold = (1 - healthFactor) * 0.28;
    const expiringThreshold = expiredThreshold + 0.22;
    let status: ComplianceItem["status"];
    let expiryDate: string;
    if (riskRoll < expiredThreshold) {
      status = "Expired";
      expiryDate = isoDate(-rng.int(5, 90));
    } else if (riskRoll < expiringThreshold) {
      status = "Expiring Soon";
      expiryDate = isoDate(rng.int(2, 45));
    } else {
      status = "Valid";
      expiryDate = isoDate(rng.int(60, 720));
    }
    items.push({
      id: `${propertyId}-cmp-${type.replace(/\s/g, "")}`,
      type,
      status,
      reference: `${type.slice(0, 3).toUpperCase()}-${rng.int(100000, 999999)}`,
      expiryDate,
    });
  }
  return items;
}

export function generateDataset(seed: number = SEED, now: Date = new Date()): TrellisDataset {
  const rng = new Rng(seed);
  const months = lastNMonths(HISTORY_MONTHS, now);
  const cities: City[] = CITIES;

  // ---- Owners ----
  const owners: Owner[] = [];
  INDIVIDUAL_OWNER_NAMES.forEach((name, i) =>
    owners.push({ id: `own-ind-${i}`, name, type: "Individual", baseLocation: rng.pick(["Bengaluru", "Chennai", "Mumbai", "Delhi NCR"]) })
  );
  NRI_OWNER_NAMES.forEach((name, i) => owners.push({ id: `own-nri-${i}`, name, type: "NRI", baseLocation: name.match(/\(([^)]+)\)/)?.[1] ?? "Overseas" }));
  FUND_OWNER_NAMES.forEach((name, i) => owners.push({ id: `own-fund-${i}`, name, type: "Institutional Fund", baseLocation: "Mumbai" }));
  owners.push({ id: "own-builder-0", name: "Developer-Retained Stock", type: "Builder-Retained", baseLocation: "Bengaluru" });

  // ---- Vendors (shells; stats aggregated after work orders) ----
  const vendors: Vendor[] = [];
  let vSeq = 0;
  for (const city of cities) {
    for (const [category, names] of Object.entries(VENDOR_NAME_BY_CATEGORY) as [VendorCategory, string[]][]) {
      const count = rng.bool(0.55) ? 2 : 1;
      const picked = rng.shuffle(names).slice(0, count);
      for (const name of picked) {
        vendors.push({
          id: `vnd-${vSeq++}`,
          name: `${name}${count > 1 ? ` — ${city.name}` : ""}`,
          categories: [category],
          cityId: city.id,
          contactPerson: `${rng.pick(RESIDENT_FIRST_NAMES)} ${rng.pick(RESIDENT_LAST_NAMES)}`,
          gstNumber: `${city.id === "blr" ? "29" : "27"}AAFC${rng.int(1000, 9999)}${rng.pick(["A", "B", "C"])}1Z${rng.int(1, 9)}`,
          jobsCompleted: 0,
          avgRating: 0,
          slaCompliancePct: 0,
          avgCostPerJob: 0,
          onboardedDate: isoDate(-rng.int(200, 1400)),
        });
      }
    }
  }

  // ---- Properties + Units ----
  const properties: Property[] = [];
  const units: Unit[] = [];
  const healthFactors: Record<string, number> = {};
  const usedNames = new Set<string>();

  const cityLocalities: Record<CityId, Locality[]> = {
    blr: LOCALITIES.filter((l) => l.cityId === "blr"),
    pun: LOCALITIES.filter((l) => l.cityId === "pun"),
  };

  const PROPERTY_PLAN: { cityId: CityId; count: number }[] = [
    { cityId: "blr", count: 14 },
    { cityId: "pun", count: 10 },
  ];

  let pSeq = 0;
  for (const plan of PROPERTY_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      const locality = rng.pick(cityLocalities[plan.cityId]);
      const type: PropertyType = rng.pickWeighted([
        ["Apartment Community", 74],
        ["Villa Community", 18],
        ["Independent Villa", 8],
      ]);
      const propertyId = `prop-${pSeq}`;
      pSeq++;
      // Bimodal: most assets perform strongly under professional operations; a minority
      // are genuine laggards — this is what gives the portfolio real texture and gives
      // Trellis Intelligence something concrete to flag, rather than uniform mediocrity.
      const healthFactor = rng.bool(0.72) ? clamp(rng.gaussian(0.91, 0.05), 0.78, 0.99) : clamp(rng.gaussian(0.46, 0.09), 0.3, 0.68);
      healthFactors[propertyId] = healthFactor;

      const totalUnits = type === "Apartment Community" ? rng.int(48, 180) : type === "Villa Community" ? rng.int(18, 52) : 1;
      const hasLift = type === "Apartment Community" && totalUnits > 20;
      const owner =
        type === "Apartment Community" && rng.bool(0.42)
          ? rng.pick(owners.filter((o) => o.type === "Institutional Fund"))
          : rng.bool(0.2)
            ? rng.pick(owners.filter((o) => o.type === "NRI"))
            : rng.bool(0.15)
              ? owners.find((o) => o.type === "Builder-Retained")!
              : rng.pick(owners.filter((o) => o.type === "Individual"));

      const property: Property = {
        id: propertyId,
        name: makePropertyName(rng, usedNames),
        cityId: plan.cityId,
        locality: locality.name,
        type,
        developer: rng.pick(DEVELOPERS),
        yearBuilt: rng.int(2007, 2023),
        hasLift,
        totalUnits,
        ownerId: owner.id,
        reraNumber: reraNumber(rng, plan.cityId, pSeq),
        compliance: makeComplianceItems(rng, propertyId, hasLift, healthFactor),
        amenities: rng.shuffle(AMENITY_POOL).slice(0, rng.int(5, 9)),
      };
      properties.push(property);

      const [rentLo, rentHi] = TIER_RENT_PSF[locality.tier];
      const [capLo, capHi] = TIER_CAPITAL_PSF[locality.tier];

      for (let u = 0; u < totalUnits; u++) {
        const config: UnitConfig = type === "Apartment Community" ? rng.pickWeighted(APT_CONFIG_WEIGHTS) : "Villa";
        const [areaLo, areaHi] = CONFIG_AREA[config];
        const areaSqft = rng.int(areaLo, areaHi);
        const rentPsf = rng.float(rentLo, rentHi);
        const capPsf = rng.float(capLo, capHi);
        const marketRent = round0((areaSqft * rentPsf) / 100) * 100;
        // some units are mispriced vs. market — this is what feeds the rent optimization insight
        const mispricingFactor = rng.bool(0.13) ? rng.float(0.8, 0.94) : rng.bool(0.08) ? rng.float(1.06, 1.16) : rng.float(0.96, 1.04);
        const currentRent = round0((marketRent * mispricingFactor) / 100) * 100;
        const capitalValue = round0(areaSqft * capPsf);

        const occupancyRoll = rng.float(0, 1);
        const occProb = clamp(healthFactor + rng.gaussian(0, 0.04), 0.6, 0.98);
        let status: Unit["status"];
        if (occupancyRoll < occProb - 0.02) status = "Occupied";
        else if (occupancyRoll < occProb + 0.02) status = "Notice Period";
        else status = "Vacant";

        // "Occupied since" drives the occupancy trend and is deliberately independent of the
        // current lease document's start date (which resets on each renewal). Most units in a
        // mature, professionally operated portfolio have been continuously occupied for the
        // whole trailing window; a minority reflect genuine recent turnover.
        let occupiedSinceMonth: string | null = null;
        if (status === "Occupied" || status === "Notice Period") {
          occupiedSinceMonth = rng.bool(0.8) ? months[0] : months[rng.int(0, months.length - 2)];
        }

        units.push({
          id: `${propertyId}-u${u}`,
          propertyId,
          unitNumber: type === "Apartment Community" ? `${rng.pick(["A", "B", "C", "D"])}-${rng.int(1, 24)}0${rng.int(1, 4)}` : `Villa ${u + 1}`,
          config,
          areaSqft,
          marketRent,
          currentRent,
          capitalValue,
          status,
          activeLeaseId: null,
          occupiedSinceMonth,
        });
      }
    }
  }

  // ---- Residents + Leases + Rent Payments ----
  const residents: Resident[] = [];
  const leases: Lease[] = [];
  const rentPayments: RentPayment[] = [];
  let rSeq = 0;
  let lSeq = 0;
  let payId = 0;

  for (const unit of units) {
    if (unit.status === "Vacant") continue;
    const healthFactor = healthFactors[unit.propertyId];
    const name = `${rng.pick(RESIDENT_FIRST_NAMES)} ${rng.pick(RESIDENT_LAST_NAMES)}`;
    const residentId = `res-${rSeq++}`;
    const leaseStartMonthsAgo = rng.int(1, 20);
    const startDate = isoDate(-leaseStartMonthsAgo * 30 - rng.int(0, 25));
    const endDate = isoDate(335, new Date(startDate)); // ~11-month term, standard for Indian residential leases
    const leaseId = `lease-${lSeq++}`;

    residents.push({ id: residentId, name, phone: `+91 9${rng.int(100000000, 999999999)}`, email: `${name.toLowerCase().replace(/\s/g, ".")}@mailbox.example`, unitId: unit.id, moveInDate: startDate });
    leases.push({
      id: leaseId,
      unitId: unit.id,
      residentId,
      rentAmount: unit.currentRent,
      depositAmount: unit.currentRent * rng.int(2, 3),
      startDate,
      endDate,
      status: unit.status === "Notice Period" ? "Notice Period" : "Active",
      renewedFromLeaseId: null,
    });
    unit.activeLeaseId = leaseId;

    // rent payment history follows occupiedSinceMonth (continuous tenancy through renewals),
    // not the current lease document's start date, so income lines up with the occupancy trend.
    for (const month of months) {
      if (!unit.occupiedSinceMonth || unit.occupiedSinceMonth > month) continue;
      const dueDate = `${month}-05`;
      const lateProb = clamp((1 - healthFactor) * 0.5, 0.02, 0.32);
      const roll = rng.float(0, 1);
      let status: RentPayment["status"];
      let paidDate: string | null;
      const isCurrentMonth = month === months[months.length - 1];
      if (isCurrentMonth && rng.bool(0.06)) {
        status = "Pending";
        paidDate = null;
      } else if (roll < lateProb * 0.15) {
        status = "Overdue";
        paidDate = null;
      } else if (roll < lateProb) {
        status = "Paid Late";
        paidDate = isoDate(rng.int(6, 18), new Date(dueDate));
      } else {
        status = "Paid";
        paidDate = isoDate(rng.int(-3, 4), new Date(dueDate));
      }
      rentPayments.push({ id: `pay-${payId++}`, leaseId, month, dueDate, paidDate, amount: unit.currentRent, status });
    }
  }

  // ---- Work Orders ----
  const workOrders: WorkOrder[] = [];
  let wSeq = 0;

  for (const property of properties) {
    const healthFactor = healthFactors[property.id];
    const propUnits = units.filter((u) => u.propertyId === property.id);
    const ticketCount = Math.max(6, round0(property.totalUnits * 0.32 * (1.35 - healthFactor)));
    const cityVendors = vendors.filter((v) => v.cityId === property.cityId);

    for (let t = 0; t < ticketCount; t++) {
      let category: WorkOrderCategory = rng.pickWeighted(WORK_ORDER_CATEGORY_WEIGHTS);
      if (property.hasLift && rng.bool(0.08)) category = "Lift/Elevator";

      const priority: WorkOrder["priority"] = rng.pickWeighted([
        ["Low", 30],
        ["Medium", 38],
        ["High", 24],
        ["Critical", 8],
      ]);
      const slaHours = SLA_HOURS_BY_PRIORITY[priority];
      const ageDays = rng.int(1, HISTORY_MONTHS * 30 - 3);
      const createdDate = isoDate(-ageDays);
      const raisedBy: WorkOrder["raisedBy"] = rng.pickWeighted([
        ["Resident", 62],
        ["Ops Inspection", 28],
        ["Owner Request", 10],
      ]);
      const unit = raisedBy === "Resident" && rng.bool(0.85) ? rng.pick(propUnits) : rng.bool(0.3) ? rng.pick(propUnits) : null;

      const eligibleVendors = cityVendors.filter((v) => v.categories.includes(category));
      const vendor = eligibleVendors.length ? rng.pick(eligibleVendors) : null;

      let status: WorkOrder["status"];
      let resolvedDate: string | null = null;
      let cost: number | null = null;
      let residentRating: number | null = null;
      let vendorId: string | null = null;

      if (ageDays <= 4) {
        status = rng.bool(0.55) ? "Open" : "Assigned";
        if (status === "Assigned") vendorId = vendor?.id ?? null;
      } else if (ageDays <= 12) {
        status = rng.bool(0.4) ? "Assigned" : "In Progress";
        vendorId = vendor?.id ?? null;
      } else {
        const breachProb = clamp((1 - healthFactor) * 0.22, 0.02, 0.3);
        const stillOpen = ageDays <= 30 && rng.bool(breachProb);
        vendorId = vendor?.id ?? null;
        if (stillOpen) {
          status = "Overdue";
        } else {
          status = "Completed";
          const breached = rng.bool(breachProb * 1.4);
          const resolutionHours = breached ? slaHours * rng.float(1.2, 2.6) : slaHours * rng.float(0.35, 1.05);
          resolvedDate = isoDate(Math.min(resolutionHours / 24, ageDays - 1), new Date(createdDate));
          const baseCost = { Plumbing: 1400, Electrical: 1200, HVAC: 3200, "Lift/Elevator": 6500, Painting: 4200, "Pest Control": 1800, "Civil/Structural": 5200, Housekeeping: 900, "Security Systems": 2600, Landscaping: 1500 }[category];
          cost = round0(baseCost * rng.float(0.7, 1.5));
          if (unit && raisedBy === "Resident" && rng.bool(0.72)) {
            residentRating = clamp(round0(rng.gaussian(2.5 + healthFactor * 2.3, 0.55)), 1, 5);
          }
        }
      }

      workOrders.push({
        id: `wo-${wSeq++}`,
        propertyId: property.id,
        unitId: unit?.id ?? null,
        category,
        description: rng.pick(WORK_ORDER_TEMPLATES[category]),
        priority,
        status,
        raisedBy,
        createdDate,
        slaHours,
        vendorId,
        resolvedDate,
        cost,
        residentRating,
      });
    }
  }

  // ---- Aggregate vendor stats from actual work orders (keeps numbers internally consistent) ----
  for (const vendor of vendors) {
    const jobs = workOrders.filter((w) => w.vendorId === vendor.id && w.status === "Completed");
    vendor.jobsCompleted = jobs.length;
    const rated = jobs.filter((j) => j.residentRating != null);
    vendor.avgRating = rated.length ? Number((rated.reduce((s, j) => s + (j.residentRating ?? 0), 0) / rated.length).toFixed(2)) : 4.2;
    const withinSla = jobs.filter((j) => j.resolvedDate && daysBetween(j.createdDate, j.resolvedDate) * 24 <= j.slaHours * 1.05);
    vendor.slaCompliancePct = jobs.length ? Number(((withinSla.length / jobs.length) * 100).toFixed(1)) : 92;
    vendor.avgCostPerJob = jobs.length ? round0(jobs.reduce((s, j) => s + (j.cost ?? 0), 0) / jobs.length) : 0;
  }

  // ---- Transactions (derived from real rent payments + work order costs, plus formulaic opex) ----
  const transactions: Transaction[] = [];
  let tSeq = 0;
  for (const property of properties) {
    const propUnits = units.filter((u) => u.propertyId === property.id);
    const assetValue = propUnits.reduce((s, u) => s + u.capitalValue, 0);
    const propLeaseIds = new Set(leases.filter((l) => propUnits.some((u) => u.id === l.unitId)).map((l) => l.id));
    const propWorkOrders = workOrders.filter((w) => w.propertyId === property.id);

    for (const month of months) {
      const rentCollected = rentPayments
        .filter((p) => propLeaseIds.has(p.leaseId) && p.month === month && (p.status === "Paid" || p.status === "Paid Late"))
        .reduce((s, p) => s + p.amount, 0);
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "income-rent", amount: round0(rentCollected), note: "Rent collections" });

      const otherIncome = round0(property.totalUnits * rng.float(60, 180));
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "income-other", amount: otherIncome, note: "Parking, amenity & late fees" });

      const maintCost = propWorkOrders.filter((w) => w.status === "Completed" && w.resolvedDate && monthOf(w.resolvedDate) === month).reduce((s, w) => s + (w.cost ?? 0), 0);
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-maintenance", amount: round0(maintCost), note: "Work order costs" });

      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-utilities", amount: round0(property.totalUnits * rng.float(650, 900)), note: "Common area power & water" });
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-staff", amount: round0(property.totalUnits * rng.float(700, 950)), note: "Security & housekeeping staff" });
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-property-tax", amount: round0((assetValue * 0.0038) / 12), note: "Property tax accrual" });
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-insurance", amount: round0((assetValue * 0.0011) / 12), note: "Building insurance" });
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-vendor", amount: round0(property.totalUnits * rng.float(140, 230)), note: "AMC contracts (lift, STP, landscaping)" });

      const managementFee = round0(rentCollected * 0.08);
      transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-management-fee", amount: managementFee, note: "Trellis operating & management fee (8% of collected rent)" });

      const vacantUnits = propUnits.filter((u) => u.status === "Vacant").length;
      if (vacantUnits > propUnits.length * 0.08) {
        transactions.push({ id: `txn-${tSeq++}`, propertyId: property.id, month, type: "expense-marketing", amount: round0(vacantUnits * rng.float(400, 900)), note: "Vacant-unit marketing spend" });
      }
    }
  }

  // ---- Community posts ----
  const communityPosts: CommunityPost[] = [];
  let cSeq = 0;
  const POSTS: { title: string; body: string; category: CommunityPost["category"] }[] = [
    { title: "Monthly maintenance charges due by the 10th", body: "Residents are requested to clear maintenance dues by the 10th of every month to avoid late fees.", category: "Notice" },
    { title: "Water tanker schedule this week", body: "Municipal supply is limited this week — tankers scheduled Mon/Wed/Fri, 7–9 AM.", category: "Notice" },
    { title: "Community Diwali celebration", body: "Join us at the clubhouse for the annual community Diwali celebration — decorations, food stalls and games.", category: "Event" },
    { title: "Clubhouse slot booking now open", body: "Clubhouse and multipurpose hall slots for next month are open for booking via the front desk.", category: "Amenity Booking" },
    { title: "Annual General Body Meeting", body: "The AGM will be held in the clubhouse to discuss the annual budget and committee elections.", category: "Notice" },
    { title: "Lift maintenance shutdown window", body: "Scheduled elevator AMC service will take Block lifts offline for 3 hours on Sunday morning.", category: "Notice" },
    { title: "Weekend yoga & fitness sessions", body: "Free community yoga sessions every Saturday morning at the garden lawn.", category: "Event" },
  ];
  for (const property of properties) {
    const count = rng.int(3, 5);
    const templates = rng.shuffle(POSTS).slice(0, count);
    for (let i = 0; i < count; i++) {
      const template = templates[i];
      communityPosts.push({
        id: `post-${cSeq++}`,
        propertyId: property.id,
        authorRole: rng.bool(0.75) ? "Community Manager" : "Resident",
        authorName: rng.bool(0.75) ? "Trellis Community Operations" : `${rng.pick(RESIDENT_FIRST_NAMES)} ${rng.pick(RESIDENT_LAST_NAMES)}`,
        title: template.title,
        body: template.body,
        date: isoDate(-rng.int(1, 75)),
        category: template.category,
      });
    }
  }

  return { cities, owners, properties, units, residents, leases, rentPayments, transactions, workOrders, vendors, communityPosts, months, healthFactors };
}

export function monthsAsOf(dataset: TrellisDataset, month: string): string[] {
  return dataset.months.filter((m) => monthIndex(m) <= monthIndex(month));
}

export function nextMonth(dataset: TrellisDataset): string {
  return addMonths(dataset.months[dataset.months.length - 1], 1);
}
