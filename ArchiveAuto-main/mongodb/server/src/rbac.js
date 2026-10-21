// Role-based access control (RBAC): the three roles and the two middlewares.
//
//   user      manages their own vehicles and records (every account starts here)
//   mechanic  can see vehicles that owners shared with them and add service records
//   admin     manages accounts and roles; cannot read owners' private records
const ROLES = ['user', 'mechanic', 'admin'];

// Checks the login token, then loads the user from the database so that role
// changes and deleted accounts take effect immediately (the token only holds the id).
function makeAuth({ User, jwt, secret }) {
  return async function auth(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    let id;
    try { id = jwt.verify(token, secret).id; }
    catch { return res.status(401).json({ error: 'Unauthorized' }); }

    try {
      const user = await User.findById(id);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (user.suspended) return res.status(403).json({ error: 'Account suspended. Please contact support.', code: 'account_suspended' });
      req.userId = String(user._id);
      req.role = ROLES.includes(user.role) ? user.role : 'user';   // old accounts have no role yet
      req.displayName = user.display_name || null;
      next();
    } catch (e) { next(e); }
  };
}

// Use after `auth`: requireRole('admin') or requireRole('mechanic', 'admin').
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.role)) {
      req.app.locals.audit?.(req, 'access_denied', { detail: { method: req.method, path: req.originalUrl } });
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = { ROLES, makeAuth, requireRole };