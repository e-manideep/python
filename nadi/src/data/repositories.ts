// Repository layer — every screen in the app talks to these functions, never
// to `db` (Dexie) directly. Replacing browser storage with a real backend
// later means rewriting this one file against fetch/API calls; no component
// needs to change.

import { db } from "./db";
import type {
  Allergy,
  AppSettings,
  Claim,
  Encounter,
  Medication,
  Message,
  Patient,
  Policy,
  Problem,
  Referral,
  VitalsReading,
} from "./types";

export const patients = {
  all: () => db.patients.orderBy("name").toArray(),
  get: (id: string) => db.patients.get(id),
  search: async (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.all();
    const all = await db.patients.toArray();
    return all.filter(
      (p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q) || p.healthId.includes(q),
    );
  },
  upsert: (p: Patient) => db.patients.put(p),
};

export const problems = {
  forPatient: (patientId: string) => db.problems.where("patientId").equals(patientId).toArray(),
  add: (p: Problem) => db.problems.put(p),
  update: (id: string, changes: Partial<Problem>) => db.problems.update(id, changes),
};

export const medications = {
  forPatient: (patientId: string) => db.medications.where("patientId").equals(patientId).toArray(),
  activeForPatient: async (patientId: string) =>
    (await db.medications.where("patientId").equals(patientId).toArray()).filter((m) => m.status === "ACTIVE"),
  add: (m: Medication) => db.medications.put(m),
  update: (id: string, changes: Partial<Medication>) => db.medications.update(id, changes),
};

export const allergies = {
  forPatient: (patientId: string) => db.allergies.where("patientId").equals(patientId).toArray(),
  add: (a: Allergy) => db.allergies.put(a),
};

export const vitals = {
  forPatient: async (patientId: string) =>
    (await db.vitals.where("patientId").equals(patientId).toArray()).sort((a, b) =>
      a.takenAt.localeCompare(b.takenAt),
    ),
  add: (v: VitalsReading) => db.vitals.put(v),
};

export const encounters = {
  all: () => db.encounters.orderBy("scheduledAt").toArray(),
  forPatient: async (patientId: string) =>
    (await db.encounters.where("patientId").equals(patientId).toArray()).sort((a, b) =>
      b.scheduledAt.localeCompare(a.scheduledAt),
    ),
  get: (id: string) => db.encounters.get(id),
  upsert: (e: Encounter) => db.encounters.put(e),
  update: (id: string, changes: Partial<Encounter>) => db.encounters.update(id, changes),
};

export const referrals = {
  all: async () => (await db.referrals.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  forPatient: (patientId: string) => db.referrals.where("patientId").equals(patientId).toArray(),
  add: (r: Referral) => db.referrals.put(r),
  update: (id: string, changes: Partial<Referral>) => db.referrals.update(id, changes),
};

export const policies = {
  forPatient: (patientId: string) => db.policies.where("patientId").equals(patientId).first(),
  get: (id: string) => db.policies.get(id),
  byNumber: async (num: string) => (await db.policies.where("policyNumber").equals(num).first()) ?? null,
  add: (p: Policy) => db.policies.put(p),
};

export const claims = {
  all: () => db.claims.orderBy("submittedAt").reverse().toArray(),
  forPatient: (patientId: string) => db.claims.where("patientId").equals(patientId).toArray(),
  get: (id: string) => db.claims.get(id),
  add: (c: Claim) => db.claims.put(c),
  update: (id: string, changes: Partial<Claim>) => db.claims.update(id, changes),
};

export const messages = {
  forPatient: async (patientId: string) =>
    (await db.messages.where("patientId").equals(patientId).toArray()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    ),
  add: (m: Message) => db.messages.put(m),
};

const DEFAULT_SETTINGS: AppSettings = {
  id: "singleton",
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-4-5-20250929",
  clinicianName: "Dr. Meera Krishnan",
  seeded: false,
};

export const settings = {
  get: async (): Promise<AppSettings> => (await db.settings.get("singleton")) ?? DEFAULT_SETTINGS,
  update: async (changes: Partial<AppSettings>) => {
    const current = await settings.get();
    await db.settings.put({ ...current, ...changes });
  },
};

export async function resetAllData() {
  await Promise.all([
    db.patients.clear(),
    db.problems.clear(),
    db.medications.clear(),
    db.allergies.clear(),
    db.vitals.clear(),
    db.encounters.clear(),
    db.referrals.clear(),
    db.policies.clear(),
    db.claims.clear(),
    db.messages.clear(),
  ]);
  await settings.update({ seeded: false });
}
