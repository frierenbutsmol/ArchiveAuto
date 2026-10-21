// Fills the `vehicle_catalog` collection from data/vehicle-catalog.json.
//   npm run seed-catalog            adds new rows and updates existing ones (safe to run again)
//   npm run seed-catalog -- --reset deletes the whole catalog first, then loads it fresh
// Works against whatever MONGODB_URI points to (your Atlas database), and only touches
// the vehicle_catalog collection.
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const M = require('./models');
const { catalogKey, TYPES } = require('./catalogRoutes');

const FILE = path.join(__dirname, '..', 'data', 'vehicle-catalog.json');
const CHUNK = 500;

(async () => {
  const { meta, models } = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(`Read ${models.length} catalog rows (${meta.years[0]}-${meta.years[1]}) from data/vehicle-catalog.json`);

  // Refuse bad rows before touching the database.
  const bad = models.filter((r) => !TYPES.includes(r.t) || !r.make || !r.model || !(r.from <= r.to));
  if (bad.length) { console.error(`Stopped: ${bad.length} invalid rows, first one:`, bad[0]); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI);

  if (process.argv.includes('--reset')) {
    const r = await M.VehicleCatalog.deleteMany({});
    console.log(`Removed ${r.deletedCount} existing catalog rows.`);
  }

  let upserted = 0, modified = 0;
  for (let i = 0; i < models.length; i += CHUNK) {
    const ops = models.slice(i, i + CHUNK).map((r) => ({
      updateOne: {
        filter: { type: r.t, make_key: catalogKey(r.make), model_key: catalogKey(r.model), year_from: r.from },
        update: { $set: { make: r.make, model: r.model, year_to: r.to, source: r.src } },
        upsert: true,
      },
    }));
    const res = await M.VehicleCatalog.bulkWrite(ops, { ordered: false });
    upserted += res.upsertedCount; modified += res.modifiedCount;
  }
  await M.VehicleCatalog.init();   // make sure the indexes exist

  const total = await M.VehicleCatalog.countDocuments();
  const perType = await M.VehicleCatalog.aggregate([{ $group: { _id: '$type', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.log(`Added ${upserted}, updated ${modified}. The catalog now has ${total} rows:`);
  perType.forEach((t) => console.log(`  ${t._id}: ${t.n}`));
  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error('Seeding failed:', e.message); process.exit(1); });