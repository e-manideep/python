import { useEffect, useState } from "react";
import * as repo from "../../data/repositories";
import type { Patient, Referral, ReferralStatus } from "../../data/types";
import { draftReferralLetter } from "../../ai/claude";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/Badge";
import { formatDate, age } from "../../lib/format";
import { uid } from "../../lib/ids";

const NEXT_STATUS: Record<ReferralStatus, ReferralStatus | null> = {
  DRAFTED: "SENT",
  SENT: "SCHEDULED",
  SCHEDULED: "COMPLETED",
  COMPLETED: null,
};
const NEXT_LABEL: Record<ReferralStatus, string> = {
  DRAFTED: "Mark sent",
  SENT: "Mark scheduled",
  SCHEDULED: "Mark completed",
  COMPLETED: "Completed",
};

export function ReferralsBoard() {
  const [referrals, setReferrals] = useState<(Referral & { patient?: Patient })[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [toSpecialty, setToSpecialty] = useState("");
  const [toProvider, setToProvider] = useState("");
  const [reason, setReason] = useState("");
  const [letter, setLetter] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    repo.patients.all().then(setPatients);
  }, []);

  async function load() {
    const all = await repo.referrals.all();
    const withPatients = await Promise.all(all.map(async (r) => ({ ...r, patient: await repo.patients.get(r.patientId) })));
    setReferrals(withPatients);
  }

  async function draft() {
    if (!patientId || !toSpecialty || !reason) return;
    setError("");
    setDrafting(true);
    try {
      const [problems, medications, allergies, encounters] = await Promise.all([
        repo.problems.forPatient(patientId),
        repo.medications.forPatient(patientId),
        repo.allergies.forPatient(patientId),
        repo.encounters.forPatient(patientId),
      ]);
      const patient = patients.find((p) => p.id === patientId)!;
      const recentNote = encounters.find((e) => e.noteStatus === "SIGNED")?.note;
      const result = await draftReferralLetter({
        patient: { name: patient.name, age: age(patient.dob), gender: patient.gender, problems, medications, allergies },
        toSpecialty,
        reason,
        recentNoteSummary: recentNote ? `${recentNote.assessment} ${recentNote.plan}` : "No recent signed note on file.",
      });
      setLetter(result);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong drafting the letter.");
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    if (!patientId || !toSpecialty || !letter) return;
    setSaving(true);
    await repo.referrals.add({
      id: uid(),
      patientId,
      encounterId: "",
      toSpecialty,
      toProvider,
      reason,
      letter,
      status: "DRAFTED",
      createdAt: new Date().toISOString(),
    });
    setShowForm(false);
    setPatientId(""); setToSpecialty(""); setToProvider(""); setReason(""); setLetter("");
    setSaving(false);
    load();
  }

  async function advance(r: Referral) {
    const next = NEXT_STATUS[r.status];
    if (!next) return;
    await repo.referrals.update(r.id, { status: next });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-ink">Referrals</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "New referral"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title="Draft a referral" eyebrow="Claude drafts from the patient's chart" />
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="label">Patient</span>
                <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                  <option value="">Select a patient…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.mrn}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Refer to specialty</span>
                <input className="input" value={toSpecialty} onChange={(e) => setToSpecialty(e.target.value)} placeholder="e.g. Cardiology" />
              </label>
              <label className="block">
                <span className="label">Specific provider (optional)</span>
                <input className="input" value={toProvider} onChange={(e) => setToProvider(e.target.value)} placeholder="e.g. Dr. Rao, Manipal Hospitals" />
              </label>
              <label className="block">
                <span className="label">Reason for referral</span>
                <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New murmur on exam, needs echo" />
              </label>
            </div>
            <Button variant="ghost" onClick={draft} disabled={drafting || !patientId || !toSpecialty || !reason}>
              {drafting ? "Drafting…" : "Draft letter with Claude"}
            </Button>
            {error && <div className="rounded-lg bg-warn-pale px-3 py-2 text-sm text-warn">{error}</div>}
            {letter && (
              <label className="block">
                <span className="label">Referral letter (editable)</span>
                <textarea className="input min-h-[120px] text-[13px] leading-relaxed" value={letter} onChange={(e) => setLetter(e.target.value)} />
              </label>
            )}
            {letter && (
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save referral"}</Button>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="divide-y divide-line">
          {referrals.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-medium text-ink">{r.patient?.name} → {r.toSpecialty}</div>
                <div className="text-xs text-ink-faint">{r.toProvider || "Provider not specified"} · referred {formatDate(r.createdAt)}</div>
                <div className="mt-1 text-xs text-ink-soft">{r.reason}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={r.status} />
                {NEXT_STATUS[r.status] && (
                  <Button variant="ghost" onClick={() => advance(r)}>{NEXT_LABEL[r.status]}</Button>
                )}
              </div>
            </div>
          ))}
          {referrals.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-faint">No referrals yet.</div>}
        </div>
      </Card>
    </div>
  );
}
