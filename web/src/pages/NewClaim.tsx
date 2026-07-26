import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Claim, Policy, Provider } from "../api/types";
import { Card, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../state/auth";

const DOC_TYPES = [
  ["DISCHARGE_SUMMARY", "Discharge summary"],
  ["HOSPITAL_BILL", "Hospital bill"],
  ["PRESCRIPTION", "Prescription"],
  ["LAB_REPORT", "Lab report"],
  ["PRE_AUTH_FORM", "Pre-authorisation form"],
  ["ID_PROOF", "ID proof"],
  ["OTHER", "Other"],
] as const;

export function NewClaim() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isProvider = user?.role === "PROVIDER";

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [policyId, setPolicyId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [policyNumberLookup, setPolicyNumberLookup] = useState("");
  const [lookedUpPolicy, setLookedUpPolicy] = useState<Policy | null>(null);
  const [lookupError, setLookupError] = useState("");

  const [type, setType] = useState<"CASHLESS" | "REIMBURSEMENT">("REIMBURSEMENT");
  const [diagnosis, setDiagnosis] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [claimedAmount, setClaimedAmount] = useState("");

  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number][0]>("DISCHARGE_SUMMARY");
  const [fileName, setFileName] = useState("");
  const [extractedText, setExtractedText] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isProvider) {
      api.get<{ policies: Policy[] }>("/policies/mine").then((r) => {
        setPolicies(r.policies);
        if (r.policies[0]) setPolicyId(r.policies[0].id);
      });
      api.get<{ providers: Provider[] }>("/providers").then((r) => setProviders(r.providers));
    }
  }, [isProvider]);

  async function lookupPolicy() {
    setLookupError("");
    setLookedUpPolicy(null);
    try {
      const res = await api.get<{ policy: Policy }>(`/policies/lookup/${encodeURIComponent(policyNumberLookup)}`);
      setLookedUpPolicy(res.policy);
      setPolicyId(res.policy.id);
    } catch (err) {
      setLookupError(err instanceof ApiError ? err.message : "Lookup failed");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!policyId) return setError("Select a policy first.");
    if (!isProvider && !providerId) return setError("Select the treating hospital.");
    setSubmitting(true);
    try {
      const res = await api.post<{ claim: Claim }>("/claims", {
        policyId,
        providerId: isProvider ? undefined : providerId,
        type,
        diagnosis,
        icdCode,
        admissionDate: new Date(admissionDate).toISOString(),
        dischargeDate: dischargeDate ? new Date(dischargeDate).toISOString() : null,
        claimedAmount: Number(claimedAmount),
      });
      if (fileName && extractedText) {
        await api.post(`/claims/${res.claim.id}/documents`, { docType, fileName, extractedText });
      }
      navigate(`/claims/${res.claim.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-medium text-ink">
        {isProvider ? "Submit a claim on behalf of a patient" : "File a claim"}
      </h1>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader title={isProvider ? "Patient policy" : "Your policy"} eyebrow="Step 1" />
          <div className="space-y-4 px-5 py-5">
            {isProvider ? (
              <>
                <Field label="Policy number">
                  <div className="flex gap-2">
                    <input
                      value={policyNumberLookup}
                      onChange={(e) => setPolicyNumberLookup(e.target.value)}
                      placeholder="CST/HLT/2026/850810"
                      className="input flex-1"
                    />
                    <Button type="button" variant="ghost" onClick={lookupPolicy}>
                      Look up
                    </Button>
                  </div>
                  {lookupError && <div className="mt-2 text-sm text-rose">{lookupError}</div>}
                </Field>
                {lookedUpPolicy && (
                  <div className="rounded-lg border border-teal/25 bg-teal-pale px-4 py-3 text-sm text-ink">
                    <div className="font-medium">{lookedUpPolicy.member?.name}</div>
                    <div className="text-ink-500">
                      {lookedUpPolicy.planName} · {lookedUpPolicy.insurer} · Sum insured{" "}
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                        lookedUpPolicy.sumInsured,
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Field label="Policy">
                  <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="input">
                    {policies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.planName} — {p.policyNumber}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Treating hospital (network)">
                  <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="input">
                    <option value="">Select a hospital…</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.city}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Claim details" eyebrow="Step 2" />
          <div className="grid grid-cols-2 gap-4 px-5 py-5">
            <Field label="Claim type">
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="input">
                <option value="REIMBURSEMENT">Reimbursement</option>
                <option value="CASHLESS">Cashless / pre-authorisation</option>
              </select>
            </Field>
            <Field label="Claimed amount (INR)">
              <input
                type="number"
                required
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Diagnosis">
              <input required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="input" />
            </Field>
            <Field label="ICD-10 code">
              <input required value={icdCode} onChange={(e) => setIcdCode(e.target.value)} className="input" placeholder="e.g. A90" />
            </Field>
            <Field label="Admission date">
              <input type="date" required value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className="input" />
            </Field>
            <Field label="Discharge date (optional)">
              <input type="date" value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} className="input" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Attach a document (optional)" eyebrow="Step 3" />
          <div className="space-y-4 px-5 py-5">
            <p className="text-xs text-ink-300">
              This demo simulates document upload + OCR extraction — paste the document text below instead of uploading a
              file, and the AI reviewer will read it exactly as if it had been scanned.
            </p>
            <Field label="Document type">
              <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="input">
                {DOC_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="File name">
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="discharge_summary.pdf" className="input" />
            </Field>
            <Field label="Document text">
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={5}
                className="input"
                placeholder="Paste the discharge summary / bill text here…"
              />
            </Field>
          </div>
        </Card>

        {error && <div className="rounded-lg bg-rose-pale px-3 py-2 text-sm text-rose">{error}</div>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit claim"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">{label}</span>
      {children}
    </label>
  );
}
