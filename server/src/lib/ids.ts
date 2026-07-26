import { randomInt } from "node:crypto";

function segment(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += randomInt(0, 10).toString();
  return out;
}

/** ABHA-style 14-digit health identifier, grouped for readability. */
export function generateHealthId(): string {
  return `${segment(4)}-${segment(4)}-${segment(4)}`;
}

/** Policy number, e.g. CST/HLT/2026/004821 */
export function generatePolicyNumber(year = new Date().getFullYear()): string {
  return `CST/HLT/${year}/${segment(6)}`;
}

/** Claim number, e.g. CLM-2026-000482 */
export function generateClaimNumber(year = new Date().getFullYear()): string {
  return `CLM-${year}-${segment(6)}`;
}

/** Provider network code, e.g. PRV-BLR-0231 */
export function generateProviderCode(cityCode: string): string {
  return `PRV-${cityCode.toUpperCase()}-${segment(4)}`;
}
