// Works out which fuel type(s) a vehicle can have from its make, model and year, so the
// Add / Edit Vehicle form does not have to offer every fuel type for every vehicle.
//
//   fuelOptionsFor({ vehicleType, make, model, year })
//     -> { options: ['Gasoline'], known: true }            one fuel type: filled in automatically
//     -> { options: ['Diesel', 'Gasoline'], known: true }   several versions: only these are offered
//     -> { options: FUEL_TYPES, known: false }              no data for this model: all are offered
//
// This is a starter data set written from general knowledge, like the Philippine part of the
// vehicle catalog. Models that are missing simply fall back to the full list, and the form always
// has a "Show all fuel types" link, so nothing is ever blocked. Add or correct rows in TABLE below.
export const FUEL_TYPES = ['Gasoline', 'Diesel', 'LPG', 'Hybrid', 'Plug-in Hybrid', 'Electric'];

const G = 'Gasoline', D = 'Diesel', H = 'Hybrid', P = 'Plug-in Hybrid', E = 'Electric';

// "Mercedes-Benz" and "mercedes benz" must match: lowercase, letters and digits only.
const k = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const any = (...fuels) => [[0, 9999, fuels]];   // same fuel types in every year

// "make|model" -> [[fromYear, toYear, [fuel types]], ...]
// Electrified versions that the catalog lists as their own model (e.g. "Accord Hybrid") are
// recognised by name below, so the plain model here is the combustion version.
const TABLE = {
  // ----- Toyota -----
  'toyota|vios': any(G), 'toyota|wigo': any(G), 'toyota|raize': any(G), 'toyota|rush': any(G),
  'toyota|veloz': any(G), 'toyota|avanza': any(G), 'toyota|yaris': any(G),
  'toyota|yaris cross': [[0, 2022, [G]], [2023, 9999, [G, H]]],
  'toyota|corolla': [[0, 2019, [G]], [2020, 9999, [G, H]]],
  'toyota|corolla altis': [[0, 2018, [G]], [2019, 9999, [G, H]]],
  'toyota|corolla cross': any(G, H),
  'toyota|camry': [[0, 2006, [G]], [2007, 9999, [G, H]]],
  'toyota|alphard': [[0, 2014, [G]], [2015, 9999, [G, H]]],
  'toyota|fortuner': any(D, G), 'toyota|innova': any(D, G), 'toyota|hilux': any(D, G),
  'toyota|land cruiser': any(D, G), 'toyota|land cruiser prado': any(D, G),
  'toyota|lite ace': any(G, D), 'toyota|revo': any(G, D), 'toyota|tamaraw fx': any(G, D),
  'toyota|hiace': any(D, G), 'toyota|hiace commuter': any(D, G), 'toyota|hiace grandia': any(D, G),
  'toyota|hiace super grandia': any(D, G),
  'toyota|prius': any(H), 'toyota|prius c': any(H), 'toyota|prius v': any(H),
  'toyota|crown signia': any(H), 'toyota|bz4x': any(E),

  // ----- Honda -----
  'honda|city': any(G), 'honda|brio': any(G), 'honda|br v': any(G), 'honda|hr v': any(G),
  'honda|jazz': any(G), 'honda|mobilio': any(G), 'honda|civic': any(G), 'honda|accord': any(G),
  'honda|cr v': [[0, 2017, [G]], [2018, 2019, [G, D]], [2020, 9999, [G]]],
  'honda|insight': any(H), 'honda|cr z': any(H), 'honda|prologue': any(E),

  // ----- Hyundai -----
  'hyundai|accent': any(G, D), 'hyundai|creta': any(G), 'hyundai|eon': any(G),
  'hyundai|grand i10': any(G), 'hyundai|kona': any(G), 'hyundai|reina': any(G),
  'hyundai|stargazer': any(G), 'hyundai|tucson': any(G, D),
  'hyundai|h 100': any(D), 'hyundai|starex': any(D), 'hyundai|grand starex': any(D),
  'hyundai|staria': any(D),
  'hyundai|ioniq 5': any(E), 'hyundai|ioniq 6': any(E), 'hyundai|ioniq 7': any(E),

  // ----- Isuzu -----
  'isuzu|alterra': any(D), 'isuzu|crosswind': any(D, G), 'isuzu|mu x': any(D), 'isuzu|trooper': any(D),
  'isuzu|d max': any(D), 'isuzu|elf': any(D), 'isuzu|forward': any(D), 'isuzu|giga': any(D),

  // ----- Kia -----
  'kia|carnival': any(D, G), 'kia|picanto': any(G), 'kia|rio': any(G), 'kia|seltos': any(G, D),
  'kia|soluto': any(G), 'kia|sportage': any(G, D), 'kia|niro': any(H),
  'kia|ev6': any(E), 'kia|ev9': any(E),

  // ----- Mitsubishi -----
  'mitsubishi|adventure': any(D, G), 'mitsubishi|lancer': any(G), 'mitsubishi|lancer ex': any(G),
  'mitsubishi|mirage': any(G), 'mitsubishi|mirage g4': any(G), 'mitsubishi|montero sport': any(D),
  'mitsubishi|outlander': any(G), 'mitsubishi|pajero': any(D), 'mitsubishi|xpander': any(G),
  'mitsubishi|xpander cross': any(G), 'mitsubishi|strada': any(D), 'mitsubishi|triton': any(D),
  'mitsubishi|l300': any(D),
  'mitsubishi fuso|canter': any(D), 'mitsubishi fuso|fighter': any(D), 'mitsubishi fuso|super great': any(D),

  // ----- Nissan -----
  'nissan|almera': any(G), 'nissan|kicks': [[0, 2021, [G]], [2022, 9999, [G, H]]],
  'nissan|livina': any(G), 'nissan|patrol': any(G), 'nissan|sentra': any(G), 'nissan|terra': any(D),
  'nissan|x trail': any(G), 'nissan|frontier': any(D, G), 'nissan|navara': any(D), 'nissan|urvan': any(D),
  'nissan|leaf': any(E), 'nissan|ariya': any(E),

  // ----- Suzuki -----
  'suzuki|alto': any(G), 'suzuki|celerio': any(G), 'suzuki|ciaz': any(G), 'suzuki|dzire': any(G),
  'suzuki|ertiga': any(G), 'suzuki|jimny': any(G), 'suzuki|s presso': any(G), 'suzuki|swift': any(G),
  'suzuki|vitara': any(G), 'suzuki|xl7': any(G), 'suzuki|apv': any(G),

  // ----- Ford / Chevrolet / Mazda / MG / Geely / Subaru / BYD / Hino -----
  'ford|ecosport': any(G), 'ford|everest': any(D), 'ford|lynx': any(G), 'ford|territory': any(G),
  'ford|ranger': any(D), 'ford|mustang mach e': any(E),
  'ford|maverick': [[0, 2021, [G]], [2022, 9999, [G, H]]],
  'chevrolet|trailblazer': [[0, 2012, [G]], [2013, 9999, [D]]],
  'chevrolet|colorado': [[0, 2012, [G, D]], [2013, 9999, [D]]],
  'chevrolet|volt': any(P), 'chevrolet|bolt euv': any(E),
  'mazda|cx 30': any(G), 'mazda|mazda2': any(G), 'mazda|bt 50': any(D),
  'mg|mg5': any(G), 'mg|zs': any(G, E),
  'geely|azkarra': any(G), 'geely|coolray': any(G), 'geely|emgrand': any(G), 'geely|okavango': any(G),
  'subaru|xv': any(G), 'subaru|solterra': any(E),
  'byd|atto 3': any(E), 'byd|dolphin': any(E), 'byd|seal': any(E),
  'hino|300': any(D), 'hino|500': any(D),

  // ----- Electric or hybrid models whose names do not say so -----
  'bmw|i3': any(E), 'bmw|i4': any(E), 'bmw|i5': any(E), 'bmw|i7': any(E), 'bmw|ix': any(E), 'bmw|i8': any(P),
  'cadillac|lyriq': any(E), 'cadillac|celestiq': any(E),
  'fiat|500e': any(E), 'genesis|gv60': any(E), 'jaguar|i pace': any(E),
  'porsche|taycan': any(E), 'porsche|taycan cross turismo': any(E), 'porsche|taycan sport turismo': any(E),
  'volkswagen|id 4': any(E), 'volkswagen|id 7': any(E), 'volkswagen|id buzz': any(E), 'volkswagen|e golf': any(E),
  'polestar|1': any(P), 'fisker|karma': any(P),
};

