// Request validation without extra packages.
//
//   app.post('/vehicles', validate(schemas.vehicle), handler)
//
// What it does for every request body:
//   * rejects anything that is not a JSON object
//   * checks type, length and range of each known field (400 with a clear message)
//   * DROPS fields that are not in the schema (so nobody can slip in extra fields)
//   * turns "" and null into null for optional fields (same as the app sends today)
// After it runs, req.body holds only clean, trusted values.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const fail = (msg) => { const e = new Error(msg); e.isValidation = true; throw e; };
const isId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

// ---------- rules: each returns the cleaned value or throws ----------
const text = ({ max = 200, min = 0, lower = false } = {}) => (v, label) => {
  if (typeof v !== 'string') fail(`${label} must be text.`);
  const s = v.trim();
  if (CONTROL.test(s)) fail(`${label} contains invalid characters.`);
  if (s.length < min) fail(`${label} is too short.`);
  if (s.length > max) fail(`${label} is too long (${max} characters max).`);
  return lower ? s.toLowerCase() : s;
};

const email = () => {
  const t = text({ max: 254, lower: true });
  return (v, label) => {
    const s = t(v, label);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) fail('Enter a valid email address.');
    return s;
  };
};

// New passwords: 8-128 characters with a letter and a number. Never trimmed.
const newPassword = () => (v) => {
  if (typeof v !== 'string') fail('Password must be text.');
  if (v.length < 8) fail('Password must be at least 8 characters.');
  if (v.length > 128) fail('Password is too long (128 characters max).');
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) fail('Password needs at least one letter and one number.');
  return v;
};

// Login password: only checked for type/size (the real check is the hash comparison).
const plain = (max = 128) => (v) => {
  if (typeof v !== 'string' || v.length === 0 || v.length > max) fail('Invalid email or password.');
  return v;
};

const number = ({ min = -Infinity, max = Infinity, int = false } = {}) => (v, label) => {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  if (!Number.isFinite(n)) fail(`${label} must be a number.`);
  if (int && !Number.isInteger(n)) fail(`${label} must be a whole number.`);
  if (n < min || n > max) fail(`${label} must be between ${min} and ${max}.`);
  return n;
};

const date = () => (v, label) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(`${label} must be a date like 2026-10-31.`);
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) fail(`${label} is not a real date.`);
  return v;
};

const oneOf = (list) => (v, label) => {
  if (!list.includes(v)) fail(`${label} must be one of: ${list.join(', ')}.`);
  return v;
};

const objectId = () => (v, label) => { if (!isId(v)) fail(`${label} is not valid.`); return v; };
const hex64 = () => (v, label) => {
  if (typeof v !== 'string' || !/^[a-f0-9]{64}$/.test(v)) fail(`${label} is invalid.`);
  return v;
};

// ---------- the middleware ----------
const prettify = (key) => {
  const s = key.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function validate(schema, { partial = false } = {}) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return res.status(400).json({ error: 'Request body must be a JSON object.' });

    const clean = {};
    const fields = {};
    for (const [key, def] of Object.entries(schema)) {
      const { rule, required = false } = typeof def === 'function' ? { rule: def } : def;
      const label = prettify(key);
      const raw = body[key];

      if (raw === undefined) {                       // not sent
        if (required && !partial) fields[key] = `${label} is required.`;
        continue;
      }
      if (raw === null || raw === '') {              // sent empty
        if (required) fields[key] = `${label} is required.`;
        else clean[key] = null;
        continue;
      }
      try { clean[key] = rule(raw, label); }
      catch (e) { if (!e.isValidation) throw e; fields[key] = e.message; }
    }

    const keys = Object.keys(fields);
    if (keys.length) return res.status(400).json({ error: fields[keys[0]], fields });
    req.body = clean;
    next();
  };
}

