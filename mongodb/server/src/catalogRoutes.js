// Read-only vehicle catalog: makes and models by year, for the suggestions in Add Vehicle.
// Data lives in the `vehicle_catalog` collection (filled by `npm run seed-catalog`).
// It is only a suggestion list: nothing here stops a user from saving a make/model that is
// not in the catalog.
const TYPES = ['car', 'motorcycle', 'van', 'truck'];

// "Mercedes-Benz" and "mercedes benz" must match: lowercase, letters and digits only.
const catalogKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Reads ?type=&make=&year=&q= safely. Anything that is not a plain string/number is rejected
// (this also blocks ?make[$ne]=x style query objects).
function readQuery(req, { needMake }) {
  const { type, make, year, q } = req.query;
  if (typeof type !== 'string' || !TYPES.includes(type))
    return { error: `type must be one of: ${TYPES.join(', ')}.` };

  let yearNum = null;
  if (year !== undefined && year !== '') {
    if (typeof year !== 'string' || !/^\d{4}$/.test(year)) return { error: 'year must be a 4-digit number.' };
    yearNum = Number(year);
  }

  if (needMake) {
    if (typeof make !== 'string' || make.trim().length === 0 || make.length > 60)
      return { error: 'make is required (up to 60 characters).' };
  }

  let qKey = '';
  if (q !== undefined && q !== '') {
    if (typeof q !== 'string' || q.length > 40) return { error: 'q must be text of up to 40 characters.' };
    qKey = catalogKey(q);
  }
  return { type, make: needMake ? make : undefined, year: yearNum, qKey };
}

function registerCatalogRoutes(app, { M, auth, wrap }) {
  const withYear = (match, year) => {
    if (year !== null) { match.year_from = { $lte: year }; match.year_to = { $gte: year }; }
    return match;
  };

  // GET /catalog/makes?type=car&year=2018&q=to   ->  ["Toyota", "Tesla", ...]
  app.get('/catalog/makes', auth, wrap(async (req, res) => {
    const p = readQuery(req, { needMake: false });
    if (p.error) return res.status(400).json({ error: p.error });

    const match = withYear({ type: p.type }, p.year);
    if (p.qKey) match.make_key = { $regex: `^${escapeRegex(p.qKey)}` };

    const rows = await M.VehicleCatalog.aggregate([
      { $match: match },
      { $group: { _id: '$make_key', make: { $first: '$make' } } },
      { $sort: { _id: 1 } },
      { $limit: 300 },
    ]);
    res.set('Cache-Control', 'private, max-age=3600');
    res.json(rows.map((r) => r.make));
  }));

  // GET /catalog/models?type=car&make=Toyota&year=2018&q=ca  ->  [{ model, year_from, year_to }, ...]
  app.get('/catalog/models', auth, wrap(async (req, res) => {
    const p = readQuery(req, { needMake: true });
    if (p.error) return res.status(400).json({ error: p.error });

    const match = withYear({ type: p.type, make_key: catalogKey(p.make) }, p.year);
    if (p.qKey) match.model_key = { $regex: `^${escapeRegex(p.qKey)}` };

    const rows = await M.VehicleCatalog.aggregate([
      { $match: match },
      { $group: { _id: '$model_key', model: { $first: '$model' }, year_from: { $min: '$year_from' }, year_to: { $max: '$year_to' } } },
      { $sort: { _id: 1 } },
      { $limit: 500 },
    ]);
    res.set('Cache-Control', 'private, max-age=3600');
    res.json(rows.map((r) => ({ model: r.model, year_from: r.year_from, year_to: r.year_to })));
  }));
}

module.exports = { registerCatalogRoutes, catalogKey, TYPES };