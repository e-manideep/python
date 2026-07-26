import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  generateClaimNumber,
  generateHealthId,
  generatePolicyNumber,
  generateProviderCode,
} from "../src/lib/ids.js";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const PASSWORD = "demo1234";

const STAR_HEALTH_WORDING = `Family Health Optima Gold — Star Health & Allied Insurance.
Sum insured: INR 10,00,000 per policy year (floater across all listed family members).
Hospitalisation cover: in-patient treatment exceeding 24 continuous hours at a registered hospital.
Room rent: eligible up to 1% of sum insured per day (max INR 10,000); ICU up to 2% of sum insured per day.
Pre-hospitalisation expenses covered for 30 days before admission; post-hospitalisation for 60 days after discharge.
Day care procedures: 180+ listed procedures not requiring 24-hour admission are covered in full (e.g. cataract, dialysis,
chemotherapy, lithotripsy).
Co-payment: Nil for members below 60 years; 10% co-payment applies for any insured member aged 60 or above at the time
of hospitalisation.
Waiting periods: 30-day initial waiting period for all illnesses except accidents; pre-existing diseases covered after
36 continuous months of coverage; specific ailments (hernia, cataract, joint replacement, kidney stones) after 24 months.
No claim bonus: 5% cumulative increase in sum insured per claim-free year, up to 50%.
Exclusions: cosmetic or aesthetic treatment, dental treatment unless due to accident, congenital external conditions,
treatment taken outside India, and any claim within the first 30 days other than accidental injury.
Network: cashless treatment available only at hospitals on the Star Health network list; reimbursement claims must be
filed within 15 days of discharge with original bills, discharge summary, and investigation reports.`;

const HDFC_ERGO_WORDING = `Optima Secure — HDFC ERGO General Insurance.
Sum insured: INR 5,00,000 with an automatic "Secure Benefit" that restores the full sum insured once per year if it is
exhausted by a claim, for unrelated illnesses.
Room rent: single private AC room, no sub-limit as long as treatment is at a network hospital.
Pre-hospitalisation covered for 60 days, post-hospitalisation for 180 days — expenses directly related to the same
illness only.
Co-payment: 10% on all admissible claims for insured members aged 61 and above at entry; nil otherwise.
Waiting periods: 30 days for illness (waived for accidents); 24 months for listed specific illnesses (cataract, hernia,
piles, ENT/nasal conditions, joint replacement); 48 months for pre-existing diseases declared at inception.
Day care treatment: all procedures that medically require less than 24-hour admission due to technological advancement
are covered, subject to a doctor's certificate of medical necessity.
Exclusions: unproven or experimental treatment, cosmetic surgery not necessitated by accident, self-inflicted injury,
treatment for obesity/weight control, and claims arising during the first 30 days of the policy except for accidents.
Claim intimation: cashless pre-authorisation must be raised at least 48 hours before a planned admission, or within 24
hours for an emergency; reimbursement claims must be submitted within 30 days of discharge.`;

