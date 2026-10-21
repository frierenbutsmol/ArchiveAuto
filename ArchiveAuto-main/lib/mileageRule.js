// The odometer rule for Log Maintenance: the reading cannot be lower than the vehicle's current
// mileage, and the field starts out filled in with that mileage.
//
// Everything is compared in the unit the user sees (km or mi), rounded exactly the way the field is
// filled in (lib/units.js). That way a number the app filled in itself is never rejected, and never
// shifts by a kilometre, because of km <-> mi rounding.
import { kmToDisplay, displayToKm, formatDistance } from './units';

// Lowest reading allowed, in the user's unit. 0 means "no limit" (the vehicle has no mileage yet).
export const minimumReading = (currentKm, useMetric = true) =>
  Number(currentKm) > 0 ? kmToDisplay(currentKm, useMetric) : 0;

// null when the reading is fine, otherwise the message to show.
export function readingProblem(entered, currentKm, useMetric = true) {
  const min = minimumReading(currentKm, useMetric);
  if (min <= 0 || !Number.isFinite(entered) || entered >= min) return null;
  return `Your vehicle is already at ${formatDistance(currentKm, useMetric)}. The reading can't be lower than that.`;
}

// Kilometres to store with the record (the database always keeps km).
// A reading left at the minimum IS the vehicle's current mileage, so it is stored exactly as it is;
// otherwise converting back from miles could move the odometer by a kilometre each time.
export function readingToKm(entered, currentKm, useMetric = true) {
  if (!Number.isFinite(entered)) return null;
  const min = minimumReading(currentKm, useMetric);
  return min > 0 && entered === min ? Number(currentKm) : displayToKm(entered, useMetric);
}