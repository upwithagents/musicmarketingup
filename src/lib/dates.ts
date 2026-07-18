/** Truncate a Date to UTC midnight (date-only semantics used app-wide). */
export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Parse a date input (ISO string or Date) into a UTC-midnight Date,
 * returning null if unparseable. Normalizing here keeps stored dates —
 * and anything anchored off them — free of a time-of-day component.
 */
export function parseDateInput(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return utcMidnight(date);
}
