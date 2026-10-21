const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { requireRole } = require('./rbac');
const {
  SecurityEvent,
  AiRequestLog,
  recordSecurityEvent,
  maskIp,
  sanitizeDetails,
} = require('./securityEvents');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-0', 10);
const CATALOG_TYPES = ['car', 'motorcycle', 'van', 'truck'];

const isId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const catalogKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Mask email: john.doe@example.com -> jo***@example.com
const maskEmail = (email) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  const show = local.length > 2 ? 2 : 1;
  return `${local.slice(0, show)}${'*'.repeat(Math.max(3, local.length - show))}@${domain}`;
};

function registerAdminRoutes(app, { M, auth, wrap, audit }) {
  const router = express.Router();

  // Small body limit for admin API (10kb) — main app's /files endpoint keeps its own larger limit
  router.use(express.json({ limit: '10kb' }));

  const adminOnly = [auth, requireRole('admin')];

  // ---------- Admin Login Limiter: 10 attempts per 15 minutes ----------
  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      recordSecurityEvent(req, 'rate_limited', { limiter: 'admin_login', path: req.originalUrl });
      res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
    },
  });

  // ---------- POST /admin-api/login ----------
  router.post('/login', adminLoginLimiter, wrap(async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || typeof body.email !== 'string' || typeof body.password !== 'string') {
      recordSecurityEvent(req, 'admin_login_failed', { reason: 'invalid_payload_type' });
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const email = body.email.toLowerCase().trim();
    const password = body.password;
    if (!email || !password || email.length > 254 || password.length > 256) {
      recordSecurityEvent(req, 'admin_login_failed', { reason: 'malformed_input' });
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = await M.User.findOne({ email });
    const matches = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

    if (!user || !user.password_hash || !matches || user.role !== 'admin') {
      recordSecurityEvent(req, 'admin_login_failed');
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: String(user._id), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    audit(req, 'admin_login_success', {
      user_id: user._id,
      target_type: 'user',
      target_id: String(user._id),
    });

    res.json({
      token,
      user: { id: String(user._id), display_name: user.display_name || 'Admin', role: 'admin' },
    });
  }));

  // ---------- GET /admin-api/me ----------
  router.get('/me', ...adminOnly, wrap(async (req, res) => {
    res.json({ id: req.userId, role: req.role, display_name: req.displayName || 'Admin' });
  }));

  // ---------- SCREEN: Overview ----------
  router.get('/overview', ...adminOnly, wrap(async (req, res) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsers, totalVehicles, maintenanceCount, repairsCount, newUsers7d, aiRequestsToday] =
      await Promise.all([
        M.User.countDocuments({}),
        M.Vehicle.countDocuments({}),
        M.MaintenanceRecord.countDocuments({}),
        M.Repair.countDocuments({}),
        M.User.countDocuments({ created_at: { $gte: sevenDaysAgo } }),
        AiRequestLog.countDocuments({ created_at: { $gte: todayStart } }),
      ]);

    res.json({
      total_users: totalUsers,
      total_vehicles: totalVehicles,
      total_service_records: maintenanceCount + repairsCount,
      new_users_7d: newUsers7d,
      ai_requests_today: aiRequestsToday,
    });
  }));

  // ---------- SCREEN: Spending & Proof Coverage by Repair Type ----------
  router.get('/repair-types', ...adminOnly, wrap(async (req, res) => {
    const stats = await M.Repair.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ['$repair_type', null] }, { $ne: ['$repair_type', ''] }] },
              '$repair_type',
              'General / Uncategorized',
            ],
          },
          total_repairs: { $sum: 1 },
          total_spending: { $sum: { $ifNull: ['$cost', 0] } },
          with_proof: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$proof_file_path', null] }, { $ne: ['$proof_file_path', ''] }] },
                1, 0,
              ],
            },
          },
        },
      },
      {
        $project: {
          repair_type: '$_id',
          total_repairs: 1,
          total_spending: { $round: ['$total_spending', 2] },
          with_proof: 1,
          proof_coverage_pct: {
            $cond: [
              { $gt: ['$total_repairs', 0] },
              { $round: [{ $multiply: [{ $divide: ['$with_proof', '$total_repairs'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
      { $sort: { total_spending: -1 } },
    ]);
    res.json(stats);
  }));

  // ---------- SCREEN: Car Catalog Manager ----------
  router.get('/catalog', ...adminOnly, wrap(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 50);
    const skip = (page - 1) * limit;
    const query = {};
    if (typeof req.query.type === 'string' && CATALOG_TYPES.includes(req.query.type)) query.type = req.query.type;
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const safe = req.query.q.trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ make: new RegExp(safe, 'i') }, { model: new RegExp(safe, 'i') }];
    }
    const [items, total] = await Promise.all([
      M.VehicleCatalog.find(query).sort({ make: 1, model: 1, year_from: -1 }).skip(skip).limit(limit),
      M.VehicleCatalog.countDocuments(query),
    ]);
    res.json({
      items: items.map((doc) => ({
        id: String(doc._id), type: doc.type, make: doc.make, model: doc.model,
        year_from: doc.year_from, year_to: doc.year_to, source: doc.source || 'admin',
      })),
      total, page, limit, totalPages: Math.ceil(total / limit) || 1,
    });
  }));

  router.post('/catalog', ...adminOnly, wrap(async (req, res) => {
    const { type, make, model, year_from, year_to } = req.body || {};
    if (!type || typeof type !== 'string' || !CATALOG_TYPES.includes(type))
      return res.status(400).json({ error: `type must be one of: ${CATALOG_TYPES.join(', ')}.` });
    if (!make || typeof make !== 'string' || !make.trim() || make.trim().length > 60)
      return res.status(400).json({ error: 'make is required and must be between 1 and 60 characters.' });
    if (!model || typeof model !== 'string' || !model.trim() || model.trim().length > 60)
      return res.status(400).json({ error: 'model is required and must be between 1 and 60 characters.' });
    const fromNum = Number(year_from), toNum = Number(year_to);
    if (!Number.isInteger(fromNum) || fromNum < 1900 || fromNum > 2100)
      return res.status(400).json({ error: 'year_from must be a valid year between 1900 and 2100.' });
    if (!Number.isInteger(toNum) || toNum < 1900 || toNum > 2100)
      return res.status(400).json({ error: 'year_to must be a valid year between 1900 and 2100.' });
    if (toNum < fromNum)
      return res.status(400).json({ error: 'year_to cannot be earlier than year_from.' });
    const cleanMake = make.trim(), cleanModel = model.trim();
    try {
      const created = await M.VehicleCatalog.create({
        type, make: cleanMake, model: cleanModel,
        make_key: catalogKey(cleanMake), model_key: catalogKey(cleanModel),
        year_from: fromNum, year_to: toNum, source: 'admin',
      });
      audit(req, 'catalog_item_added', {
        target_type: 'vehicle_catalog', target_id: String(created._id),
        detail: { type, make: cleanMake, model: cleanModel, year_from: fromNum, year_to: toNum },
      });
      res.status(201).json({
        id: String(created._id), type: created.type, make: created.make, model: created.model,
        year_from: created.year_from, year_to: created.year_to, source: created.source,
      });
    } catch (err) {
      if (err.code === 11000)
        return res.status(409).json({ error: 'A catalog entry for this type, make, model and start year already exists.' });
      throw err;
    }
  }));

  router.delete('/catalog/:id', ...adminOnly, wrap(async (req, res) => {
    if (!isId(req.params.id)) return res.status(400).json({ error: 'Invalid catalog item ID.' });
    const item = await M.VehicleCatalog.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Catalog item not found.' });
    await M.VehicleCatalog.deleteOne({ _id: item._id });
    audit(req, 'catalog_item_deleted', {
      target_type: 'vehicle_catalog', target_id: String(item._id),
      detail: { type: item.type, make: item.make, model: item.model },
    });
    res.json({ deleted: true, id: req.params.id });
  }));

  // ---------- SCREEN: Users ----------
  // Returns user accounts with email, display name and account status
  router.get('/users', ...adminOnly, wrap(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 50);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const filter = {};

    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const safe = req.query.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { email: new RegExp(safe, 'i') },
        { display_name: new RegExp(safe, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      M.User.find(filter)
        .select('email display_name role suspended suspended_at created_at email_verified')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      M.User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const emailKeys = users.map((u) => 'e:' + u.email);

    const [vcounts, locks] = await Promise.all([
      M.Vehicle.aggregate([
        { $match: { user_id: { $in: userIds } } },
        { $group: { _id: '$user_id', count: { $sum: 1 } } },
      ]),
      M.LoginAttempt.find({ key: { $in: emailKeys }, locked_until: { $gt: new Date() } }).select('key'),
    ]);

    const countMap = new Map(vcounts.map((v) => [String(v._id), v.count]));
    const lockedKeys = new Set(locks.map((l) => l.key));

    res.json({
      users: users.map((u) => ({
        id: String(u._id),
        email: u.email || '—',
        masked_email: u.email || '—',
        display_name: u.display_name || '—',
        role: u.role || 'user',
        status: u.suspended ? 'suspended' : lockedKeys.has('e:' + u.email) ? 'locked' : 'active',
        email_verified: u.email_verified !== false,
        created_at: u.created_at,
        vehicle_count: countMap.get(String(u._id)) || 0,
      })),
      total,
      skip,
      limit,
    });
  }));

  // Unlock a locked account — clears the login lock from LoginAttempt
  router.post('/users/:id/unlock', ...adminOnly, wrap(async (req, res) => {
    const { reason } = req.body || {};
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5)
      return res.status(400).json({ error: 'A written reason of at least 5 characters is required.' });
    if (!isId(req.params.id)) return res.status(404).json({ error: 'User not found.' });

    const user = await M.User.findById(req.params.id).select('email role');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Delete the email-based login lock; leave IP counters untouched
    await M.LoginAttempt.deleteMany({ key: 'e:' + user.email });

    audit(req, 'user_unlocked', {
      target_type: 'user', target_id: String(user._id),
      detail: { reason: reason.trim().slice(0, 200) },
    });

    res.json({ ok: true, id: String(user._id), status: 'active' });
  }));

  // Suspend an account — the next auth middleware check immediately blocks the user
  router.post('/users/:id/suspend', ...adminOnly, wrap(async (req, res) => {
    const { reason } = req.body || {};
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5)
      return res.status(400).json({ error: 'A written reason of at least 5 characters is required.' });
    if (!isId(req.params.id)) return res.status(404).json({ error: 'User not found.' });
    if (req.params.id === req.userId)
      return res.status(400).json({ error: 'You cannot suspend your own account.' });

    const user = await M.User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'admin')
      return res.status(400).json({ error: 'Admin accounts cannot be suspended from this panel.' });
    if (user.suspended)
      return res.status(409).json({ error: 'This account is already suspended.' });

    await M.User.findByIdAndUpdate(req.params.id, {
      suspended: true,
      suspended_at: new Date(),
      suspended_by: req.userId,
      suspended_reason: reason.trim().slice(0, 500),
    });

    audit(req, 'user_suspended', {
      target_type: 'user', target_id: String(user._id),
      detail: { reason: reason.trim().slice(0, 200) },
    });

    res.json({ ok: true, id: String(user._id), status: 'suspended' });
  }));

  // Restore a suspended account
  router.post('/users/:id/restore', ...adminOnly, wrap(async (req, res) => {
    const { reason } = req.body || {};
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5)
      return res.status(400).json({ error: 'A written reason of at least 5 characters is required.' });
    if (!isId(req.params.id)) return res.status(404).json({ error: 'User not found.' });

    const user = await M.User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.suspended)
      return res.status(409).json({ error: 'This account is not suspended.' });

    await M.User.findByIdAndUpdate(req.params.id, {
      suspended: false,
      $unset: { suspended_at: 1, suspended_by: 1, suspended_reason: 1 },
    });

    audit(req, 'user_restored', {
      target_type: 'user', target_id: String(user._id),
      detail: { reason: reason.trim().slice(0, 200) },
    });

    res.json({ ok: true, id: String(user._id), status: 'active' });
  }));

  // ---------- SCREEN: Security Events ----------
  router.get('/security-events', ...adminOnly, wrap(async (req, res) => {
    const events = await SecurityEvent.find({}).sort({ created_at: -1 }).limit(20);
    res.json(events.map((ev) => ({
      id: String(ev._id),
      event_type: ev.event_type,
      ip: maskIp(ev.ip),
      path: ev.path || null,
      created_at: ev.created_at,
      details: sanitizeDetails(ev.details),
    })));
  }));

  // ---------- SCREEN: Audit Logs ----------
  router.get('/audit-logs', ...adminOnly, wrap(async (req, res) => {
    const logs = await M.AuditLog.find({
      $or: [
        { role: 'admin' },
        { action: { $in: ['catalog_item_added', 'catalog_item_deleted', 'role_changed', 'user_deleted', 'user_suspended', 'user_restored', 'user_unlocked'] } },
      ],
    }).sort({ created_at: -1 }).limit(50);

    res.json(logs.map((log) => ({
      id: String(log._id),
      action: log.action,
      role: log.role || 'admin',
      target_type: log.target_type || null,
      target_id: log.target_id || null,
      ip: maskIp(log.ip),
      created_at: log.created_at,
      detail: sanitizeDetails(log.detail),
    })));
  }));

  app.use('/admin-api', router);
}

module.exports = { registerAdminRoutes };
