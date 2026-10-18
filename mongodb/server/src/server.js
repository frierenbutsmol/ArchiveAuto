require('dotenv').config();
// Local-only workaround for the querySrv ECONNREFUSED error; hosted servers don't need it.
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const M = require('./models');
const { buildSystemInstruction, askGemini } = require('./ai');
const { sendResetEmail, sendVerifyEmail, resetLinks } = require('./mailer');
const { keysFor, secondsLocked, recordFailure, recordSuccess, waitText } = require('./loginLock');
const { makeAuth } = require('./rbac');
const { registerRoleRoutes } = require('./roleRoutes');
const { registerCatalogRoutes } = require('./catalogRoutes');
const { applySecurity } = require('./security');
const { makeAudit, registerAuditRoutes } = require('./audit');
const { validate, schemas, isId } = require('./validate');
const { sendError } = require('./errors');

const app = express();
app.set('trust proxy', 1);   // Render/Railway terminate HTTPS in front of the app

const audit = makeAudit(M);
app.locals.audit = audit;    // lets requireRole log denied access

// Request id: goes into the logs and into error responses so a problem can be traced.
app.use((req, res, next) => { req.id = crypto.randomUUID(); res.set('X-Request-Id', req.id); next(); });

applySecurity(app, { audit });   // Helmet security headers + rate limiting

// CORS: the mobile app doesn't need it. To restrict browser access, set
// CORS_ORIGINS=https://site-one.com,https://site-two.com
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: '2mb' }));

const sign = (u) => jwt.sign({ id: String(u._id) }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = (u) => ({ id: String(u._id), email: u.email, display_name: u.display_name, avatar_url: u.avatar_url, role: u.role || 'user' });
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Errors are passed to the safe handler at the bottom (details only in the server log).
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Compared against when an email isn't found, so a missing account takes as long to answer as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-0', 10);

// Verifies the token, loads the user, and sets req.userId / req.role (see rbac.js).
const auth = makeAuth({ User: M.User, jwt, secret: process.env.JWT_SECRET });

// ---------- Auth ----------
// Sign-up may only pick 'user' (vehicle owner) or 'mechanic'. Any other value, such as
// 'admin', is refused and written to the audit log. Admins are made with
// `npm run make-admin` or by another admin in the dashboard, never at sign-up.
const SIGNUP_ROLES = ['user', 'mechanic'];
function blockRoleEscalation(req, res, next) {
  const asked = req.body && req.body.role;
  if (asked !== undefined && asked !== null && !SIGNUP_ROLES.includes(asked)) {
    audit(req, 'role_escalation_blocked', {
      target_type: 'user',
      detail: { requested_role: typeof asked === 'string' ? asked : typeof asked },
    });
    return res.status(400).json({ error: 'Role must be user or mechanic.' });
  }
  next();
}

// Creates a fresh 24-hour verification token and emails the link. Returns false if the email
// could not be sent (the account still exists; the user can ask for another email).
const VERIFY_TTL_MINUTES = 30;   // how long the link in the sign-up email stays valid

async function sendVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  await M.VerifyToken.deleteMany({ user_id: user._id });
  await M.VerifyToken.create({ user_id: user._id, token_hash: sha(token), expires_at: new Date(Date.now() + VERIFY_TTL_MINUTES * 60 * 1000) });
  try { await sendVerifyEmail(user.email, token, VERIFY_TTL_MINUTES); return true; }
  catch (e) { console.error('Verification email failed:', e.message); return false; }
}

app.post('/auth/register', blockRoleEscalation, validate(schemas.register), wrap(async (req, res) => {
  const { email, password, display_name } = req.body;
  const role = req.body.role || 'user';   // already checked: only 'user' or 'mechanic' get here
  const existing = await M.User.findOne({ email });
  if (existing && existing.email_verified !== false)
    return res.status(409).json({ error: 'Email already registered.' });

  // No login token is issued here. The account stays locked until the email link is opened.
  // If the email was already signed up but never verified, the new details replace the old
  // ones (only the real owner of the mailbox can ever verify it).
  const password_hash = await bcrypt.hash(password, 10);
  let user = existing;
  if (user) {
    user.set({ password_hash, display_name, role });
    await user.save();
  } else {
    user = await M.User.create({ email, display_name, role, password_hash, email_verified: false });
    audit(req, 'register', { user_id: user._id, target_type: 'user', target_id: user._id, detail: { role } });
  }
  const sent = await sendVerification(user);
  res.status(201).json({ needs_verification: true, email: user.email, email_sent: sent });
}));

