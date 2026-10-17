// Builds the Make and Model lists for the Add Vehicle dropdowns.
// It combines the database catalog (1995-2025, from /catalog/makes and /catalog/models) with
// the short built-in lists in constants/vehicleCatalog.js, so nothing the team added by hand
// disappears. If the database lists are missing (offline, or the catalog is not seeded yet),
// only the built-in lists are used, exactly like before.
import { OTHER, VEHICLE_CATALOG } from '../constants/vehicleCatalog';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const compact = (s) => norm(s).replace(/ /g, '');
const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// "Sniper" and "Sniper 155", "XSR 155" and "XSR155", "Click 125" and "Click 125i" are the same
// model, so only one of them is shown.
const sameModel = (a, b) => {
  const na = norm(a), nb = norm(b), ca = compact(a), cb = compact(b);
  return ca === cb || cb === `${ca}i` || ca === `${cb}i` || na.startsWith(`${nb} `) || nb.startsWith(`${na} `);
};

// Brand choices for a vehicle type (empty until a type is chosen). "Other" is always last.
export function brandChoices(type, dbBrands) {
  if (!type) return [];
  const built = Object.keys(VEHICLE_CATALOG[type] || {});
  const fromDb = Array.isArray(dbBrands) ? dbBrands : [];
  const extra = built.filter((b) => !fromDb.some((d) => compact(d) === compact(b)));
  return [...fromDb, ...extra].sort(byName).concat(OTHER);
}

// Model choices for a brand. "Other" brand -> only "Other". "Other" is always last.
export function modelChoices(type, brand, dbModels) {
  if (!brand) return [];
  if (brand === OTHER) return [OTHER];
  const fromDb = Array.isArray(dbModels) ? dbModels.map((m) => m.model) : [];
  const builtKey = Object.keys(VEHICLE_CATALOG[type] || {}).find((k) => compact(k) === compact(brand));
  const built = builtKey ? VEHICLE_CATALOG[type][builtKey] : [];
  const extra = built.filter((b) => !fromDb.some((d) => sameModel(d, b)));
  return [...fromDb, ...extra].sort(byName).concat(OTHER);
}