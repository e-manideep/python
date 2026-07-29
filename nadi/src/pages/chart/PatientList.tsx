import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as repo from "../../data/repositories";
import type { Patient } from "../../data/types";
import { Card } from "../../components/Card";
import { age } from "../../lib/format";

export function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    repo.patients.all().then(setPatients);
  }, []);

  useEffect(() => {
    repo.patients.search(search).then(setPatients);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-ink">Patients</h1>
        <input className="input w-72" placeholder="Search by name, MRN, or health ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        <div className="divide-y divide-line">
          {patients.map((p) => (
            <Link key={p.id} to={`/patients/${p.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-paper">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{p.photoInitials}</div>
                <div>
                  <div className="font-medium text-ink">{p.name}</div>
                  <div className="font-mono text-xs text-ink-faint">{p.mrn} · {age(p.dob)}{p.gender[0]} · {p.city}</div>
                </div>
              </div>
              <div className="font-mono text-xs text-ink-faint">{p.healthId}</div>
            </Link>
          ))}
          {patients.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-faint">No patients found.</div>}
        </div>
      </Card>
    </div>
  );
}
