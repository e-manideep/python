import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as repo from "../../data/repositories";
import type { Encounter, Patient } from "../../data/types";
import { Card, CardHeader } from "../../components/Card";
import { StatusBadge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { formatTime, age } from "../../lib/format";

export function Today() {
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState<(Encounter & { patient?: Patient })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Patient[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const all = await repo.encounters.all();
    const todayStr = new Date().toDateString();
    const todays = all.filter((e) => new Date(e.scheduledAt).toDateString() === todayStr || e.status === "IN_PROGRESS");
    const withPatients = await Promise.all(
      todays.map(async (e) => ({ ...e, patient: await repo.patients.get(e.patientId) })),
    );
    withPatients.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    setEncounters(withPatients);
    setLoading(false);
  }

  useEffect(() => {
    if (!search.trim()) return setResults([]);
    repo.patients.search(search).then(setResults);
  }, [search]);

  const notesPending = encounters.filter((e) => e.noteStatus === "DRAFT").length;
  const inProgress = encounters.filter((e) => e.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-pulse">Today</div>
          <h1 className="font-display text-3xl font-bold text-ink">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </h1>
        </div>
        <div className="w-72">
          <input
            className="input"
            placeholder="Search patients by name or MRN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {results.length > 0 && (
            <div className="mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
              {results.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                >
                  <span className="font-medium text-ink">{p.name}</span>{" "}
                  <span className="font-mono text-xs text-ink-faint">{p.mrn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="px-5 py-4">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">On the schedule</div>
          <div className="font-display text-2xl font-bold">{encounters.length}</div>
        </Card>
        <Card className="px-5 py-4">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">In progress</div>
          <div className="font-display text-2xl font-bold text-pulse">{inProgress}</div>
        </Card>
        <Card className="px-5 py-4">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Notes awaiting signature</div>
          <div className="font-display text-2xl font-bold text-warn">{notesPending}</div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Schedule" />
        {loading ? (
          <div className="px-5 py-8 text-center text-ink-faint">Loading…</div>
        ) : (
          <div className="divide-y divide-line">
            {encounters.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 font-mono text-sm text-ink-faint">{formatTime(e.scheduledAt)}</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                    {e.patient?.photoInitials}
                  </div>
                  <div>
                    <div className="font-medium text-ink">
                      {e.patient?.name} <span className="font-normal text-ink-faint">· {e.patient ? age(e.patient.dob) : "—"}</span>
                    </div>
                    <div className="text-xs text-ink-faint">{e.type} · {e.chiefComplaint}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
                  <Link to={`/patients/${e.patientId}/encounter/${e.id}`}>
                    <Button variant={e.status === "IN_PROGRESS" ? "secondary" : "ghost"}>
                      {e.status === "IN_PROGRESS" ? "Resume encounter" : e.status === "COMPLETED" ? "View note" : "Start encounter"}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {encounters.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-faint">Nothing on the schedule today.</div>}
          </div>
        )}
      </Card>
    </div>
  );
}
