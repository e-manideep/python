import { useEffect, useState } from "react";
import * as repo from "../../data/repositories";
import { resetAllData } from "../../data/repositories";
import { seedIfEmpty } from "../../data/seed";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";

export function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [clinicianName, setClinicianName] = useState("");
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    repo.settings.get().then((s) => {
      setApiKey(s.anthropicApiKey);
      setModel(s.anthropicModel);
      setClinicianName(s.clinicianName);
    });
  }, []);

  async function save() {
    await repo.settings.update({ anthropicApiKey: apiKey.trim(), anthropicModel: model.trim(), clinicianName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function reset() {
    if (!confirm("This clears every patient, encounter, claim, and message in this browser. Re-seed demo data afterward?")) return;
    setResetting(true);
    await resetAllData();
    await seedIfEmpty();
    setResetting(false);
    window.location.reload();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>

      <Card>
        <CardHeader title="Claude API key" eyebrow="Required for AI features" />
        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-warn/30 bg-warn-pale px-3 py-2.5 text-xs leading-relaxed text-warn">
            <strong>This is a prototype.</strong> Your key and all patient data in this demo are stored only in this
            browser's IndexedDB/localStorage — no server, no encryption at rest, no audit log. That's fine for trying
            Nadi out; it is not how real patient data should ever be stored. A production deployment would proxy every
            Claude call through a backend so the key never reaches the browser at all.
          </div>
          <label className="block">
            <span className="label">Anthropic API key</span>
            <input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-…" />
          </label>
          <label className="block">
            <span className="label">Model</span>
            <input className="input" value={model} onChange={(e) => setModel(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Clinician name (used on notes and referrals)</span>
            <input className="input" value={clinicianName} onChange={(e) => setClinicianName(e.target.value)} />
          </label>
          <Button onClick={save}>{saved ? "Saved ✓" : "Save settings"}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Demo data" />
        <div className="space-y-3 p-5">
          <p className="text-sm text-ink-soft">Wipe everything and reload the original seeded patient roster.</p>
          <Button variant="danger" onClick={reset} disabled={resetting}>{resetting ? "Resetting…" : "Reset all data"}</Button>
        </div>
      </Card>
    </div>
  );
}
