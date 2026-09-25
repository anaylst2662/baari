/**
 * Normalises Pakistani mobile numbers to E.164 (+923XXXXXXXXX).
 * Accepts 03XX..., 3XX..., 923XX..., +92 3XX... with spaces or dashes.
 */
export function normalizePkPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let national: string;
  if (digits.startsWith("92")) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  if (!/^3\d{9}$/.test(national)) return null;
  return `+92${national}`;
}

/** +923001234567 -> 0300 1234567 */
export function displayPhone(e164: string): string {
  const national = e164.replace(/^\+92/, "0");
  return `${national.slice(0, 4)} ${national.slice(4)}`;
}
