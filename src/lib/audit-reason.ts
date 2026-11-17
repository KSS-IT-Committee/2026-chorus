export function getAuditReason(
  value: FormDataEntryValue | null,
): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return reason.length > 0 && reason.length <= 500 ? reason : null;
}