// 429 with the time left, used while a login lockout is active.
const loginLocked = (res, seconds) => {
  res.set('Retry-After', String(seconds));
  return res.status(429).json({
    error: `Too many failed attempts. Try again in ${waitText(seconds)}.`,
    code: 'login_locked',
    retry_after: seconds,
  });
};

app.post('/auth/login', validate(schemas.login), wrap(async (req, res) => {
  const { email, password } = req.body;
  const keys = keysFor(req, email);

  // While locked, even the right password is refused.
  const wait = await secondsLocked(M, keys);
  if (wait > 0) {
    audit(req, 'login_locked', { detail: { email } });
    return loginLocked(res, wait);
  }

  const user = await M.User.findOne({ email });
  const matches = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user || !user.password_hash || !matches) {
    audit(req, 'login_failed', { detail: { email } });
    const left = await recordFailure(M, keys);   // same for unknown emails, so nothing is revealed
    if (left === 0) return loginLocked(res, (await secondsLocked(M, keys)) || 300);
    return res.status(401).json({
      error: `Invalid email or password. ${left} ${left === 1 ? 'attempt' : 'attempts'} left before logins are paused.`,
      attempts_left: left,
    });
  }
  await recordSuccess(M, keys);   // right credentials: clear the counters
  if (user.email_verified === false) {   // old accounts have no value here and are fine
    audit(req, 'login_blocked_unverified', { user_id: user._id });
    return res.status(403).json({
      error: 'Please verify your email first. Check your inbox for the verification link.',
      code: 'email_not_verified',
    });
  }
  audit(req, 'login_success', { user_id: user._id });
  res.json({ token: sign(user), user: publicUser(user) });
}));

// Page opened from the verification email. Marks the account as verified.
const verifyPage = (ok, message) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ArchiveAuto</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px 20px">
<h2>${ok ? 'Email verified' : 'Verification failed'}</h2>
<p>${message}</p></body></html>`;

app.get('/verify-email', wrap(async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[a-f0-9]{64}$/.test(token))
    return res.status(400).type('html').send(verifyPage(false, 'This verification link is not valid.'));
  const rec = await M.VerifyToken.findOne({ token_hash: sha(token), expires_at: { $gt: new Date() } });
  if (!rec) {
    audit(req, 'email_verify_failed');
    return res.status(400).type('html').send(verifyPage(false, 'This link is invalid or has expired. Go back to the app, try to log in, and ask for a new verification email.'));
  }
  await M.User.findByIdAndUpdate(rec.user_id, { email_verified: true });
  await M.VerifyToken.deleteMany({ user_id: rec.user_id });
  audit(req, 'email_verified', { user_id: rec.user_id });
  res.type('html').send(verifyPage(true, 'Your account is ready. Go back to the ArchiveAuto app and log in.'));
}));

// Sends another verification email. Always answers 200 so nobody can probe which emails exist.
app.post('/auth/resend-verification', validate(schemas.forgot), wrap(async (req, res) => {
  const user = await M.User.findOne({ email: req.body.email });
  if (user && user.email_verified === false) await sendVerification(user);
  res.json({ ok: true });
}));

// Forgot password: always answers 200 so nobody can probe which emails exist.
app.post('/auth/forgot', validate(schemas.forgot), wrap(async (req, res) => {
  const user = await M.User.findOne({ email: req.body.email });
  audit(req, 'password_reset_requested', { user_id: user?._id, detail: { email: req.body.email } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await M.ResetToken.deleteMany({ user_id: user._id });
    await M.ResetToken.create({ user_id: user._id, token_hash: sha(token), expires_at: new Date(Date.now() + 60 * 60 * 1000) });
    try { await sendResetEmail(user.email, token); }
    catch (e) { console.error('Reset email failed:', e.message); }   // still answer 200 (no email probing)
  }
  res.json({ ok: true });
}));

// Landing page opened from the email: bounces into the app via the archiveauto:// link.
app.get('/reset-password', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).send('Invalid reset link.');
  const { app: deepLink } = resetLinks(token);
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset password</title>
<meta http-equiv="refresh" content="0;url=${deepLink}"></head>
<body style="font-family:sans-serif;text-align:center;padding:48px 20px">
<h2>Opening ArchiveAuto…</h2>
<p><a href="${deepLink}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Open the app</a></p>
<p style="color:#666">Nothing happened? Make sure ArchiveAuto is installed on this phone.</p>
<script>location.href=${JSON.stringify(deepLink)}</script></body></html>`);
});

app.post('/auth/reset', validate(schemas.reset), wrap(async (req, res) => {
  const { token, password } = req.body;
  const rec = await M.ResetToken.findOne({ token_hash: sha(token), expires_at: { $gt: new Date() } });
  if (!rec) {
    audit(req, 'password_reset_failed');
    return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
  }
  await M.User.findByIdAndUpdate(rec.user_id, { password_hash: await bcrypt.hash(password, 10), email_verified: true });
  await rec.deleteOne();
  audit(req, 'password_reset_completed', { user_id: rec.user_id });
  res.json({ ok: true });
}));

// Change password while logged in (replaces supabase.auth.updateUser)
// The current password is required, so someone holding an unlocked phone can't change it.
// A wrong current password answers 400 (not 401), because 401 would sign the user out in the app.
app.put('/auth/password', auth, validate(schemas.password), wrap(async (req, res) => {
  const { current_password, password } = req.body;
  const user = await M.User.findById(req.userId);
  const matches = user?.password_hash ? await bcrypt.compare(current_password, user.password_hash) : false;
  if (!matches) {
    audit(req, 'password_change_failed');
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  }
  if (current_password === password)
    return res.status(400).json({ error: 'Your new password must be different from your current one.' });
  await M.User.findByIdAndUpdate(req.userId, { password_hash: await bcrypt.hash(password, 10) });
  audit(req, 'password_changed');
  res.json({ ok: true });
}));

// ---------- Profile (replaces the `profiles` table) ----------
app.get('/me', auth, wrap(async (req, res) => {
  const user = await M.User.findById(req.userId);
  user ? res.json(publicUser(user)) : res.status(404).json({ error: 'Not found' });
}));

app.put('/me', auth, validate(schemas.profile, { partial: true }), wrap(async (req, res) => {
  const { display_name, avatar_url } = req.body;
  const update = {};
  if (display_name !== undefined) update.display_name = display_name;
  if (avatar_url !== undefined) update.avatar_url = avatar_url;
  const user = await M.User.findByIdAndUpdate(req.userId, update, { new: true });
  audit(req, 'profile_updated', { detail: { fields: Object.keys(update).join(',') } });
  res.json(publicUser(user));
}));

// ---------- Files (documents + repair proof photos) ----------
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const FILE_SECRET = `${process.env.JWT_SECRET}:file`;   // different from the login secret on purpose

// Magic-number check so a renamed .exe can't be stored as a PDF/JPG/PNG.
function looksLike(mime, buf) {
  if (mime === 'application/pdf') return buf.subarray(0, 5).toString('latin1') === '%PDF-';
  if (mime === 'image/png') return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  return false;
}

async function deleteStoredFiles(userId, ids) {
  const valid = ids.filter((i) => mongoose.isValidObjectId(i));
  if (valid.length) await M.StoredFile.deleteMany({ _id: { $in: valid }, user_id: userId });
}

