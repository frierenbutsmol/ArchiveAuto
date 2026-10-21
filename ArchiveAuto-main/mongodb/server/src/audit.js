// Audit log: a record of security-relevant events (who did what, when, from where).
// Never store passwords, tokens or reset links here.
const { requireRole } = require('./rbac');
const { isId } = require('./validate');

// Keep details small and plain: no nested objects, strings cut to 200 characters.
function clip(detail) {
  if (!detail || typeof detail !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(detail).slice(0, 10)) {
    out[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v).slice(0, 200);
  }
  return out;
}

function makeAudit(M) {
  // Fire-and-forget: a logging problem must never break the request.
  return function audit(req, action, extra = {}) {
    try {
      M.AuditLog.create({
        action,
        user_id: req.userId || extra.user_id || undefined,
        role: req.role,
        target_type: extra.target_type,
        target_id: extra.target_id ? String(extra.target_id) : undefined,
        ip: req.ip,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
        request_id: req.id,
        detail: clip(extra.detail),
      }).catch((e) => console.error('Audit write failed:', e.message));
    } catch (e) {
      console.error('Audit failed:', e.message);
    }
  };
}

// Admins can read the log: GET /admin/audit?action=login_failed&user_id=...&limit=50&skip=0
function registerAuditRoutes(app, { M, auth, wrap }) {
  app.get('/admin/audit', auth, requireRole('admin'), wrap(async (req, res) => {
    const filter = {};
    if (req.query.action !== undefined) {
      if (typeof req.query.action !== 'string' || req.query.action.length > 50)
        return res.status(400).json({ error: 'Invalid action filter.' });
      filter.action = req.query.action;
    }
    if (req.query.user_id !== undefined) {
      if (!isId(req.query.user_id)) return res.status(400).json({ error: 'Invalid user_id filter.' });
      filter.user_id = req.query.user_id;
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const rows = await M.AuditLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit);
    res.json(rows.map((r) => r.toJSON()));
  }));
}

module.exports = { makeAudit, registerAuditRoutes };