async function main() {
  console.log("Seeding ClaimSetu demo data…");

  // ── Providers ────────────────────────────────────────────────────────
  const yashoda = await prisma.provider.create({
    data: {
      providerCode: generateProviderCode("HYD"),
      name: "Yashoda Hospitals, Somajiguda",
      city: "Hyderabad",
      tier: "Multi-specialty · NABH Accredited",
      specialties: JSON.stringify(["General Medicine", "Orthopaedics", "Infectious Disease", "Surgery"]),
    },
  });
  const manipal = await prisma.provider.create({
    data: {
      providerCode: generateProviderCode("BLR"),
      name: "Manipal Hospitals, HAL Airport Road",
      city: "Bengaluru",
      tier: "Multi-specialty · NABH Accredited",
      specialties: JSON.stringify(["Ophthalmology", "Cardiology", "General Surgery"]),
    },
  });
  const apollo = await prisma.provider.create({
    data: {
      providerCode: generateProviderCode("CHN"),
      name: "Apollo Hospitals, Greams Road",
      city: "Chennai",
      tier: "Quaternary Care · NABH Accredited",
      specialties: JSON.stringify(["Internal Medicine", "Pulmonology"]),
    },
  });
  const fortis = await prisma.provider.create({
    data: {
      providerCode: generateProviderCode("DEL"),
      name: "Fortis Escorts Heart Institute",
      city: "New Delhi",
      tier: "Cardiac Super-specialty · NABH Accredited",
      specialties: JSON.stringify(["Cardiology", "Cardiothoracic Surgery"]),
    },
  });

  // ── Users ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const memberUser1 = await prisma.user.create({
    data: {
      email: "member@demo.claimsetu.in",
      passwordHash,
      name: "Ananya Rao",
      role: "MEMBER",
      member: {
        create: {
          healthId: generateHealthId(),
          name: "Ananya Rao",
          dob: new Date("1988-04-12"),
          gender: "Female",
          phone: "+91 98765 43210",
          city: "Hyderabad",
        },
      },
    },
    include: { member: true },
  });

  const memberUser2 = await prisma.user.create({
    data: {
      email: "vikram@demo.claimsetu.in",
      passwordHash,
      name: "Vikram Nair",
      role: "MEMBER",
      member: {
        create: {
          healthId: generateHealthId(),
          name: "Vikram Nair",
          dob: new Date("1979-11-02"),
          gender: "Male",
          phone: "+91 98450 11223",
          city: "Bengaluru",
        },
      },
    },
    include: { member: true },
  });

  await prisma.user.create({
    data: {
      email: "provider@demo.claimsetu.in",
      passwordHash,
      name: "Yashoda Hospitals — TPA Desk",
      role: "PROVIDER",
      providerOf: { connect: { id: yashoda.id } },
    },
  });

  const opsUser = await prisma.user.create({
    data: {
      email: "ops@demo.claimsetu.in",
      passwordHash,
      name: "Rahul Menon",
      role: "INSURER_OPS",
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@demo.claimsetu.in",
      passwordHash,
      name: "ClaimSetu Admin",
      role: "ADMIN",
    },
  });

  // ── Policies ─────────────────────────────────────────────────────────
  const policy1 = await prisma.policy.create({
    data: {
      policyNumber: generatePolicyNumber(),
      memberId: memberUser1.member!.id,
      insurer: "Star Health & Allied Insurance",
      planName: "Family Health Optima Gold",
      planTier: "Gold Floater",
      sumInsured: 1_000_000,
      premium: 18_500,
      roomRentLimit: "1% of sum insured/day (max ₹10,000); ICU 2%/day",
      copayPercent: 0,
      startDate: daysAgo(210),
      endDate: daysAgo(210 - 365),
      networkHospitals: JSON.stringify([yashoda.name, manipal.name, apollo.name]),
      policyWording: STAR_HEALTH_WORDING,
      dependents: {
        create: [
          { name: "Karthik Rao", relation: "Spouse", dob: new Date("1986-02-20") },
          { name: "Diya Rao", relation: "Daughter", dob: new Date("2016-07-09") },
        ],
      },
    },
  });

  const policy2 = await prisma.policy.create({
    data: {
      policyNumber: generatePolicyNumber(),
      memberId: memberUser2.member!.id,
      insurer: "HDFC ERGO General Insurance",
      planName: "Optima Secure",
      planTier: "Standard",
      sumInsured: 500_000,
      premium: 9_800,
      roomRentLimit: "Single Private AC Room, no sub-limit in-network",
      copayPercent: 10,
      startDate: daysAgo(140),
      endDate: daysAgo(140 - 365),
      networkHospitals: JSON.stringify([manipal.name, apollo.name, fortis.name]),
      policyWording: HDFC_ERGO_WORDING,
      dependents: { create: [] },
    },
  });

  // ── Claims ───────────────────────────────────────────────────────────

  // 1. Settled reimbursement — full AI trail already on file (historical, for analytics)
  const claim1 = await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: policy1.id,
      providerId: yashoda.id,
      type: "REIMBURSEMENT",
      diagnosis: "Dengue fever with thrombocytopenia",
      icdCode: "A90",
      admissionDate: daysAgo(22),
      dischargeDate: daysAgo(18),
      claimedAmount: 85_000,
      approvedAmount: 78_500,
      status: "SETTLED",
      submittedAt: daysAgo(17),
      aiSummary: JSON.stringify({
        summary:
          "Ananya Rao was admitted for 4 days with dengue fever and low platelet count, treated with IV fluids and platelet monitoring, and discharged in stable condition.",
        keyFacts: ["4-day in-patient stay", "Platelet transfusion not required", "Discharged afebrile and stable"],
        flags: [],
      }),
      aiRisk: JSON.stringify({ riskScore: 8, riskLevel: "LOW", reasons: ["Length of stay and cost both align with typical dengue admissions in this city"] }),
      aiRecommendation: JSON.stringify({
        recommendation: "PARTIALLY_APPROVE",
        approvedAmount: 78_500,
        justification:
          "Claim is consistent with policy coverage for in-patient dengue treatment. INR 6,500 of non-medical items (admin kit, food charges for attendant) deducted per standard exclusions.",
        clauses: ["Hospitalisation cover for in-patient treatment exceeding 24 hours", "Non-medical/consumable items are not payable"],
      }),
      statusHistory: {
        create: [
          { status: "SUBMITTED", note: "Claim submitted for processing.", actorRole: "MEMBER", actorName: "Ananya Rao", createdAt: daysAgo(17) },
          { status: "AI_TRIAGED", note: "AI case summary and risk assessment generated.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(16) },
          { status: "UNDER_REVIEW", note: "Adjudicator reviewing AI-drafted recommendation.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(15) },
          { status: "APPROVED", note: "Approved for INR 78,500 after deducting non-medical charges per policy terms.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(14) },
          { status: "SETTLED", note: "Payment of INR 78,500 has been credited to your registered bank account.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(12) },
        ],
      },
      documents: {
        create: [
          {
            docType: "DISCHARGE_SUMMARY",
            fileName: "discharge_summary.pdf",
            extractedText:
              "Yashoda Hospitals — Discharge Summary. Patient: Ananya Rao, 37F. Admitted 22 days ago with fever, headache, low platelet count (72,000/µL). Diagnosis: Dengue fever (NS1 positive). Treated with IV fluids, antipyretics, platelet count monitored daily. Platelet count recovered to 165,000/µL. Discharged in stable, afebrile condition after 4 days with advice for rest and follow-up in 1 week.",
          },
          {
            docType: "HOSPITAL_BILL",
            fileName: "final_bill.pdf",
            extractedText:
              "Final Bill — Room rent (4 days, semi-private): INR 18,000. Investigations (CBC, NS1, dengue panel): INR 9,500. Pharmacy: INR 14,200. Doctor visits: INR 12,000. Nursing charges: INR 6,800. Admin/registration kit: INR 1,500. Attendant food charges: INR 5,000. IV fluids & consumables: INR 18,000. Total: INR 85,000.",
          },
        ],
      },
    },
  });

  // 2. Approved cashless — historical
  await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: policy1.id,
      providerId: yashoda.id,
      type: "CASHLESS",
      diagnosis: "Acute appendicitis",
      icdCode: "K35.8",
      admissionDate: daysAgo(6),
      dischargeDate: daysAgo(4),
      claimedAmount: 120_000,
      approvedAmount: 120_000,
      status: "APPROVED",
      submittedAt: daysAgo(6),
      aiSummary: JSON.stringify({
        summary: "Emergency laparoscopic appendectomy for acute appendicitis, uncomplicated 2-day recovery.",
        keyFacts: ["Emergency admission via ER", "Laparoscopic surgery, no complications", "2-day post-op stay"],
        flags: [],
      }),
      aiRisk: JSON.stringify({ riskScore: 6, riskLevel: "LOW", reasons: ["Standard cost and length of stay for laparoscopic appendectomy"] }),
      aiRecommendation: JSON.stringify({
        recommendation: "APPROVE",
        approvedAmount: 120_000,
        justification: "Emergency surgical hospitalisation fully covered; no sub-limits breached, no exclusions apply.",
        clauses: ["Hospitalisation cover for in-patient treatment exceeding 24 hours"],
      }),
      statusHistory: {
        create: [
          { status: "SUBMITTED", note: "Cashless pre-authorisation requested by hospital.", actorRole: "PROVIDER", actorName: "Yashoda Hospitals — TPA Desk", createdAt: daysAgo(6) },
          { status: "AI_TRIAGED", note: "AI case summary generated.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(6) },
          { status: "APPROVED", note: "Cashless authorisation approved in full for INR 1,20,000.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(5) },
        ],
      },
      documents: {
        create: [
          {
            docType: "PRE_AUTH_FORM",
            fileName: "pre_auth_request.pdf",
            extractedText:
              "Pre-authorisation request from Yashoda Hospitals. Patient presented to ER with severe right lower quadrant pain, fever 101F. Ultrasound confirms acute appendicitis. Emergency laparoscopic appendectomy planned. Estimated cost: INR 1,20,000.",
          },
        ],
      },
    },
  });

  // 3. Query raised — needs member response (live demo state)
  const claim3 = await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: policy1.id,
      providerId: yashoda.id,
      type: "REIMBURSEMENT",
      diagnosis: "Post-fracture physiotherapy",
      icdCode: "Z47.89",
      admissionDate: daysAgo(3),
      dischargeDate: daysAgo(3),
      claimedAmount: 8_000,
      status: "QUERY_RAISED",
      submittedAt: daysAgo(2),
      statusHistory: {
        create: [
          { status: "SUBMITTED", note: "Claim submitted for processing.", actorRole: "MEMBER", actorName: "Ananya Rao", createdAt: daysAgo(2) },
          {
            status: "QUERY_RAISED",
            note: "We need the original hospital-stamped bill — the copy on file is unstamped. Please upload and respond to the query on this claim.",
            actorRole: "INSURER_OPS",
            actorName: "Rahul Menon",
            createdAt: daysAgo(1),
          },
        ],
      },
      documents: {
        create: [
          {
            docType: "HOSPITAL_BILL",
            fileName: "physio_bill_unstamped.pdf",
            extractedText: "Physiotherapy session bill — 4 sessions x INR 2,000 = INR 8,000. (No hospital stamp visible on this copy.)",
          },
        ],
      },
      queries: {
        create: [{ question: "Could you upload the original hospital-stamped bill for the physiotherapy sessions?" }],
      },
    },
  });

  // 4. Fresh submission — the "walk through the live AI workflow" claim
  await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: policy1.id,
      providerId: yashoda.id,
      type: "REIMBURSEMENT",
      diagnosis: "Right knee osteoarthritis — total knee replacement",
      icdCode: "M17.11",
      admissionDate: daysAgo(1),
      dischargeDate: null,
      claimedAmount: 350_000,
      status: "SUBMITTED",
      submittedAt: daysAgo(1),
      statusHistory: {
        create: [
          { status: "SUBMITTED", note: "Claim submitted for processing.", actorRole: "MEMBER", actorName: "Ananya Rao", createdAt: daysAgo(1) },
        ],
      },
      documents: {
        create: [
          {
            docType: "DISCHARGE_SUMMARY",
            fileName: "admission_note.pdf",
            extractedText:
              "Yashoda Hospitals — Admission Note. Patient: Ananya Rao. Chronic right knee pain, X-ray confirms grade 4 osteoarthritis. Total knee replacement scheduled. Estimated 5-day admission. Orthopaedic surgeon: Dr. S. Prakash.",
          },
          {
            docType: "PRESCRIPTION",
            fileName: "pre_op_prescription.pdf",
            extractedText: "Pre-operative medication: Paracetamol 650mg BD, Pantoprazole 40mg OD, Enoxaparin 40mg SC OD (DVT prophylaxis).",
          },
        ],
      },
    },
  });

  // 5. Rejected (waiting period) — historical, Vikram's policy
  await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: policy2.id,
      providerId: manipal.id,
      type: "CASHLESS",
      diagnosis: "Age-related cataract, right eye",
      icdCode: "H25.11",
      admissionDate: daysAgo(60),
      dischargeDate: daysAgo(60),
      claimedAmount: 45_000,
      approvedAmount: 0,
      status: "REJECTED",
      submittedAt: daysAgo(60),
      aiSummary: JSON.stringify({
        summary: "Day-care cataract surgery (phacoemulsification) on the right eye, routine and uncomplicated.",
        keyFacts: ["Day-care procedure, discharged same day", "No pre-existing diabetic retinopathy noted"],
        flags: ["Policy start date is within the 24-month specific-illness waiting period for cataract"],
      }),
      aiRisk: JSON.stringify({ riskScore: 15, riskLevel: "LOW", reasons: ["Cost and procedure are typical for cataract surgery — the issue is eligibility, not fraud"] }),
      aiRecommendation: JSON.stringify({
        recommendation: "REJECT",
        approvedAmount: 0,
        justification:
          "Optima Secure applies a 24-month waiting period on cataract as a listed specific illness. Policy inception was 14 months ago, so this claim falls inside the waiting period.",
        clauses: ["24 months for listed specific illnesses (cataract, hernia, piles, ENT/nasal conditions, joint replacement)"],
      }),
      statusHistory: {
        create: [
          { status: "SUBMITTED", note: "Cashless pre-authorisation requested.", actorRole: "PROVIDER", actorName: "Manipal Hospitals", createdAt: daysAgo(60) },
          {
            status: "REJECTED",
            note: "We're unable to approve this claim. Your policy has a 24-month waiting period on cataract surgery, and your cover started 14 months ago. You'll be eligible to claim for this after month 24 of continuous coverage.",
            actorRole: "INSURER_OPS",
            actorName: "Rahul Menon",
            createdAt: daysAgo(59),
          },
        ],
      },
    },
  });

  // 6. Under review — partway through the AI pipeline (recommendation not yet generated)
  await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: policy2.id,
      providerId: apollo.id,
      type: "REIMBURSEMENT",
      diagnosis: "Viral pneumonia",
      icdCode: "J12.9",
      admissionDate: daysAgo(9),
      dischargeDate: daysAgo(6),
      claimedAmount: 62_000,
      status: "UNDER_REVIEW",
      submittedAt: daysAgo(5),
      aiSummary: JSON.stringify({
        summary: "3-day admission for viral pneumonia with oxygen support, resolved without ICU escalation.",
        keyFacts: ["Required supplemental oxygen for 36 hours", "Chest X-ray confirmed bilateral infiltrates", "No ICU admission needed"],
        flags: [],
      }),
      aiRisk: JSON.stringify({ riskScore: 12, riskLevel: "LOW", reasons: ["Cost and length of stay both fall within the expected range for this diagnosis"] }),
      statusHistory: {
        create: [
          { status: "SUBMITTED", note: "Claim submitted for processing.", actorRole: "MEMBER", actorName: "Vikram Nair", createdAt: daysAgo(5) },
          { status: "AI_TRIAGED", note: "AI case summary and risk assessment generated.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(4) },
          { status: "UNDER_REVIEW", note: "Awaiting adjudication recommendation.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(4) },
        ],
      },
      documents: {
        create: [
          {
            docType: "DISCHARGE_SUMMARY",
            fileName: "discharge_summary.pdf",
            extractedText:
              "Apollo Hospitals — Discharge Summary. Patient: Vikram Nair, 46M. Admitted with fever, cough, breathlessness. Chest X-ray: bilateral lower zone infiltrates. Diagnosis: Viral pneumonia. SpO2 improved from 91% to 98% on room air after 36 hours of supplemental oxygen. Discharged in stable condition after 3 days.",
          },
          {
            docType: "HOSPITAL_BILL",
            fileName: "bill.pdf",
            extractedText:
              "Room rent (3 days, single AC): INR 15,000. Oxygen therapy: INR 6,000. Investigations (CBC, CRP, chest X-ray, CT chest): INR 14,000. Pharmacy: INR 11,000. Doctor visits: INR 9,000. Nursing: INR 7,000. Total: INR 62,000.",
          },
        ],
      },
    },
  });

  // 7. High-value cardiac claim, AI-triaged with a HIGH risk flag — the fraud-story demo claim
  await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: policy2.id,
      providerId: fortis.id,
      type: "CASHLESS",
      diagnosis: "Coronary artery disease — CABG (bypass surgery)",
      icdCode: "I25.10",
      admissionDate: daysAgo(2),
      dischargeDate: null,
      claimedAmount: 650_000,
      status: "AI_TRIAGED",
      submittedAt: daysAgo(2),
      aiSummary: JSON.stringify({
        summary:
          "Pre-authorisation request for coronary artery bypass graft (CABG) surgery, claimed same-day discharge which is atypical for this procedure.",
        keyFacts: ["Angiography shows triple-vessel disease", "Requested discharge date is same day as surgery", "No ICU/post-op ward charges itemised"],
        flags: [
          "CABG normally requires 5-7 days of post-operative ICU and ward stay — same-day discharge is inconsistent with the procedure",
          "No itemised ICU charges despite a major cardiac surgery",
        ],
      }),
      aiRisk: JSON.stringify({
        riskScore: 78,
        riskLevel: "HIGH",
        reasons: [
          "Claimed length of stay is inconsistent with standard CABG recovery protocols",
          "This member has filed 2 other claims in the last 12 months, one of which was rejected",
          "Claimed amount is at the upper end of the typical range without itemised ICU charges to justify it",
        ],
      }),
      statusHistory: {
        create: [
          { status: "SUBMITTED", note: "Cashless pre-authorisation requested for cardiac surgery.", actorRole: "PROVIDER", actorName: "Fortis Escorts Heart Institute", createdAt: daysAgo(2) },
          { status: "AI_TRIAGED", note: "AI flagged this claim as high risk — recommend a medical audit before authorisation.", actorRole: "INSURER_OPS", actorName: "Rahul Menon", createdAt: daysAgo(1) },
        ],
      },
      documents: {
        create: [
          {
            docType: "PRE_AUTH_FORM",
            fileName: "pre_auth_cardiac.pdf",
            extractedText:
              "Pre-authorisation request from Fortis Escorts Heart Institute. Angiography confirms triple-vessel coronary artery disease. CABG surgery planned. Requested discharge: same day as surgery. Estimated cost: INR 6,50,000 (surgeon fee, OT charges, implants).",
          },
        ],
      },
    },
  });

  // ── Chat history (demo transcript for Ananya's policy assistant) ────
  await prisma.chatMessage.createMany({
    data: [
      { memberId: memberUser1.member!.id, role: "user", content: "Does my policy cover maternity expenses?", createdAt: daysAgo(30) },
      {
        memberId: memberUser1.member!.id,
        role: "assistant",
        content:
          "Your Family Health Optima Gold policy wording on file doesn't list a maternity benefit — it covers hospitalisation, day-care procedures, and pre/post-hospitalisation expenses, but maternity isn't mentioned as a covered benefit. I'd recommend raising a query with Star Health directly to confirm, since maternity riders are sometimes issued as a separate add-on that might not be reflected here.",
        createdAt: daysAgo(30),
      },
    ],
  });

  console.log("\nSeed complete. Demo logins (password for all: demo1234):");
  console.log("  Member (Ananya Rao):        member@demo.claimsetu.in");
  console.log("  Member (Vikram Nair):        vikram@demo.claimsetu.in");
  console.log("  Provider (Yashoda desk):     provider@demo.claimsetu.in");
  console.log("  Insurer Ops (Rahul Menon):   ops@demo.claimsetu.in");
  console.log("  Admin:                       admin@demo.claimsetu.in");
  console.log(`\nSeeded claims reference claim #${claim1.claimNumber} and query on claim #${claim3.claimNumber}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