app.post('/files', auth, express.raw({ type: FILE_TYPES, limit: MAX_FILE_BYTES }), wrap(async (req, res) => {
  const mime = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!FILE_TYPES.includes(mime) || !Buffer.isBuffer(req.body) || req.body.length === 0)
    return res.status(400).json({ error: 'Upload a PDF, JPG or PNG file.' });
  if (!looksLike(mime, req.body))
    return res.status(400).json({ error: 'The file content does not match its type.' });

  let name = '';
  try { name = decodeURIComponent(req.headers['x-file-name'] || ''); } catch { /* ignore bad encoding */ }
  const f = await M.StoredFile.create({ user_id: req.userId, name: name.slice(0, 200), mime, size: req.body.length, data: req.body });
  res.status(201).json({ id: String(f._id), name: f.name, mime: f.mime, size: f.size });
}));

// Short-lived link so the phone's browser/PDF viewer can open the file without an Authorization header.
app.post('/files/:id/link', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'File not found.' });
  const f = await M.StoredFile.exists({ _id: req.params.id, user_id: req.userId });
  if (!f) return res.status(404).json({ error: 'File not found.' });
  const t = jwt.sign({ fid: req.params.id, uid: req.userId }, FILE_SECRET, { expiresIn: '10m' });
  const base = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  res.json({ url: `${base}/files/${req.params.id}?t=${encodeURIComponent(t)}` });
}));

