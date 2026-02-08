export function getBooleanFormValue(
  formData: FormData,
  key: string,
  fallback = false,
): boolean {
  const raw = formData.get(key);
  if (raw === null) {
    return fallback;
  }
  const value = String(raw).trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
