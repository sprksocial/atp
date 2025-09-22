// Time constants
export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;

// Characters that need escaping in regex
const SEPARATORS_TO_ESCAPE = new Set([
  "\\",
  "^",
  "$",
  ".",
  "|",
  "?",
  "*",
  "+",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
]);

// Helper Functions

function getStringSeparator(dateString: string): string {
  const separator = /\D/.exec(dateString);
  return separator ? separator[0] : "";
}

function getTimeStringSeparator(timeString: string): string {
  const matches = timeString.match(/([^Z+\-\d])(?=\d+\1)/);
  return Array.isArray(matches) ? matches[0] : "";
}

// Validation Functions

export function isValidDate(date: string, s = "-"): boolean {
  if (SEPARATORS_TO_ESCAPE.has(s)) {
    s = `\\${s}`;
  }

  const validator = new RegExp(
    `^(?!0{4}${s}0{2}${s}0{2})((?=[0-9]{4}${s}(((0[^2])|1[0-2])|02(?=${s}(([0-1][0-9])|2[0-8])))${s}[0-9]{2})|(?=((([13579][26])|([2468][048])|(0[48]))0{2})|([0-9]{2}((((0|[2468])[48])|[2468][048])|([13579][26])))${s}02${s}29))([0-9]{4})${s}(?!((0[469])|11)${s}31)((0[1,3-9]|1[0-2])|(02(?!${s}3)))${s}(0[1-9]|[1-2][0-9]|3[0-1])$`,
  );
  return validator.test(date);
}

function isValidTime(
  timeWithOffset: string,
  s = ":",
  isTimezoneCheckOn = false,
): boolean {
  const validator = new RegExp(
    `^([0-1]|2(?=([0-3])|4${s}00))[0-9]${s}[0-5][0-9](${s}([0-5]|6(?=0))[0-9])?(\.[0-9]{1,9})?$`,
  );

  if (!isTimezoneCheckOn || !/[Z+\-]/.test(timeWithOffset)) {
    return validator.test(timeWithOffset);
  }

  // Case we got time in Zulu tz
  if (/Z$/.test(timeWithOffset)) {
    return validator.test(timeWithOffset.replace("Z", ""));
  }

  const isPositiveTimezoneOffset = timeWithOffset.includes("+");
  const [time, offset] = timeWithOffset.split(/[+-]/);

  return validator.test(time) &&
    isValidZoneOffset(
      offset,
      isPositiveTimezoneOffset,
      getStringSeparator(offset),
    );
}

function isValidZoneOffset(
  offset: string,
  isPositiveOffset: boolean,
  s = ":",
): boolean {
  const validator = new RegExp(
    isPositiveOffset
      ? `^(0(?!(2${s}4)|0${s}3)|1(?=([0-1]|2(?=${s}[04])|[34](?=${s}0))))([03469](?=${s}[03])|[17](?=${s}0)|2(?=${s}[04])|5(?=${s}[034])|8(?=${s}[04]))${s}([03](?=0)|4(?=5))[05]$`
      : `^(0(?=[^0])|1(?=[0-2]))([39](?=${s}[03])|[0-24-8](?=${s}00))${s}[03]0$`,
  );
  return validator.test(offset);
}

export function isValidISODateString(dateString: string): boolean {
  const [date, timeWithOffset] = dateString.split("T");
  const dateSeparator = getStringSeparator(date);
  const isDateValid = isValidDate(date, dateSeparator);

  if (!timeWithOffset) {
    return false;
  }

  const timeStringSeparator = getTimeStringSeparator(timeWithOffset);
  return isDateValid && isValidTime(timeWithOffset, timeStringSeparator, true);
}

// Utility Functions

export const lessThanAgoMs = (time: Date, range: number): boolean => {
  return Date.now() < time.getTime() + range;
};

export const addHoursToDate = (hours: number, startingDate?: Date): Date => {
  // When date is passed, clone before calling `setHours()` so that we are not mutating the original date
  const currentDate = startingDate ? new Date(startingDate) : new Date();
  currentDate.setHours(currentDate.getHours() + hours);
  return currentDate;
};

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
