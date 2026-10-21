// Reads a date the user typed and returns it as "YYYY-MM-DD", or null if it is not a real date.
//
// Why not new Date(text)? Only the "YYYY-MM-DD" format is guaranteed to work in every
// JavaScript engine. On phones (Hermes) text like "Dec 25, 2026" can come back as an
// invalid date even though it is perfectly fine. Reading the parts ourselves works everywhere.
//
// Accepted:  2026-12-25   2026/12/25   2026.12.25
//            Dec 25, 2026   December 25 2026   Dec. 25th, 2026
//            25 Dec 2026    25 December, 2026
//
// The result is built from the year/month/day directly (never toISOString), because
// converting a local date to UTC can shift it by a day (the Philippines is UTC+8).

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const pad = (n, size) => String(n).padStart(size, '0');

function build(year, month, day) {
  if (!(year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  // Rejects dates that do not exist, like Feb 30 or Apr 31.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function parseDateInput(text) {
  const s = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return null;
  let m;

  // 2026-12-25 | 2026/12/25 | 2026.12.25
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    return build(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // Dec 25, 2026 | December 25 2026 | Dec. 25th, 2026
  if ((m = s.match(/^([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?(?:, ?| )(\d{4})$/))) {
    const month = MONTHS[m[1].toLowerCase()];
    return month ? build(Number(m[3]), month, Number(m[2])) : null;
  }

  // 25 Dec 2026 | 25 December, 2026
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([A-Za-z]{3,9})\.?(?:, ?| )(\d{4})$/))) {
    const month = MONTHS[m[2].toLowerCase()];
    return month ? build(Number(m[3]), month, Number(m[1])) : null;
  }

  return null;
}

// Today's date on the phone's own calendar, as "YYYY-MM-DD".
// new Date().toISOString() is the UTC date, which is a day behind in the Philippines until 8:00 AM,
// so a record made early in the morning would be saved with yesterday's date.
export function todayLocalISO(now = new Date()) {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}