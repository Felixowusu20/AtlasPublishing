/** Public ISSN display. Unregistered journals show an em dash. */
export function displayIssn(issn?: string | null): string {
  const value = issn?.trim();
  return value ? value : "—";
}

/** Empty ISSN values store as null so the paper header can show an em dash. */
export function optionalIssn(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