// ---------- the schemas ----------
const YEAR_MAX = new Date().getFullYear() + 1;
const MILEAGE = number({ min: 0, max: 10000000 });
const MONEY = number({ min: 0, max: 100000000 });
const vehicleRef = { rule: objectId(), required: true };

// [{ name, amount }, ...] - the parts / items that make up a cost (30 at most).
const costItems = () => (v, label) => {
  if (!Array.isArray(v)) fail(`${label} must be a list.`);
  if (v.length > 30) fail(`${label} can have 30 items at most.`);
  return v.map((it, i) => {
    if (!it || typeof it !== 'object') fail(`${label} item ${i + 1} is invalid.`);
    return {
      name: text({ max: 80 })(it.name == null ? '' : it.name, `${label} item ${i + 1} name`),
      amount: MONEY(it.amount, `${label} item ${i + 1} amount`),
    };
  });
};

const schemas = {
  register: {
    email: { rule: email(), required: true },
    password: { rule: newPassword(), required: true },
    display_name: text({ max: 60 }),
    role: oneOf(['user', 'mechanic']),            // sign-up choice; 'admin' is never allowed here
  },
  login: {
    email: { rule: text({ max: 254, lower: true }), required: true },
    password: { rule: plain(), required: true },
  },
  forgot: { email: { rule: email(), required: true } },
  reset: { token: { rule: hex64(), required: true }, password: { rule: newPassword(), required: true } },
  password: {
    current_password: { rule: (v) => { if (typeof v !== 'string' || !v || v.length > 128) fail('Enter your current password.'); return v; }, required: true },
    password: { rule: newPassword(), required: true },
  },
  profile: { display_name: text({ max: 60 }), avatar_url: text({ max: 500 }) },

  vehicle: {
    vehicle_type: oneOf(['car', 'motorcycle', 'van', 'truck']),
    make: { rule: text({ max: 60 }), required: true },
    series: { rule: text({ max: 60 }), required: true },
    year: number({ min: 1886, max: YEAR_MAX, int: true }),
    nickname: text({ max: 60 }),
    plate_number: text({ max: 20 }),
    fuel_type: text({ max: 30 }),
    tank_capacity: number({ min: 0, max: 1000 }),
    current_mileage: MILEAGE,
  },
  maintenance: {
    vehicle_id: vehicleRef,
    maintenance_type: text({ max: 60 }),
    description: text({ max: 300 }),
    service_date: date(),
    mileage: MILEAGE,
    cost: MONEY,
    labor_cost: MONEY,
    cost_items: costItems(),
    shop_name: text({ max: 100 }),
    parts_replaced: text({ max: 300 }),
    notes: text({ max: 2000 }),
  },
  repair: {
    vehicle_id: vehicleRef,
    repair_type: text({ max: 60 }),
    description: text({ max: 300 }),
    repair_date: date(),
    mileage: MILEAGE,
    cost: MONEY,
    shop_name: text({ max: 100 }),
    proof_file_path: text({ max: 300 }),
    proof_file_name: text({ max: 200 }),
    notes: text({ max: 2000 }),
  },
  part: {
    vehicle_id: vehicleRef,
    part_name: { rule: text({ max: 100 }), required: true },
    brand: text({ max: 60 }),
    replacement_date: date(),
    mileage: MILEAGE,
    cost: MONEY,
    notes: text({ max: 2000 }),
  },
  document: {
    vehicle_id: vehicleRef,
    document_type: text({ max: 60 }),
    file_path: text({ max: 300 }),
    file_name: text({ max: 200 }),
    file_type: oneOf(['application/pdf', 'image/jpeg', 'image/png']),
    issue_date: date(),
    expiry_date: date(),
    notes: text({ max: 2000 }),
  },
};

// A copy of a schema without some fields (e.g. mechanics: the vehicle comes from the URL, not the body).
const without = (schema, ...keys) =>
  Object.fromEntries(Object.entries(schema).filter(([k]) => !keys.includes(k)));

module.exports = { validate, schemas, isId, without };