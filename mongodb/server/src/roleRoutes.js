// Routes that depend on roles: sharing (owner), mechanic work, and admin tools.
const { ROLES, requireRole } = require('./rbac');
const { validate, schemas, without } = require('./validate');

const isId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj && obj[k] !== undefined).map((k) => [k, obj[k]]));

// Only these fields can be sent by a mechanic (no user_id, added_by, files, ...).
const MAINTENANCE_FIELDS = ['maintenance_type', 'description', 'service_date', 'mileage', 'cost', 'shop_name', 'parts_replaced', 'notes'];
const REPAIR_FIELDS = ['repair_type', 'description', 'repair_date', 'mileage', 'cost', 'shop_name', 'notes'];

// What a mechanic is allowed to see of a record: no owner id, no uploaded files.
const forMechanic = (doc) => {
  const { user_id, proof_file_path, proof_file_name, ...rest } = doc.toJSON();
  return rest;
};

const adminView = (u) => ({
  id: String(u._id),
  email: u.email || null,
  display_name: u.display_name || null,
  role: ROLES.includes(u.role) ? u.role : 'user',
  created_at: u.created_at,
});

function registerRoleRoutes(app, { M, auth, wrap, audit }) {
  const mechanicOnly = [auth, requireRole('mechanic')];
  const adminOnly = [auth, requireRole('admin')];

  // ---------- Registered mechanics, for the shop/mechanic picker in the Add forms ----------
  // Any logged-in user can read this, but it only returns an id and a display name (never emails).
  app.get('/mechanics', auth, wrap(async (req, res) => {
    const rows = await M.User.find({
      role: 'mechanic',
      email_verified: { $ne: false },          // unverified sign-ups are not listed
      display_name: { $exists: true, $ne: '' },
    }).select('display_name').sort({ display_name: 1 }).limit(200);
    res.json(rows.map((u) => ({ id: String(u._id), display_name: u.display_name })));
  }));

  // ---------- Owner: share a vehicle with a mechanic ----------
  const ownedVehicle = (req) =>
    isId(req.params.id) ? M.Vehicle.findOne({ _id: req.params.id, user_id: req.userId }) : null;

  app.get('/vehicles/:id/shares', auth, wrap(async (req, res) => {
    const vehicle = await ownedVehicle(req);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    const shares = await M.VehicleShare.find({ vehicle_id: vehicle._id, owner_id: req.userId });
    const mechanics = shares.length
      ? await M.User.find({ _id: { $in: shares.map((s) => s.mechanic_id) } })
      : [];
    const byId = new Map(mechanics.map((m) => [String(m._id), m]));
    res.json(shares.map((s) => {
      const m = byId.get(String(s.mechanic_id));
      return {
        mechanic_id: String(s.mechanic_id),
        display_name: m?.display_name || null,
        email: m?.email || null,
        shared_at: s.created_at,
      };
    }));
  }));

  app.post('/vehicles/:id/share', auth, wrap(async (req, res) => {
    const vehicle = await ownedVehicle(req);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    // typeof check: stops objects like {"$ne": null} from reaching the query
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    if (!email) return res.status(400).json({ error: 'Mechanic email is required.' });

    const mechanic = await M.User.findOne({ email });
    if (!mechanic || mechanic.role !== 'mechanic')
      return res.status(404).json({ error: 'No mechanic account found with that email.' });

    const existing = await M.VehicleShare.findOne({ vehicle_id: vehicle._id, mechanic_id: mechanic._id });
    if (!existing) {
      await M.VehicleShare.create({ owner_id: req.userId, vehicle_id: vehicle._id, mechanic_id: mechanic._id });
      audit(req, 'vehicle_shared', { target_type: 'vehicles', target_id: vehicle._id, detail: { mechanic_id: String(mechanic._id) } });
    }

    res.status(existing ? 200 : 201).json({
      mechanic_id: String(mechanic._id),
      display_name: mechanic.display_name || null,
      email: mechanic.email,
    });
  }));

  app.delete('/vehicles/:id/share/:mechanicId', auth, wrap(async (req, res) => {
    const vehicle = await ownedVehicle(req);
    if (!vehicle || !isId(req.params.mechanicId)) return res.status(404).json({ error: 'Not found.' });
    const share = await M.VehicleShare.findOneAndDelete({
      vehicle_id: vehicle._id, mechanic_id: req.params.mechanicId, owner_id: req.userId,
    });
    if (!share) return res.status(404).json({ error: 'Not found.' });
    audit(req, 'share_revoked', { target_type: 'vehicles', target_id: vehicle._id, detail: { mechanic_id: req.params.mechanicId } });
    res.json({ deleted: true });
  }));

  // ---------- Mechanic: work on vehicles shared with them ----------
  // Vehicles that are not shared answer 404, so a mechanic can't tell they exist.
  async function sharedVehicle(req) {
    if (!isId(req.params.id)) return null;
    const share = await M.VehicleShare.findOne({ vehicle_id: req.params.id, mechanic_id: req.userId });
    return share ? M.Vehicle.findById(req.params.id) : null;
  }

  app.get('/mechanic/vehicles', ...mechanicOnly, wrap(async (req, res) => {
    const shares = await M.VehicleShare.find({ mechanic_id: req.userId });
    if (!shares.length) return res.json([]);
    const vehicles = await M.Vehicle.find({ _id: { $in: shares.map((s) => s.vehicle_id) } });
    const owners = await M.User.find({ _id: { $in: [...new Set(shares.map((s) => String(s.owner_id)))] } });
    const ownerName = new Map(owners.map((o) => [String(o._id), o.display_name || null]));
    res.json(vehicles.map((v) => {
      const { user_id, ...rest } = v.toJSON();
      return { ...rest, owner_name: ownerName.get(String(user_id)) || null };
    }));
  }));

  app.get('/mechanic/vehicles/:id/records', ...mechanicOnly, wrap(async (req, res) => {
    const vehicle = await sharedVehicle(req);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    const q = { vehicle_id: vehicle._id };
    const [maintenance, repairs] = await Promise.all([
      M.MaintenanceRecord.find(q).sort({ created_at: -1 }),
      M.Repair.find(q).sort({ created_at: -1 }),
    ]);
    res.json({ maintenance_records: maintenance.map(forMechanic), repairs: repairs.map(forMechanic) });
  }));

  // The record is saved under the OWNER's account (so it shows up in their app)
  // and is labelled with the mechanic who added it.
  const addRecord = (Model, fields, requiredField, typeName) =>
    wrap(async (req, res) => {
      const vehicle = await sharedVehicle(req);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
      const data = pick(req.body, fields);
      if (typeof data[requiredField] !== 'string' || !data[requiredField].trim())
        return res.status(400).json({ error: `${requiredField} is required.` });
      const record = await Model.create({
        ...data,
        user_id: vehicle.user_id,
        vehicle_id: vehicle._id,
        added_by: req.userId,
        added_by_name: req.displayName,
      });
      audit(req, 'mechanic_record_added', { target_type: typeName, target_id: record._id, detail: { vehicle_id: String(vehicle._id) } });
      res.status(201).json(forMechanic(record));
    });

  app.post('/mechanic/vehicles/:id/maintenance_records', ...mechanicOnly, validate(without(schemas.maintenance, 'vehicle_id')),
    addRecord(M.MaintenanceRecord, MAINTENANCE_FIELDS, 'maintenance_type', 'maintenance_records'));
  app.post('/mechanic/vehicles/:id/repairs', ...mechanicOnly, validate(without(schemas.repair, 'vehicle_id')),
    addRecord(M.Repair, REPAIR_FIELDS, 'repair_type', 'repairs'));

  // ---------- Admin: accounts and roles ----------
  // Admins manage accounts but can NOT read anyone's vehicles or records (least privilege).
  app.get('/admin/users', ...adminOnly, wrap(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const users = await M.User.find({}).sort({ created_at: -1 }).skip(skip).limit(limit);
    res.json(users.map(adminView));
  }));

  app.put('/admin/users/:id/role', ...adminOnly, wrap(async (req, res) => {
    const { role } = req.body;
    if (!ROLES.includes(role))
      return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}.` });
    if (!isId(req.params.id)) return res.status(404).json({ error: 'User not found.' });
    // An admin can't demote themselves, so there is always at least one admin left.
    if (req.params.id === req.userId)
      return res.status(400).json({ error: 'You cannot change your own role.' });
    const before = await M.User.findById(req.params.id);
    if (!before) return res.status(404).json({ error: 'User not found.' });
    const oldRole = before.role || 'user';
    const user = await M.User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    audit(req, 'role_changed', { target_type: 'user', target_id: req.params.id, detail: { from: oldRole, to: role } });
    res.json(adminView(user));
  }));

  app.delete('/admin/users/:id', ...adminOnly, wrap(async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ error: 'User not found.' });
    if (req.params.id === req.userId)
      return res.status(400).json({ error: 'You cannot delete your own account here.' });
    const user = await M.User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const own = { user_id: user._id };
    await Promise.all([
      M.MaintenanceRecord, M.Repair, M.PartsReplacement, M.Document, M.StoredFile, M.ResetToken, M.VerifyToken, M.Vehicle,
    ].map((m) => m.deleteMany(own)));
    await M.VehicleShare.deleteMany({ owner_id: user._id });
    await M.VehicleShare.deleteMany({ mechanic_id: user._id });
    await M.User.deleteOne({ _id: user._id });
    audit(req, 'user_deleted', { target_type: 'user', target_id: user._id, detail: { email: user.email, role: user.role } });
    res.json({ deleted: true });
  }));

  app.get('/admin/stats', ...adminOnly, wrap(async (req, res) => {
    const [total, mechanics, admins, vehicles, maintenance, repairs, parts, documents] = await Promise.all([
      M.User.countDocuments({}),
      M.User.countDocuments({ role: 'mechanic' }),
      M.User.countDocuments({ role: 'admin' }),
      M.Vehicle.countDocuments({}),
      M.MaintenanceRecord.countDocuments({}),
      M.Repair.countDocuments({}),
      M.PartsReplacement.countDocuments({}),
      M.Document.countDocuments({}),
    ]);
    res.json({
      users: { total, user: total - mechanics - admins, mechanic: mechanics, admin: admins },
      vehicles, maintenance_records: maintenance, repairs, parts_replacements: parts, documents,
    });
  }));
}

module.exports = { registerRoleRoutes };