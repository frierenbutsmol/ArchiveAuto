// "Service provider" suggestions for the Add Maintenance / Add Repair dropdowns.
//
//   GET /service-providers  ->  [{ name, kind, last_used, uses }, ...]   for the signed-in user ONLY
//
// The list is personal. It is built from what is already saved in the database for THIS user:
//   kind "recent"    a shop name the user typed into one of their own maintenance or
//                    repair records (newest first; the same name typed twice is merged)
// Other users' shops are never returned, and only names are sent (no emails, no ids).
const RECORD_SCAN_LIMIT = 500;   // newest records read per collection
const MAX_RESULTS = 30;

// "Mang Tom's Auto" and "mang toms  auto" are the same shop.
const nameKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
const tidy = (s) => String(s).replace(/\s+/g, ' ').trim();

function registerProviderRoutes(app, { M, auth, wrap }) {
  app.get('/service-providers', auth, wrap(async (req, res) => {
    const mine = { user_id: req.userId, shop_name: { $nin: [null, ''] } };
    const [maintenance, repairs] = await Promise.all([
      M.MaintenanceRecord.find(mine).select('shop_name created_at').sort({ created_at: -1 }).limit(RECORD_SCAN_LIMIT).lean(),
      M.Repair.find(mine).select('shop_name created_at').sort({ created_at: -1 }).limit(RECORD_SCAN_LIMIT).lean(),
    ]);

    const byKey = new Map();

    // 1) names this user typed into their own records
    for (const rec of [...maintenance, ...repairs]) {
      if (typeof rec.shop_name !== 'string') continue;
      const name = tidy(rec.shop_name);
      const key = nameKey(name);
      if (!key) continue;                                   // nothing but symbols
      const when = rec.created_at ? new Date(rec.created_at) : null;
      const cur = byKey.get(key);
      if (!cur) {
        byKey.set(key, { name, kind: 'recent', last: when, uses: 1 });
      } else {
        cur.uses += 1;
        if (when && (!cur.last || when > cur.last)) { cur.last = when; cur.name = name; }   // newest spelling wins
      }
    }

    // Most recently used first; names never used in a record come after, A to Z.
    const list = [...byKey.values()].sort((a, b) => {
      if (a.last && b.last) return b.last - a.last;
      if (a.last) return -1;
      if (b.last) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    res.set('Cache-Control', 'private, no-store');           // personal data: never cached by a proxy
    res.json(list.slice(0, MAX_RESULTS).map((p) => ({
      name: p.name,
      kind: p.kind,
      last_used: p.last ? p.last.toISOString() : null,
      uses: p.uses,
    })));
  }));
}

module.exports = { registerProviderRoutes, nameKey };