app.get('/files/:id', wrap(async (req, res) => {
  let claims;
  try { claims = jwt.verify(String(req.query.t || ''), FILE_SECRET); }
  catch { return res.status(401).send('This link has expired. Open the file again from the app.'); }
  if (claims.fid !== req.params.id || !mongoose.isValidObjectId(req.params.id)) return res.status(404).send('Not found');

  const f = await M.StoredFile.findOne({ _id: req.params.id, user_id: claims.uid }).select('+data');
  if (!f) return res.status(404).send('Not found');
  res.set({
    'Content-Type': f.mime,
    'Content-Length': String(f.data.length),
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.name || 'file')}`,
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(f.data);
}));

app.delete('/files/:id', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'File not found.' });
  const f = await M.StoredFile.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
  f ? res.json({ deleted: true }) : res.status(404).json({ error: 'File not found.' });
}));

// ---------- CRUD, always limited to the logged-in user's own records ----------
function crud(path, Model, { child = false, schema } = {}) {
  const name = path.slice(1);   // used in the audit log, e.g. 'vehicles'
  const r = express.Router();
  r.use(auth);

  r.get('/', wrap(async (req, res) => {
    const filter = { user_id: req.userId };
    if (req.query.vehicle_id !== undefined) {
      if (!isId(req.query.vehicle_id)) return res.status(400).json({ error: 'Invalid vehicle_id.' });
      filter.vehicle_id = req.query.vehicle_id;
    }
    res.json(await Model.find(filter).sort({ created_at: -1 }));
  }));

  r.get('/:id', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const doc = await Model.findOne({ _id: req.params.id, user_id: req.userId });
    doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
  }));

  r.post('/', validate(schema), wrap(async (req, res) => {
    const { id, _id, user_id, added_by, added_by_name, ...data } = req.body;
    if (child) {
      const ok = mongoose.isValidObjectId(data.vehicle_id) &&
        await M.Vehicle.exists({ _id: data.vehicle_id, user_id: req.userId });
      if (!ok) return res.status(400).json({ error: 'Unknown vehicle.' });
    }
    const created = await Model.create({ ...data, user_id: req.userId });
    audit(req, 'record_created', { target_type: name, target_id: created._id });
    res.status(201).json(created);
  }));

  r.put('/:id', validate(schema, { partial: true }), wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const { id, _id, user_id, vehicle_id, added_by, added_by_name, ...data } = req.body;
    const doc = await Model.findOneAndUpdate({ _id: req.params.id, user_id: req.userId }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    audit(req, 'record_updated', { target_type: name, target_id: doc._id });
    res.json(doc);
  }));

  r.delete('/:id', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const doc = await Model.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    audit(req, 'record_deleted', { target_type: name, target_id: doc._id });
    if (Model === M.Vehicle) {   // deleting a vehicle removes its records and uploaded files too
      const q = { vehicle_id: doc._id };
      const [docs, reps, maints] = await Promise.all([M.Document.find(q), M.Repair.find(q), M.MaintenanceRecord.find(q)]);
      await deleteStoredFiles(req.userId, [
        ...docs.map((d) => d.file_path),
        ...reps.map((r) => r.proof_file_path),
        ...maints.map((m) => m.proof_file_path),
      ]);
      await Promise.all([M.MaintenanceRecord, M.Repair, M.PartsReplacement, M.Document, M.VehicleShare].map((m) => m.deleteMany(q)));
    }
    if (Model === M.Document) await deleteStoredFiles(req.userId, [doc.file_path]);
    if (Model === M.Repair || Model === M.MaintenanceRecord) await deleteStoredFiles(req.userId, [doc.proof_file_path]);
    res.json({ deleted: true });
  }));

  app.use(path, r);
}

// Sharing, mechanic and admin routes (roles). Registered before the generic CRUD routes.
registerRoleRoutes(app, { M, auth, wrap, audit });
registerAuditRoutes(app, { M, auth, wrap });
registerCatalogRoutes(app, { M, auth, wrap });   // read-only make/model suggestions

crud('/vehicles', M.Vehicle, { schema: schemas.vehicle });
crud('/maintenance_records', M.MaintenanceRecord, { child: true, schema: schemas.maintenance });
crud('/repairs', M.Repair, { child: true, schema: schemas.repair });
crud('/parts_replacements', M.PartsReplacement, { child: true, schema: schemas.part });
crud('/documents', M.Document, { child: true, schema: schemas.document });

// ---------- AI chat ----------
// The server loads the vehicle's records itself, so the app only sends
// { message, mode, vehicle_id } and nobody can feed the AI someone else's data.
const AI_RECORD_LIMIT = 50;       // newest N records of each kind go into the prompt
const AI_MAX_PER_MINUTE = 15;
const aiHits = new Map();         // userId -> recent request timestamps

function aiRateLimited(userId) {
  const now = Date.now();
  const recent = (aiHits.get(userId) || []).filter((t) => now - t < 60000);
  if (recent.length >= AI_MAX_PER_MINUTE) { aiHits.set(userId, recent); return true; }
  recent.push(now);
  aiHits.set(userId, recent);
  return false;
}

app.post('/ai-chat', auth, wrap(async (req, res) => {
  const { message, mode, vehicle_id } = req.body;
  // Earlier turns of this conversation, so follow-up questions make sense. ai.js cleans and limits them.
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];
  if (typeof message !== 'string' || !message.trim())
    return res.status(400).json({ error: 'Message is required.' });
  if (message.length > 2000)
    return res.status(400).json({ error: 'Message is too long (2000 characters max).' });
  if (aiRateLimited(req.userId))
    return res.status(429).json({ error: 'Too many questions. Please wait a minute and try again.' });

  let ctx = { mode: 'general' };
  if (mode === 'vehicle') {
    if (!mongoose.isValidObjectId(vehicle_id))
      return res.status(400).json({ error: 'A vehicle is required for Vehicle Aware mode.' });
    const vehicle = await M.Vehicle.findOne({ _id: vehicle_id, user_id: req.userId });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    const q = { vehicle_id: vehicle._id, user_id: req.userId };
    const newest = (Model, field) =>
      Model.find(q).sort({ [field]: -1, created_at: -1 }).limit(AI_RECORD_LIMIT);
    const [maintenance, repairs, parts, documents] = await Promise.all([
      newest(M.MaintenanceRecord, 'service_date'),
      newest(M.Repair, 'repair_date'),
      newest(M.PartsReplacement, 'replacement_date'),
      newest(M.Document, 'created_at'),
    ]);
    ctx = { mode: 'vehicle', vehicle, maintenance, repairs, parts, documents };
  }

  try {
    const reply = await askGemini(buildSystemInstruction(ctx), message.trim(), history);
    res.json({ reply });
  } catch (e) {
    console.error('AI chat failed:', e.message);
    res.status(502).json({ error: 'The AI assistant could not answer right now. Please try again.' });
  }
}));

app.get('/health', (_, res) => res.json({ ok: true }));

// Unknown routes
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Every error ends up here: full details go to the server log only, never to the app.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const { status, body } = sendError(err, req);
  res.status(status).json(body);
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('API running')))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });