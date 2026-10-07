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
const { sendResetEmail, resetLinks } = require('./mailer');

const app = express();
app.set('trust proxy', 1);   // Render/Railway terminate HTTPS in front of the app
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const sign = (u) => jwt.sign({ id: String(u._id) }, process.env.JWT_SECRET, { expiresIn: '30d' });
const publicUser = (u) => ({ id: String(u._id), email: u.email, display_name: u.display_name, avatar_url: u.avatar_url });
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(e.name === 'ValidationError' || e.name === 'CastError' ? 400 : 500).json({ error: e.message });
});

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
}

// ---------- Auth ----------
app.post('/auth/register', wrap(async (req, res) => {
  const { email, password, display_name } = req.body;
  if (!email || !password || password.length < 6)
    return res.status(400).json({ error: 'Email and a password of 6+ characters are required.' });
  if (await M.User.findOne({ email: email.toLowerCase().trim() }))
    return res.status(409).json({ error: 'Email already registered.' });
  const user = await M.User.create({
    email, display_name, password_hash: await bcrypt.hash(password, 10),
  });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

app.post('/auth/login', wrap(async (req, res) => {
  const user = await M.User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
  if (!user || !user.password_hash || !(await bcrypt.compare(req.body.password || '', user.password_hash)))
    return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ token: sign(user), user: publicUser(user) });
}));

// Forgot password: always answers 200 so nobody can probe which emails exist.
app.post('/auth/forgot', wrap(async (req, res) => {
  const user = await M.User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
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

app.post('/auth/reset', wrap(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6)
    return res.status(400).json({ error: 'Token and a password of 6+ characters are required.' });
  const rec = await M.ResetToken.findOne({ token_hash: sha(token), expires_at: { $gt: new Date() } });
  if (!rec) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
  await M.User.findByIdAndUpdate(rec.user_id, { password_hash: await bcrypt.hash(password, 10) });
  await rec.deleteOne();
  res.json({ ok: true });
}));

// Change password while logged in (replaces supabase.auth.updateUser)
app.put('/auth/password', auth, wrap(async (req, res) => {
  if (!req.body.password || req.body.password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  await M.User.findByIdAndUpdate(req.userId, { password_hash: await bcrypt.hash(req.body.password, 10) });
  res.json({ ok: true });
}));

// ---------- Profile (replaces the `profiles` table) ----------
app.get('/me', auth, wrap(async (req, res) => {
  const user = await M.User.findById(req.userId);
  user ? res.json(publicUser(user)) : res.status(404).json({ error: 'Not found' });
}));

app.put('/me', auth, wrap(async (req, res) => {
  const { display_name, avatar_url } = req.body;
  const update = {};
  if (display_name !== undefined) update.display_name = display_name;
  if (avatar_url !== undefined) update.avatar_url = avatar_url;
  const user = await M.User.findByIdAndUpdate(req.userId, update, { new: true });
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
function crud(path, Model, { child = false } = {}) {
  const r = express.Router();
  r.use(auth);

  r.get('/', wrap(async (req, res) => {
    const filter = { user_id: req.userId };
    if (req.query.vehicle_id) filter.vehicle_id = req.query.vehicle_id;
    res.json(await Model.find(filter).sort({ created_at: -1 }));
  }));

  r.get('/:id', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const doc = await Model.findOne({ _id: req.params.id, user_id: req.userId });
    doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
  }));

  r.post('/', wrap(async (req, res) => {
    const { id, _id, user_id, ...data } = req.body;
    if (child) {
      const ok = mongoose.isValidObjectId(data.vehicle_id) &&
        await M.Vehicle.exists({ _id: data.vehicle_id, user_id: req.userId });
      if (!ok) return res.status(400).json({ error: 'Unknown vehicle.' });
    }
    res.status(201).json(await Model.create({ ...data, user_id: req.userId }));
  }));

  r.put('/:id', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const { id, _id, user_id, vehicle_id, ...data } = req.body;
    const doc = await Model.findOneAndUpdate({ _id: req.params.id, user_id: req.userId }, data, { new: true, runValidators: true });
    doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
  }));

  r.delete('/:id', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const doc = await Model.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (Model === M.Vehicle) {   // deleting a vehicle removes its records and uploaded files too
      const q = { vehicle_id: doc._id };
      const [docs, reps] = await Promise.all([M.Document.find(q), M.Repair.find(q)]);
      await deleteStoredFiles(req.userId, [...docs.map((d) => d.file_path), ...reps.map((r) => r.proof_file_path)]);
      await Promise.all([M.MaintenanceRecord, M.Repair, M.PartsReplacement, M.Document].map((m) => m.deleteMany(q)));
    }
    if (Model === M.Document) await deleteStoredFiles(req.userId, [doc.file_path]);
    if (Model === M.Repair) await deleteStoredFiles(req.userId, [doc.proof_file_path]);
    res.json({ deleted: true });
  }));

  app.use(path, r);
}

crud('/vehicles', M.Vehicle);
crud('/maintenance_records', M.MaintenanceRecord, { child: true });
crud('/repairs', M.Repair, { child: true });
crud('/parts_replacements', M.PartsReplacement, { child: true });
crud('/documents', M.Document, { child: true });

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
    const reply = await askGemini(buildSystemInstruction(ctx), message.trim());
    res.json({ reply });
  } catch (e) {
    console.error('AI chat failed:', e.message);
    res.status(502).json({ error: 'The AI assistant could not answer right now. Please try again.' });
  }
}));

app.get('/health', (_, res) => res.json({ ok: true }));

// Body-parser errors (file too big, malformed JSON) answered as JSON, not HTML.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File is too large (8 MB max).' });
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : 'Server error.' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('API running')))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });