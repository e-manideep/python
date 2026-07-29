import Dexie, { type EntityTable } from "dexie";
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

// The entire app persists here — IndexedDB, scoped to this browser profile.
// This is a deliberate prototype choice (see Settings screen): real patient
// data belongs behind a server with auth, encryption at rest, and an audit
// log, none of which a browser database provides. The repository layer in
// repositories.ts is the seam where a real backend would slot in.
export class NadiDatabase extends Dexie {
  patients!: EntityTable<Patient, "id">;
  problems!: EntityTable<Problem, "id">;
  medications!: EntityTable<Medication, "id">;
  allergies!: EntityTable<Allergy, "id">;
  vitals!: EntityTable<VitalsReading, "id">;
  encounters!: EntityTable<Encounter, "id">;
  referrals!: EntityTable<Referral, "id">;
  policies!: EntityTable<Policy, "id">;
  claims!: EntityTable<Claim, "id">;
  messages!: EntityTable<Message, "id">;
  settings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("nadi-health-os");
    this.version(1).stores({
      patients: "id, mrn, healthId, name",
      problems: "id, patientId, status",
      medications: "id, patientId, status",
      allergies: "id, patientId",
      vitals: "id, patientId, takenAt",
      encounters: "id, patientId, scheduledAt, status",
      referrals: "id, patientId, encounterId, status",
      policies: "id, patientId, policyNumber",
      claims: "id, patientId, encounterId, policyId, status, submittedAt",
      messages: "id, patientId, createdAt",
      settings: "id",
    });
  }
}

export const db = new NadiDatabase();
