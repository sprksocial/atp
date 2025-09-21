export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;

export const lessThanAgoMs = (time: Date, range: number): boolean => {
  return Date.now() < time.getTime() + range;
};

export const addHoursToDate = (hours: number, startingDate?: Date): Date => {
  // When date is passed, clone before calling `setHours()` so that we are not mutating the original date
  const currentDate = startingDate ? new Date(startingDate) : new Date();
  currentDate.setHours(currentDate.getHours() + hours);
  return currentDate;
};

function isValidISODateString(dateString: string): boolean {
  // Basic format check: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!isoRegex.test(dateString)) {
    return false;
  }

  // Check if the date is valid and matches the original string when parsed and converted back
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}

export function toSimplifiedISOSafe(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date(0).toISOString();
  }
  const iso = date.toISOString();
  if (!isValidISODateString(iso)) {
    // Occurs in rare cases, e.g. where resulting UTC year is negative. These also don't preserve lexical sort.
    return new Date(0).toISOString();
  }
  return iso; // YYYY-MM-DDTHH:mm:ss.sssZ
}
