const mongoose = require('mongoose');

// Mask IP addresses for privacy (e.g. 192.168.1.1 -> 192.168.***.***; IPv6 masked to prefix)
function maskIp(ip) {
  if (!ip || typeof ip !== 'string') return 'Unknown';
  const clean = ip.replace(/^::ffff:/, '').trim();
  if (clean === '127.0.0.1' || clean === '::1') return '127.0.***.***';
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }
  if (clean.includes(':')) {
    const parts = clean.split(':').filter(Boolean);
    const prefix = parts.slice(0, 2).join(':');
    return `${prefix || '::'}:****:****`;
  }
  return '***';
}

// Strip any emails or sensitive user identifiers from details objects
function sanitizeDetails(detail) {
  if (!detail || typeof detail !== 'object') return null;
  const safe = {};
  for (const [k, v] of Object.entries(detail)) {
    // Drop any keys named email or user credentials
    if (/email|password|token|secret/i.test(k)) continue;
    if (typeof v === 'string') {
      // Drop any string value containing an email address
      if (v.includes('@') && v.includes('.')) continue;
      safe[k] = v.slice(0, 200);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      safe[k] = v;
    }
  }
  return safe;
}

// Security events collection: automatic 90-day expiry (60 * 60 * 24 * 90 = 7,776,000 seconds)
const securityEventSchema = new mongoose.Schema({
  event_type: { type: String, required: true, index: true },
  ip: { type: String, default: null },
  user_agent: { type: String, default: null },
  path: { type: String, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  created_at: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 60 * 60 * 24 * 90 }, // Automatic 90-day expiry
  },
}, { versionKey: false, collection: 'security_events' });

const SecurityEvent = mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', securityEventSchema);

// Lightweight AI request tracking for "AI requests today" (7-day TTL auto-cleanup)
const aiRequestLogSchema = new mongoose.Schema({
  created_at: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 60 * 60 * 24 * 7 },
  },
}, { versionKey: false, collection: 'ai_request_logs' });

const AiRequestLog = mongoose.models.AiRequestLog || mongoose.model('AiRequestLog', aiRequestLogSchema);

// Log a security event fire-and-forget
function recordSecurityEvent(req, eventType, detail = null) {
  try {
    SecurityEvent.create({
      event_type: eventType,
      ip: req?.ip || null,
      user_agent: String(req?.headers?.['user-agent'] || '').slice(0, 200),
      path: req?.originalUrl || req?.url || null,
      details: sanitizeDetails(detail),
    }).catch((err) => console.error('SecurityEvent write failed:', err.message));
  } catch (err) {
    console.error('SecurityEvent error:', err.message);
  }
}

module.exports = {
  SecurityEvent,
  AiRequestLog,
  recordSecurityEvent,
  maskIp,
  sanitizeDetails,
};
