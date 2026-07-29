import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as repo from "../../data/repositories";
import type { Allergy, Encounter, Medication, Patient, Problem, VitalsReading } from "../../data/types";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge, SeverityBadge } from "../../components/Badge";
import { age, formatDate, formatDateTime } from "../../lib/format";
import { uid } from "../../lib/ids";

export function PatientChart() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [vitals, setVitals] = useState<VitalsReading[]>([]);
  const [enc, setEnc] = useState<Encounter[]>([]);

  useEffect(() => {
    if (!id) return;
    load(id);
  }, [id]);

  async function load(patientId: string) {
    const [p, probs, meds, allergs, v, e] = await Promise.all([
      repo.patients.get(patientId),
      repo.problems.forPatient(patientId),
      repo.medications.forPatient(patientId),
      repo.allergies.forPatient(patientId),
      repo.vitals.forPatient(patientId),
      repo.encounters.forPatient(patientId),
    ]);
    setPatient(p ?? null);
    setProblems(probs);
    setMedications(meds);
    setAllergies(allergs);
    setVitals(v);
    setEnc(e);
  }

  async function startEncounter() {
    if (!patient) return;
    const newEnc: Encounter = {
      id: uid(),
      patientId: patient.id,
      clinicianName: "Dr. Meera Krishnan",
      type: "Office Visit",
      scheduledAt: new Date().toISOString(),
      durationMin: 20,
      status: "IN_PROGRESS",
      chiefComplaint: "Unscheduled visit",
      transcript: "",
      note: null,
      noteStatus: "NONE",
    };
    await repo.encounters.upsert(newEnc);
    navigate(`/patients/${patient.id}/encounter/${newEnc.id}`);
  }

  if (!patient) return <div className="text-ink-faint">Loading chart…</div>;

  const vitalsChart = vitals.map((v) => ({ date: formatDate(v.takenAt), systolic: v.systolic, diastolic: v.diastolic }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">{patient.photoInitials}</div>
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">{patient.name}</h1>
            <div className="font-mono text-xs text-ink-faint">
              {age(patient.dob)}{patient.gender[0]} · {patient.mrn} · {patient.healthId} · {patient.city}
            </div>
          </div>
        </div>
        <Button onClick={startEncounter}>Start new encounter</Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader title="Vitals trend" eyebrow="Blood pressure, mmHg" />
            <div className="h-56 px-5 py-5">
              {vitalsChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalsChart}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#868D96" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#868D96" }} domain={[60, 160]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="systolic" stroke="#0F1113" strokeWidth={2} dot={{ r: 3 }} name="Systolic" />
                    <Line type="monotone" dataKey="diastolic" stroke="#12B76A" strokeWidth={2} dot={{ r: 3 }} name="Diastolic" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-ink-faint">No vitals recorded yet.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Encounter history" />
            <div className="divide-y divide-line">
              {enc.map((e) => (
                <Link key={e.id} to={`/patients/${patient.id}/encounter/${e.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-paper">
                  <div>
                    <div className="font-medium text-ink">{e.type} — {e.chiefComplaint}</div>
                    <div className="text-xs text-ink-faint">{formatDateTime(e.scheduledAt)} · {e.clinicianName}</div>
                  </div>
                  <StatusBadge status={e.noteStatus === "SIGNED" ? "SIGNED" : e.status} />
                </Link>
              ))}
              {enc.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No encounters on file.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Allergies" />
            <div className="space-y-2 p-5">
              {allergies.length === 0 && <p className="text-sm text-ink-faint">No known drug allergies.</p>}
              {allergies.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>{a.substance} — {a.reaction}</span>
                  <SeverityBadge severity={a.severity} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Problem list" />
            <div className="space-y-2 p-5">
              {problems.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.description} <span className="font-mono text-xs text-ink-faint">{p.icdCode}</span></span>
                  <StatusBadge status={p.status} />
                </div>
              ))}
              {problems.length === 0 && <p className="text-sm text-ink-faint">No problems on file.</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Medications" />
            <div className="space-y-2 p-5">
              {medications.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{m.name}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="text-xs text-ink-faint">{m.dose} · {m.frequency} · {m.route}</div>
                </div>
              ))}
              {medications.length === 0 && <p className="text-sm text-ink-faint">No medications on file.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
