function segment(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

export function uid(): string {
  return `${Date.now().toString(36)}${segment(6)}`;
}

export function generateHealthId(): string {
  return `${segment(4)}-${segment(4)}-${segment(4)}`;
}

export function generateMrn(year = new Date().getFullYear()): string {
  return `MRN-${year}-${segment(6)}`;
}

export function generatePolicyNumber(year = new Date().getFullYear()): string {
  return `NDI/HLT/${year}/${segment(6)}`;
}

export function generateClaimNumber(year = new Date().getFullYear()): string {
  return `CLM-${year}-${segment(6)}`;
}
