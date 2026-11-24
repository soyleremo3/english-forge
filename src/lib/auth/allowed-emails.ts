// ALLOWED_EMAILS kontrolü (SPEC 3, "Erişim güvenliği"). Yalnızca sunucuda çağrılır:
// ALLOWED_EMAILS NEXT_PUBLIC_ önekli olmadığı için istemciye hiç gitmez.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAllowedEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map(normalizeEmail)
      .filter((e) => e.length > 0),
  );
}

export function isEmailAllowed(
  email: string | null | undefined,
  raw: string | undefined = process.env.ALLOWED_EMAILS,
): boolean {
  if (!email) return false;
  return parseAllowedEmails(raw).has(normalizeEmail(email));
}
