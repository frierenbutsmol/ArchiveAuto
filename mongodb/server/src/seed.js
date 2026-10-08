require('dns').setServers(['8.8.8.8', '1.1.1.1']);   // fixes the querySrv ECONNREFUSED error
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const M = require('./models');

// Reads the exported Supabase profiles (id, display_name, created_at).
// display_name is parsed between the first and last comma, so commas in names are safe.
function readProfiles(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const first = line.indexOf(',');
    const last = line.lastIndexOf(',');
    return {
      id: line.slice(0, first).trim(),
      display_name: line.slice(first + 1, last).replace(/^"|"$/g, '').trim(),
      created_at: new Date(line.slice(last + 1).trim().replace(' ', 'T').replace(/\+00$/, 'Z')),
    };
  });
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all(Object.values(M).map((m) => m.createCollection().catch(() => {})));
  await Promise.all(Object.values(M).map((m) => m.syncIndexes()));

  // 1) Import the old profiles. They have no email or password (Supabase keeps those
  //    private), so they are saved as placeholders that cannot log in.
  const file = process.argv[2] || path.join(__dirname, '..', 'profiles_rows.csv');
  let imported = 0;
  for (const p of readProfiles(file)) {
    if (await M.User.findOne({ legacy_id: p.id })) continue;
    await M.User.create({ legacy_id: p.id, display_name: p.display_name, created_at: p.created_at });
    imported++;
  }
  console.log(`Profiles imported: ${imported}`);

  // 2) Demo account with sample data (delete before going live)
  if (!(await M.User.findOne({ email: 'demo@archiveauto.com' }))) {
    const user = await M.User.create({
      email: 'demo@archiveauto.com', display_name: 'Demo User',
      password_hash: await bcrypt.hash('demo12345', 10),
    });
    const base = { user_id: user._id };
    const v = await M.Vehicle.create({
      ...base, vehicle_type: 'car', make: 'Toyota', series: 'Vios', year: 2019,
      nickname: 'Daily Vios', plate_number: 'ABC 1234', fuel_type: 'Gasoline',
      tank_capacity: 42, current_mileage: 48000,
    });
    const link = { ...base, vehicle_id: v._id };
    await M.MaintenanceRecord.create({ ...link, maintenance_type: 'Oil change', description: 'Change oil and filter', service_date: '2026-09-01', mileage: 47500, cost: 1800, shop_name: 'Quick Lube' });
    await M.Repair.create({ ...link, repair_type: 'Brakes', description: 'Brake pad replacement', repair_date: '2026-09-10', mileage: 47800, cost: 3500 });
    await M.PartsReplacement.create({ ...link, part_name: 'Air filter', brand: 'Denso', replacement_date: '2026-09-01', mileage: 47500, cost: 450 });
    await M.Document.create({ ...link, document_type: 'Insurance', expiry_date: '2027-09-01', notes: 'Insurance policy' });
    console.log('Demo account created: demo@archiveauto.com / demo12345');
  } else {
    console.log('Demo account already exists.');
  }

  console.log('Done.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });