// Routes that depend on roles: admin tools.
const { ROLES, requireRole } = require('./rbac');

const isId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

const adminView = (u) => ({
  id: String(u._id),
  email: u.email || null,
  display_name: u.display_name || null,
  role: ROLES.includes(u.role) ? u.role : 'user',
  created_at: u.created_at,
});

function registerRoleRoutes(app, { M, auth, wrap, audit }) {
  const adminOnly = [auth, requireRole('admin')];
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
    await M.User.deleteOne({ _id: user._id });
    audit(req, 'user_deleted', { target_type: 'user', target_id: user._id, detail: { email: user.email, role: user.role } });
    res.json({ deleted: true });
  }));

  app.get('/admin/stats', ...adminOnly, wrap(async (req, res) => {
    const [total, admins, vehicles, maintenance, repairs, parts, documents] = await Promise.all([
      M.User.countDocuments({}),
      M.User.countDocuments({ role: 'admin' }),
      M.Vehicle.countDocuments({}),
      M.MaintenanceRecord.countDocuments({}),
      M.Repair.countDocuments({}),
      M.PartsReplacement.countDocuments({}),
      M.Document.countDocuments({}),
    ]);
    res.json({
      users: { total, user: total - admins, admin: admins },
      vehicles, maintenance_records: maintenance, repairs, parts_replacements: parts, documents,
    });
  }));
}

module.exports = { registerRoleRoutes };