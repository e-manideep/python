import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as repo from "../../data/repositories";
import type { Allergy, Encounter, Medication, Patient, Problem, SoapNote } from "../../data/types";
import { clinicalDecisionSupport, structureEncounterNote, type DecisionSupport } from "../../ai/claude";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge, SeverityBadge } from "../../components/Badge";
import { age, formatDateTime } from "../../lib/format";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { uid } from "../../lib/ids";

export function EncounterWorkspace() {
  const { id: patientId, encounterId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);

  const [transcript, setTranscript] = useState("");
  const [note, setNote] = useState<SoapNote | null>(null);
  const [decisionSupport, setDecisionSupport] = useState<DecisionSupport | null>(null);
  const [selectedIcds, setSelectedIcds] = useState<Record<string, boolean>>({});

  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  const dictation = useSpeechRecognition((chunk) => setTranscript((t) => (t ? t + " " + chunk : chunk)));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    load();
  }, [patientId, encounterId]);

  async function load() {
    if (!patientId || !encounterId) return;
    const [p, e, probs, meds, allergs] = await Promise.all([
      repo.patients.get(patientId),
      repo.encounters.get(encounterId),
      repo.problems.forPatient(patientId),
      repo.medications.forPatient(patientId),
      repo.allergies.forPatient(patientId),
    ]);
    setPatient(p ?? null);
    setEncounter(e ?? null);
    setProblems(probs);
    setMedications(meds);
    setAllergies(allergs);
    setTranscript(e?.transcript ?? "");
    setNote(e?.note ?? null);
    if (e && e.status === "SCHEDULED") {
      await repo.encounters.update(e.id, { status: "IN_PROGRESS" });
      setEncounter({ ...e, status: "IN_PROGRESS" });
    }
  }

  // persist transcript as the clinician dictates/types
  useEffect(() => {
    if (!encounter) return;
    const t = setTimeout(() => {
      repo.encounters.update(encounter.id, { transcript });
    }, 400);
    return () => clearTimeout(t);
  }, [transcript, encounter?.id]);

  const patientCtx = patient
    ? { name: patient.name, age: age(patient.dob), gender: patient.gender, problems, medications, allergies }
    : null;

  async function handleGenerateNote() {
    if (!encounter || !patientCtx) return;
    setError("");
    setGenerating(true);
    try {
      const result = await structureEncounterNote({
        chiefComplaint: encounter.chiefComplaint,
        transcript,
        patient: patientCtx,
      });
      setNote(result);
      setSelectedIcds(Object.fromEntries(result.icdSuggestions.map((s) => [s.code, true])));
      await repo.encounters.update(encounter.id, { note: result, noteStatus: "DRAFT" });
      setEncounter({ ...encounter, note: result, noteStatus: "DRAFT" });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong generating the note.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCheckDecisionSupport() {
    if (!patientCtx || !transcript.trim()) return;
    setError("");
    setChecking(true);
    try {
      const result = await clinicalDecisionSupport({ transcript, patient: patientCtx });
      setDecisionSupport(result);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong checking for interactions.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSign() {
    if (!encounter || !note || !patient) return;
    setSigning(true);
    try {
      await repo.encounters.update(encounter.id, {
        note,
        noteStatus: "SIGNED",
        status: "COMPLETED",
        signedAt: new Date().toISOString(),
      });
      for (const s of note.icdSuggestions) {
        if (!selectedIcds[s.code]) continue;
        const exists = problems.some((p) => p.icdCode === s.code);
        if (!exists) {
          await repo.problems.add({
            id: uid(),
            patientId: patient.id,
            description: s.label,
            icdCode: s.code,
            status: "ACTIVE",
            onsetDate: new Date().toISOString(),
            source: "AI_NOTE",
          });
        }
      }
      navigate(`/patients/${patient.id}`);
    } finally {
      setSigning(false);
    }
  }

  function updateNoteField(field: keyof SoapNote, value: string) {
    if (!note) return;
    setNote({ ...note, [field]: value } as SoapNote);
  }

  if (!patient || !encounter) return <div className="text-ink-faint">Loading encounter…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-pulse">
            {encounter.type} · {formatDateTime(encounter.scheduledAt)}
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">
            {patient.name} <span className="font-normal text-ink-faint">· {age(patient.dob)}{patient.gender[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{encounter.chiefComplaint}</p>
        </div>
        <StatusBadge status={encounter.status} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Encounter dictation"
              eyebrow="Voice or typed"
              action={
                dictation.supported ? (
                  <Button
                    variant={dictation.listening ? "danger" : "secondary"}
                    onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                  >
                    <span className={`h-2 w-2 rounded-full bg-white ${dictation.listening ? "live-dot" : ""}`} />
                    {dictation.listening ? "Stop dictation" : "Start dictation"}
                  </Button>
                ) : (
                  <span className="text-xs text-ink-faint">Voice dictation isn't supported in this browser — type below.</span>
                )
              }
            />
            <div className="p-5">
              <textarea
                ref={textareaRef}
                className="input min-h-[160px] font-mono text-[13px] leading-relaxed"
                placeholder="Dictate or type what happened in the visit — history, exam findings, your assessment and plan. Nadi will structure it into a formal note."
                value={transcript + (dictation.interim ? " " + dictation.interim : "")}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-ink-faint">{transcript.trim().split(/\s+/).filter(Boolean).length} words captured</p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleCheckDecisionSupport} disabled={checking || !transcript.trim()}>
                    {checking ? "Checking…" : "Check interactions"}
                  </Button>
                  <Button onClick={handleGenerateNote} disabled={generating || !transcript.trim()}>
                    {generating ? "Structuring note…" : note ? "Regenerate note" : "Generate note"}
                  </Button>
                </div>
              </div>
              {error && <div className="mt-3 rounded-lg bg-warn-pale px-3 py-2 text-sm text-warn">{error}</div>}
            </div>
          </Card>

          {note && (
            <Card>
              <CardHeader title="Structured note" eyebrow={encounter.noteStatus === "SIGNED" ? "Signed" : "Draft — review before signing"} />
              <div className="space-y-4 p-5">
                <NoteField label="Subjective" value={note.subjective} onChange={(v) => updateNoteField("subjective", v)} />
                <NoteField label="Objective" value={note.objective} onChange={(v) => updateNoteField("objective", v)} />
                <NoteField label="Assessment" value={note.assessment} onChange={(v) => updateNoteField("assessment", v)} />
                <NoteField label="Plan" value={note.plan} onChange={(v) => updateNoteField("plan", v)} />

                <div>
                  <div className="label">ICD-10 suggestions — add to problem list on signing</div>
                  <div className="flex flex-wrap gap-2">
                    {note.icdSuggestions.map((s) => (
                      <label
                        key={s.code}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                          selectedIcds[s.code] ? "border-pulse bg-pulse-pale text-pulse" : "border-line text-ink-soft"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={!!selectedIcds[s.code]}
                          onChange={(e) => setSelectedIcds({ ...selectedIcds, [s.code]: e.target.checked })}
                        />
                        {s.code} · {s.label}
                      </label>
                    ))}
                  </div>
                </div>

                <NoteField label="After-visit summary (patient-facing)" value={note.afterVisitSummary} onChange={(v) => updateNoteField("afterVisitSummary", v)} />

                {encounter.noteStatus !== "SIGNED" && (
                  <Button onClick={handleSign} disabled={signing} className="w-full">
                    {signing ? "Signing…" : "Sign & complete encounter"}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Patient snapshot" />
            <div className="space-y-3 p-5 text-sm">
              <div>
                <div className="label">Allergies</div>
                {allergies.length === 0 && <span className="text-ink-faint">NKDA</span>}
                {allergies.map((a) => (
                  <div key={a.id} className="mb-1 flex items-center justify-between">
                    <span>{a.substance} — {a.reaction}</span>
                    <SeverityBadge severity={a.severity} />
                  </div>
                ))}
              </div>
              <div>
                <div className="label">Active problems</div>
                {problems.filter((p) => p.status === "ACTIVE").map((p) => (
                  <div key={p.id} className="text-ink-soft">{p.description} <span className="font-mono text-xs text-ink-faint">{p.icdCode}</span></div>
                ))}
              </div>
              <div>
                <div className="label">Active medications</div>
                {medications.filter((m) => m.status === "ACTIVE").map((m) => (
                  <div key={m.id} className="text-ink-soft">{m.name} {m.dose} — {m.frequency}</div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Clinical decision support" eyebrow="Claude-assisted" />
            <div className="space-y-4 p-5">
              {!decisionSupport && (
                <p className="text-xs text-ink-faint">
                  Run "Check interactions" once you've dictated the history and any new medications — Nadi checks
                  against this patient's actual allergy and medication list, not generic references.
                </p>
              )}
              {decisionSupport && (
                <>
                  <SupportList title="Drug interactions" items={decisionSupport.interactions} tone="warn" />
                  <SupportList title="Safety alerts" items={decisionSupport.alerts} tone="critical" />
                  <SupportList title="Differentials to consider" items={decisionSupport.differentials} tone="pulse" />
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NoteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className="input min-h-[70px] text-[13px] leading-relaxed" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SupportList({ title, items, tone }: { title: string; items: string[]; tone: "warn" | "critical" | "pulse" }) {
  const toneClass = { warn: "bg-warn-pale text-warn", critical: "bg-critical-pale text-critical", pulse: "bg-pulse-pale text-pulse" }[tone];
  return (
    <div>
      <div className="label">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-faint">Nothing flagged.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className={`rounded-lg px-3 py-2 text-xs ${toneClass}`}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