// Makes that only build electric vehicles (checked after the table, so exceptions can be listed).
const EV_MAKES = new Set(['tesla', 'rivian', 'lucid', 'polestar', 'fisker']);

const inOrder = (list) => FUEL_TYPES.filter((f) => list.includes(f));

export function fuelOptionsFor({ vehicleType, make, model, year } = {}) {
  const mk = k(make);
  const md = k(model);
  const y = Number(year);

  // 1. Listed models, by year.
  const rows = TABLE[`${mk}|${md}`];
  if (rows) {
    const hit = (Number.isFinite(y) && rows.find(([from, to]) => y >= from && y <= to)) || rows[rows.length - 1];
    return { options: inOrder(hit[2]), known: true };
  }

  // 2. Makes that only build electric vehicles.
  if (EV_MAKES.has(mk)) return { options: [E], known: true };

  // 3. The model name says it: "Accord Hybrid", "Escape Plug-in Hybrid", "Bolt EV", "e-tron GT".
  if (/\b(plug in hybrid|phev|energi|prime)\b/.test(md)) return { options: [P], known: true };
  if (/\bhybrid\b/.test(md)) return { options: [H], known: true };
  if (/\b(electric|ev|e tron|etron)\b/.test(md)) return { options: [E], known: true };

  // 4. Every motorcycle in the catalog is petrol.
  if (vehicleType === 'motorcycle') return { options: [G], known: true };

  // 5. No data: the form offers every fuel type.
  return { options: FUEL_TYPES, known: false };
}