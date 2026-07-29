import { useEffect, useRef, useState } from "react";
import * as repo from "../../data/repositories";
import type { Allergy, Encounter, Medication, Message, Patient, Problem } from "../../data/types";
import { patientNavigatorReply } from "../../ai/claude";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { useViewpoint } from "../../state/viewpoint";
import { formatDate, formatDateTime } from "../../lib/format";
import { uid } from "../../lib/ids";

export function PatientPortal() {
  const { activePatientId, setActivePatientId } = useViewpoint();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    repo.patients.all().then((all) => {
      setPatients(all);
      if (!activePatientId && all[0]) setActivePatientId(all[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activePatientId) return;
    load(activePatientId);
  }, [activePatientId]);

  async function load(patientId: string) {
    const [p, e, probs, meds, allergs, msgs] = await Promise.all([
      repo.patients.get(patientId),
      repo.encounters.forPatient(patientId),
      repo.problems.forPatient(patientId),
      repo.medications.forPatient(patientId),
      repo.allergies.forPatient(patientId),
      repo.messages.forPatient(patientId),
    ]);
    setPatient(p ?? null);
    setEncounters(e);
    setProblems(probs);
    setMedications(meds);
    setAllergies(allergs);
    setMessages(msgs);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!patient || !input.trim()) return;
    setError("");
    const question = input;
    setInput("");
    const userMsg: Message = { id: uid(), patientId: patient.id, from: "patient", content: question, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    await repo.messages.add(userMsg);
    setSending(true);
    try {
      const upcoming = encounters.find((e) => e.status === "SCHEDULED");
      const reply = await patientNavigatorReply({
        patient: { name: patient.name, problems, medications, allergies },
        upcomingVisit: upcoming ? `${upcoming.type} on ${formatDateTime(upcoming.scheduledAt)}` : null,
        history: messages.map((m) => ({ role: m.from === "patient" ? "user" : "assistant", content: m.content })),
        question,
      });
      const aiMsg: Message = { id: uid(), patientId: patient.id, from: "ai", content: reply, createdAt: new Date().toISOString() };
      setMessages((m) => [...m, aiMsg]);
      await repo.messages.add(aiMsg);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (!patient) return <div className="text-ink-faint">Loading…</div>;

  const summaries = encounters.filter((e) => e.noteStatus === "SIGNED" && e.note).slice(0, 5);
  const upcoming = encounters.filter((e) => e.status === "SCHEDULED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-pulse">My care</div>
          <h1 className="font-display text-3xl font-bold text-ink">Hi {patient.name.split(" ")[0]},</h1>
        </div>
        <select className="input w-56" value={activePatientId ?? ""} onChange={(e) => setActivePatientId(e.target.value)}>
          {patients.map((p) => <option key={p.id} value={p.id}>Viewing as: {p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader title="Recent visit summaries" />
            <div className="divide-y divide-line">
              {summaries.map((e) => (
                <div key={e.id} className="px-5 py-4">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">{formatDate(e.scheduledAt)} · {e.type}</div>
                  <p className="text-sm leading-relaxed text-ink">{e.note?.afterVisitSummary}</p>
                </div>
              ))}
              {summaries.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No visit summaries yet.</div>}
            </div>
          </Card>

          <Card className="flex h-[420px] flex-col overflow-hidden">
            <CardHeader title="Ask Nadi" eyebrow="Grounded in your own chart" />
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.length === 0 && (
                <div className="space-y-2 text-sm text-ink-faint">
                  <p>Try asking:</p>
                  <ul className="list-inside list-disc">
                    <li>"What medications am I taking and why?"</li>
                    <li>"When is my next appointment?"</li>
                  </ul>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "patient" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from === "patient" ? "bg-ink text-white" : "border border-line bg-paper text-ink"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && <div className="text-xs text-ink-faint">Thinking…</div>}
              {error && <div className="rounded-lg bg-warn-pale px-3 py-2 text-sm text-warn">{error}</div>}
            </div>
            <div className="flex gap-2 border-t border-line p-4">
              <input className="input flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your care…" onKeyDown={(e) => e.key === "Enter" && send()} />
              <Button onClick={send} disabled={sending || !input.trim()}>Send</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Upcoming appointments" />
            <div className="divide-y divide-line">
              {upcoming.map((e) => (
                <div key={e.id} className="px-5 py-3 text-sm">
                  <div className="font-medium text-ink">{e.type}</div>
                  <div className="text-xs text-ink-faint">{formatDateTime(e.scheduledAt)}</div>
                </div>
              ))}
              {upcoming.length === 0 && <div className="px-5 py-4 text-sm text-ink-faint">Nothing scheduled.</div>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Your medications" />
            <div className="space-y-2 p-5 text-sm">
              {medications.filter((m) => m.status === "ACTIVE").map((m) => (
                <div key={m.id}><span className="font-medium text-ink">{m.name}</span> — {m.dose}, {m.frequency}</div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
