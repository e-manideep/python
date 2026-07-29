import { generateClaimNumber, generateHealthId, generateMrn, generatePolicyNumber, uid } from "../lib/ids";
import { daysAgoIso, daysFromNowIso } from "../lib/format";
import * as repo from "./repositories";
import type {
  Allergy,
  Claim,
  Encounter,
  Medication,
  Patient,
  Policy,
  Problem,
  Referral,
  VitalsReading,
} from "./types";

const STAR_WORDING = `Family Health Optima Gold — Star Health & Allied Insurance. Sum insured INR 5,00,000 floater.
Hospitalisation: in-patient treatment exceeding 24 hours. Room rent up to 1% of sum insured/day (max INR 5,000); ICU 2%/day.
Pre-hospitalisation covered 30 days before admission, post-hospitalisation 60 days after discharge.
Co-payment: nil below age 60; 10% for insured members 60 or above at time of hospitalisation.
Waiting periods: 30 days general illness; pre-existing conditions after 36 months continuous cover; specified illnesses
(including renal complications of diabetes) after 24 months. Exclusions: cosmetic treatment, unproven therapies, and any
claim in the first 30 days other than accidental injury.`;

const HDFC_WORDING = `Optima Secure — HDFC ERGO General Insurance. Sum insured INR 5,00,000 with an automatic Secure Benefit
that restores the full sum insured once per policy year if exhausted by an unrelated illness.
Room rent: single private AC room, no sub-limit at network hospitals. Pre-hospitalisation covered 60 days,
post-hospitalisation 180 days for the same illness. Co-payment: 10% for members aged 61+ at entry, nil otherwise.
Day-care procedures requiring under 24-hour admission are covered in full with a treating doctor's certificate of
medical necessity, including arthroscopic and minimally invasive orthopaedic procedures.
Waiting periods: 30 days general illness; 24 months for listed specific illnesses (joint replacement, arthroscopy,
cataract, hernia); 48 months for declared pre-existing conditions. Claim intimation: cashless pre-authorisation at
least 48 hours before a planned admission.`;

// Guards against React StrictMode's double-invoked effects (and any other
// accidental double-call) racing each other before either has persisted
// `seeded: true` — without this, two concurrent calls both see `seeded:
// false` and both seed, producing duplicate patients.
let seedingPromise: Promise<void> | null = null;

export function seedIfEmpty(): Promise<void> {
  if (!seedingPromise) seedingPromise = runSeed();
  return seedingPromise;
}

async function runSeed() {
  const s = await repo.settings.get();
  if (s.seeded) return;

  const now = new Date();

  // ---------------------------------------------------------------- Rohan
  const rohan: Patient = {
    id: uid(),
    mrn: generateMrn(),
    healthId: generateHealthId(),
    name: "Rohan Iyer",
    dob: "1973-03-14",
    gender: "Male",
    phone: "+91 98200 11234",
    city: "Bengaluru",
    photoInitials: "RI",
    createdAt: daysAgoIso(400),
  };
  await repo.patients.upsert(rohan);
  await addProblem(rohan.id, "Type 2 diabetes mellitus", "E11.9", daysAgoIso(390));
  await addProblem(rohan.id, "Essential hypertension", "I10", daysAgoIso(390));
  await addMed(rohan.id, "Metformin", "500 mg", "Twice daily", "Oral", daysAgoIso(390));
  await addMed(rohan.id, "Amlodipine", "5 mg", "Once daily", "Oral", daysAgoIso(200));
  await addAllergy(rohan.id, "Penicillin", "Diffuse rash", "MODERATE");
  await addVitals(rohan.id, daysAgoIso(390), 138, 88, 78, 36.8, 98, 84);
  await addVitals(rohan.id, daysAgoIso(200), 142, 90, 80, 36.7, 98, 85);
  await addVitals(rohan.id, daysAgoIso(30), 146, 92, 82, 36.6, 97, 86);
  await repo.encounters.upsert({
    id: uid(),
    patientId: rohan.id,
    clinicianName: "Dr. Meera Krishnan",
    type: "New Patient",
    scheduledAt: daysAgoIso(390),
    durationMin: 30,
    status: "COMPLETED",
    chiefComplaint: "New diagnosis of type 2 diabetes, referred from annual screening",
    transcript: "",
    noteStatus: "SIGNED",
    signedAt: daysAgoIso(390),
    note: {
      subjective:
        "52-year-old male presents after an abnormal fasting glucose on routine screening (162 mg/dL). Reports increased thirst and nocturia over the past 2 months, no visual changes, no weight loss. Family history of T2DM (father). No prior diabetes diagnosis.",
      objective:
        "BP 138/88, HR 78, BMI 27.4. HbA1c 7.8%. Fasting glucose 158 mg/dL. Random lipid panel: LDL 132, HDL 42, TG 180. Foot exam: intact sensation, pulses 2+ bilaterally. No retinopathy on fundoscopy.",
      assessment:
        "New type 2 diabetes mellitus, HbA1c 7.8% — moderate control target needed. Concurrent essential hypertension, currently untreated.",
      plan:
        "Start metformin 500 mg BD, titrate as tolerated. Start amlodipine 5 mg OD for BP control. Diabetic diet and exercise counselling provided. Ophthalmology referral for baseline retinal exam. Recheck HbA1c and BMP in 3 months. Discussed hypoglycaemia warning signs.",
      icdSuggestions: [
        { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
        { code: "I10", label: "Essential (primary) hypertension" },
      ],
      afterVisitSummary:
        "Your blood sugar test showed early type 2 diabetes, and your blood pressure was a little high. We've started two medicines — metformin for your sugar and amlodipine for your blood pressure — and made a plan to check your levels again in 3 months. Small changes to diet and regular walks will help a lot. Call us if you feel unusually shaky, sweaty, or dizzy.",
    },
  });
  const rohanToday: Encounter = {
    id: uid(),
    patientId: rohan.id,
    clinicianName: "Dr. Meera Krishnan",
    type: "Follow-up",
    scheduledAt: new Date(now.setHours(10, 30, 0, 0)).toISOString(),
    durationMin: 20,
    status: "IN_PROGRESS",
    chiefComplaint: "Routine diabetes and hypertension follow-up, mild fatigue",
    transcript: "",
    note: null,
    noteStatus: "NONE",
  };
  await repo.encounters.upsert(rohanToday);
  const rohanPolicy: Policy = {
    id: uid(),
    patientId: rohan.id,
    policyNumber: generatePolicyNumber(),
    insurer: "HDFC ERGO General Insurance",
    planName: "Optima Secure",
    sumInsured: 500000,
    copayPercent: 0,
    roomRentLimit: "Single private AC room, no sub-limit",
    policyWording: HDFC_WORDING,
  };
  await repo.policies.add(rohanPolicy);
  await repo.patients.upsert({ ...rohan, policyId: rohanPolicy.id });

  // ---------------------------------------------------------------- Priya
  const priya: Patient = {
    id: uid(),
    mrn: generateMrn(),
    healthId: generateHealthId(),
    name: "Priya Nair",
    dob: "1991-08-02",
    gender: "Female",
    phone: "+91 90080 55621",
    city: "Bengaluru",
    photoInitials: "PN",
    createdAt: daysAgoIso(2),
  };
  await repo.patients.upsert(priya);
  await addProblem(priya.id, "Migraine without aura", "G43.0", daysAgoIso(700));
  await addMed(priya.id, "Sumatriptan", "50 mg", "As needed for migraine", "Oral", daysAgoIso(700));
  await repo.encounters.upsert({
    id: uid(),
    patientId: priya.id,
    clinicianName: "Dr. Meera Krishnan",
    type: "New Patient",
    scheduledAt: daysFromNowIso(1, 14),
    durationMin: 30,
    status: "SCHEDULED",
    chiefComplaint: "Increasing migraine frequency, wants preventive options",
    transcript: "",
    note: null,
    noteStatus: "NONE",
    noShowRisk: 12,
  });

  // ---------------------------------------------------------------- Arjun (pediatric)
  const arjun: Patient = {
    id: uid(),
    mrn: generateMrn(),
    healthId: generateHealthId(),
    name: "Arjun Mehta",
    dob: "2017-11-20",
    gender: "Male",
    phone: "+91 98450 22110",
    city: "Bengaluru",
    photoInitials: "AM",
    createdAt: daysAgoIso(500),
  };
  await repo.patients.upsert(arjun);
  await addProblem(arjun.id, "Mild persistent asthma", "J45.30", daysAgoIso(450));
  await addMed(arjun.id, "Fluticasone propionate inhaler", "44 mcg", "Twice daily", "Inhaled", daysAgoIso(450));
  await addMed(arjun.id, "Albuterol inhaler", "90 mcg", "As needed", "Inhaled", daysAgoIso(450));
  await addAllergy(arjun.id, "Dust mites", "Wheeze, nasal congestion", "MILD");
  await repo.encounters.upsert({
    id: uid(),
    patientId: arjun.id,
    clinicianName: "Dr. Meera Krishnan",
    type: "Follow-up",
    scheduledAt: daysAgoIso(14),
    durationMin: 20,
    status: "COMPLETED",
    chiefComplaint: "Asthma follow-up, guardian reports good control",
    transcript: "",
    noteStatus: "SIGNED",
    signedAt: daysAgoIso(14),
    note: {
      subjective:
        "8-year-old male, accompanied by mother. No wheeze or nighttime cough in the past 6 weeks. Using albuterol roughly once a month, mostly after outdoor sports. Adherent to daily fluticasone. No recent ER visits.",
      objective: "RR 18, SpO2 99% on room air. Chest clear to auscultation, no wheeze. Growth on track for age.",
      assessment: "Mild persistent asthma, well controlled on current regimen.",
      plan:
        "Continue fluticasone 44 mcg BD and albuterol PRN. Reinforce spacer technique. Reviewed dust-mite avoidance measures for the bedroom. Follow-up in 3 months or sooner if symptoms worsen.",
      icdSuggestions: [{ code: "J45.30", label: "Mild persistent asthma, uncomplicated" }],
      afterVisitSummary:
        "Arjun's asthma is well controlled — no need to change his inhalers. Keep using the daily inhaler every morning and night, and the rescue inhaler only if he's wheezy or short of breath. Next check-up in about 3 months.",
    },
  });
  await repo.encounters.upsert({
    id: uid(),
    patientId: arjun.id,
    clinicianName: "Dr. Meera Krishnan",
    type: "Follow-up",
    scheduledAt: daysFromNowIso(76, 15),
    durationMin: 20,
    status: "SCHEDULED",
    chiefComplaint: "Routine asthma follow-up",
    transcript: "",
    note: null,
    noteStatus: "NONE",
    noShowRisk: 22,
  });

  // ---------------------------------------------------------------- Lakshmi
  const lakshmi: Patient = {
    id: uid(),
    mrn: generateMrn(),
    healthId: generateHealthId(),
    name: "Lakshmi Subramaniam",
    dob: "1954-06-30",
    gender: "Female",
    phone: "+91 94480 33127",
    city: "Bengaluru",
    photoInitials: "LS",
    createdAt: daysAgoIso(900),
  };
  await repo.patients.upsert(lakshmi);
  await addProblem(lakshmi.id, "Chronic kidney disease, stage 3", "N18.3", daysAgoIso(600));
  await addProblem(lakshmi.id, "Type 2 diabetes mellitus", "E11.9", daysAgoIso(900));
  await addProblem(lakshmi.id, "Essential hypertension", "I10", daysAgoIso(900));
  await addProblem(lakshmi.id, "Hyperlipidemia", "E78.5", daysAgoIso(900));
  await addMed(lakshmi.id, "Linagliptin", "5 mg", "Once daily", "Oral", daysAgoIso(600));
  await addMed(lakshmi.id, "Amlodipine", "10 mg", "Once daily", "Oral", daysAgoIso(600));
  await addMed(lakshmi.id, "Atorvastatin", "20 mg", "Once daily at night", "Oral", daysAgoIso(900));
  await addMed(lakshmi.id, "Furosemide", "20 mg", "Once daily", "Oral", daysAgoIso(20));
  await addMed(lakshmi.id, "Calcium carbonate", "500 mg", "With meals", "Oral", daysAgoIso(20));
  await addAllergy(lakshmi.id, "Sulfonamides", "Anaphylaxis", "SEVERE");
  await addVitals(lakshmi.id, daysAgoIso(20), 148, 86, 76, 36.9, 96, 61);
  const lakshmiEnc: Encounter = {
    id: uid(),
    patientId: lakshmi.id,
    clinicianName: "Dr. Meera Krishnan",
    type: "Follow-up",
    scheduledAt: daysAgoIso(18),
    durationMin: 30,
    status: "COMPLETED",
    chiefComplaint: "Post-discharge follow-up after AKI-on-CKD admission",
    transcript: "",
    noteStatus: "SIGNED",
    signedAt: daysAgoIso(18),
    note: {
      subjective:
        "71-year-old female, 5 days post-discharge following a 4-day admission for acute kidney injury on background CKD stage 3, precipitated by dehydration during a gastroenteritis episode. Reports improved energy, tolerating oral fluids well, no dysuria, no oedema.",
      objective:
        "BP 148/86, HR 76, weight 61 kg (up 1.5 kg from discharge, appropriate rehydration). Repeat creatinine 1.6 mg/dL, improved from 2.4 mg/dL at admission, trending toward her baseline of 1.4. No peripheral oedema.",
      assessment:
        "Resolving acute kidney injury on chronic kidney disease stage 3, back near baseline renal function. Diabetes and hypertension both stable on current regimen.",
      plan:
        "Continue furosemide 20 mg OD, added at discharge for volume management — reassess need at next visit. Hold metformin (discontinued during admission, replaced with linagliptin, appropriate given renal function — do not restart metformin below current eGFR). Nephrology follow-up referral placed. Repeat BMP in 2 weeks. Advised on sick-day rules to prevent recurrent AKI during future GI illness.",
      icdSuggestions: [
        { code: "N17.9", label: "Acute kidney injury, resolving" },
        { code: "N18.3", label: "Chronic kidney disease, stage 3" },
      ],
      afterVisitSummary:
        "Your kidney function is recovering well after your hospital stay. Please keep taking your new water tablet and the diabetes tablet we switched you to — do not go back to the old metformin tablets. We've booked you in with a kidney specialist, and if you ever have vomiting or diarrhoea again, please call us early so we can help you avoid another hospital stay.",
    },
  };
  await repo.encounters.upsert(lakshmiEnc);
  await repo.referrals.add({
    id: uid(),
    patientId: lakshmi.id,
    encounterId: lakshmiEnc.id,
    toSpecialty: "Nephrology",
    toProvider: "Dr. Suresh Kumar, Manipal Hospitals",
    reason: "Recent AKI on CKD stage 3, for renal function optimisation and long-term nephrology co-management.",
    letter:
      "Referring Lakshmi Subramaniam (71F, MRN on file) for nephrology evaluation following a recent admission for acute kidney injury superimposed on CKD stage 3, precipitated by volume depletion during a gastroenteritis episode. Creatinine improved from 2.4 to 1.6 mg/dL with fluid resuscitation, trending toward her baseline of 1.4. Metformin has been discontinued and replaced with linagliptin. Currently on amlodipine, atorvastatin, and furosemide 20 mg OD started at discharge for volume management. Would appreciate your assessment of long-term CKD trajectory and medication optimisation, and guidance on furosemide continuation.",
    status: "SCHEDULED",
    createdAt: daysAgoIso(18),
  });
  const lakshmiPolicy: Policy = {
    id: uid(),
    patientId: lakshmi.id,
    policyNumber: generatePolicyNumber(),
    insurer: "Star Health & Allied Insurance",
    planName: "Family Health Optima Gold",
    sumInsured: 500000,
    copayPercent: 10,
    roomRentLimit: "1% of sum insured/day (max ₹5,000); ICU 2%/day",
    policyWording: STAR_WORDING,
  };
  await repo.policies.add(lakshmiPolicy);
  await repo.patients.upsert({ ...lakshmi, policyId: lakshmiPolicy.id });
  await repo.claims.add({
    id: uid(),
    claimNumber: generateClaimNumber(),
    patientId: lakshmi.id,
    encounterId: lakshmiEnc.id,
    policyId: lakshmiPolicy.id,
    claimedAmount: 185000,
    approvedAmount: null,
    status: "UNDER_REVIEW",
    aiSummary: {
      summary:
        "4-day admission for acute kidney injury on CKD stage 3, precipitated by dehydration during gastroenteritis, treated with IV fluids and temporary medication adjustment.",
      keyFacts: [
        "Creatinine improved from 2.4 to 1.6 mg/dL during admission",
        "Metformin discontinued, switched to linagliptin — appropriate for renal function",
        "Age 71, co-pay of 10% applies per policy terms for members 60+",
      ],
      flags: [],
    },
    aiRisk: {
      riskScore: 14,
      riskLevel: "LOW",
      reasons: [
        "Length of stay and itemised charges are consistent with an AKI admission of this severity",
        "Clinical documentation directly supports the billed diagnosis and treatment",
      ],
    },
    aiRecommendation: null,
    history: [
      { status: "SUBMITTED", note: "Claim submitted for processing.", actor: "Hospital billing desk", createdAt: daysAgoIso(17) },
      { status: "AI_TRIAGED", note: "AI case summary and risk assessment generated.", actor: "System", createdAt: daysAgoIso(16) },
      { status: "UNDER_REVIEW", note: "Awaiting final adjudication recommendation.", actor: "System", createdAt: daysAgoIso(16) },
    ],
    submittedAt: daysAgoIso(17),
  });

  // ---------------------------------------------------------------- Kabir
  const kabir: Patient = {
    id: uid(),
    mrn: generateMrn(),
    healthId: generateHealthId(),
    name: "Kabir Singh",
    dob: "1979-01-18",
    gender: "Male",
    phone: "+91 99000 88214",
    city: "Bengaluru",
    photoInitials: "KS",
    createdAt: daysAgoIso(60),
  };
  await repo.patients.upsert(kabir);
  await addProblem(kabir.id, "Post-operative right knee pain, improving", "M25.561", daysAgoIso(35));
  await addMed(kabir.id, "Naproxen", "500 mg", "Twice daily as needed", "Oral", daysAgoIso(35));
  const kabirEnc: Encounter = {
    id: uid(),
    patientId: kabir.id,
    clinicianName: "Dr. Meera Krishnan",
    type: "Follow-up",
    scheduledAt: daysAgoIso(7),
    durationMin: 20,
    status: "COMPLETED",
    chiefComplaint: "2-week post-op follow-up after right knee arthroscopy",
    transcript: "",
    noteStatus: "SIGNED",
    signedAt: daysAgoIso(7),
    note: {
      subjective:
        "45-year-old male, 2 weeks post right knee arthroscopic meniscus repair. Pain improved from 7/10 to 3/10. Weight-bearing as tolerated with crutches, using them less each day. No fever, no wound drainage, no calf swelling.",
      objective:
        "Incision sites clean, dry, healing well. Knee ROM 0-100 degrees, mild effusion. Negative Homans' sign. Quadriceps activation improving.",
      assessment: "Expected post-operative recovery course, no signs of infection or DVT.",
      plan:
        "Continue naproxen PRN for pain, wean off crutches over the next week as tolerated. Referral to physiotherapy for structured rehabilitation placed today. Recheck in 4 weeks, sooner if increased pain, swelling, or fever.",
      icdSuggestions: [{ code: "M25.561", label: "Pain in right knee" }],
      afterVisitSummary:
        "Your knee is healing on track — the swelling and pain are both improving as expected. Start easing off the crutches over the next week, and we've set you up with physiotherapy to help you regain full strength and movement.",
    },
  };
  await repo.encounters.upsert(kabirEnc);
  await repo.referrals.add({
    id: uid(),
    patientId: kabir.id,
    encounterId: kabirEnc.id,
    toSpecialty: "Physiotherapy",
    toProvider: "Bengaluru Sports Physio Clinic",
    reason: "Structured post-arthroscopy rehabilitation for right knee meniscus repair.",
    letter:
      "Referring Kabir Singh (45M) for physiotherapy following right knee arthroscopic meniscus repair 2 weeks ago. Currently weight-bearing as tolerated, weaning off crutches, ROM 0-100 degrees with mild effusion, no signs of infection or DVT. Please initiate a structured quadriceps strengthening and ROM restoration programme, progressing as tolerated.",
    status: "SENT",
    createdAt: daysAgoIso(7),
  });
  const kabirPolicy: Policy = {
    id: uid(),
    patientId: kabir.id,
    policyNumber: generatePolicyNumber(),
    insurer: "HDFC ERGO General Insurance",
    planName: "Optima Secure",
    sumInsured: 500000,
    copayPercent: 0,
    roomRentLimit: "Single private AC room, no sub-limit",
    policyWording: HDFC_WORDING,
  };
  await repo.policies.add(kabirPolicy);
  await repo.patients.upsert({ ...kabir, policyId: kabirPolicy.id });
  await repo.claims.add({
    id: uid(),
    claimNumber: generateClaimNumber(),
    patientId: kabir.id,
    encounterId: kabirEnc.id,
    policyId: kabirPolicy.id,
    claimedAmount: 240000,
    approvedAmount: 240000,
    status: "APPROVED",
    aiSummary: {
      summary: "Elective right knee arthroscopic meniscus repair, day-care procedure with uncomplicated recovery.",
      keyFacts: ["Arthroscopic procedure, under 24-hour admission", "No complications noted at pre-auth or follow-up"],
      flags: [],
    },
    aiRisk: { riskScore: 9, riskLevel: "LOW", reasons: ["Cost and procedure type both typical for this surgery at this network tier"] },
    aiRecommendation: {
      recommendation: "APPROVE",
      approvedAmount: 240000,
      justification:
        "Day-care arthroscopic procedure explicitly covered under the policy's day-care benefit with a treating doctor's certificate of medical necessity on file. No sub-limits breached.",
      clauses: ["Day-care procedures requiring under 24-hour admission are covered in full with a treating doctor's certificate of medical necessity, including arthroscopic and minimally invasive orthopaedic procedures."],
    },
    history: [
      { status: "SUBMITTED", note: "Cashless pre-authorisation requested.", actor: "Hospital billing desk", createdAt: daysAgoIso(36) },
      { status: "AI_TRIAGED", note: "AI case summary and risk assessment generated.", actor: "System", createdAt: daysAgoIso(36) },
      { status: "APPROVED", note: "Approved in full — day-care benefit applies, no exclusions triggered.", actor: "Dr. Meera Krishnan", createdAt: daysAgoIso(35) },
    ],
    submittedAt: daysAgoIso(36),
  });

  // ---------------------------------------------------------------- messages
  await repo.messages.add({
    id: uid(),
    patientId: rohan.id,
    from: "patient",
    content: "Is it okay to take my metformin if I'm fasting for a blood test tomorrow morning?",
    createdAt: daysAgoIso(3),
  });
  await repo.messages.add({
    id: uid(),
    patientId: rohan.id,
    from: "clinician",
    content: "Good question — skip your morning metformin dose the day of the fasting test, and take it as usual once you've eaten afterward. See you at your follow-up soon.",
    createdAt: daysAgoIso(3),
  });

  await repo.settings.update({ seeded: true });
}

async function addProblem(patientId: string, description: string, icdCode: string, onsetDate: string) {
  const p: Problem = { id: uid(), patientId, description, icdCode, status: "ACTIVE", onsetDate, source: "MANUAL" };
  await repo.problems.add(p);
}
async function addMed(patientId: string, name: string, dose: string, frequency: string, route: string, startDate: string) {
  const m: Medication = { id: uid(), patientId, name, dose, frequency, route, status: "ACTIVE", startDate };
  await repo.medications.add(m);
}
async function addAllergy(patientId: string, substance: string, reaction: string, severity: Allergy["severity"]) {
  const a: Allergy = { id: uid(), patientId, substance, reaction, severity };
  await repo.allergies.add(a);
}
async function addVitals(
  patientId: string,
  takenAt: string,
  systolic: number,
  diastolic: number,
  heartRate: number,
  tempC: number,
  spo2: number,
  weightKg: number,
) {
  const v: VitalsReading = { id: uid(), patientId, takenAt, systolic, diastolic, heartRate, tempC, spo2, weightKg };
  await repo.vitals.add(v);
}
