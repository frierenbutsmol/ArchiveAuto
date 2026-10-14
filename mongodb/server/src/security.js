// Security headers (Helmet) and rate limiting (express-rate-limit).
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const num = (name, fallback) => Number(process.env[name]) || fallback;
const MINUTE = 60 * 1000;

function limiter({ name, windowMs, limit, message, skipSuccessfulRequests = false, audit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,          // RateLimit-* headers tell the app how long to wait
    legacyHeaders: false,
    skipSuccessfulRequests,         // for login: only failed attempts count
    handler: (req, res) => {
      audit?.(req, 'rate_limited', { detail: { limiter: name, path: req.originalUrl } });
      res.status(429).json({ error: message });
    },
  });
}

// Limits are per IP address. Override with environment variables if needed.
function applySecurity(app, { audit } = {}) {
  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },   // so uploaded files can be opened from the app
  }));

  app.use(limiter({
    name: 'general', audit, windowMs: 15 * MINUTE, limit: num('RATE_LIMIT_GENERAL', 1000),
    message: 'Too many requests. Please slow down and try again shortly.',
  }));
  app.use('/auth/login', limiter({
    name: 'login', audit, windowMs: 15 * MINUTE, limit: num('RATE_LIMIT_LOGIN', 10), skipSuccessfulRequests: true,
    message: 'Too many sign-in attempts. Please try again in 15 minutes.',
  }));
  app.use('/auth/register', limiter({
    name: 'register', audit, windowMs: 60 * MINUTE, limit: num('RATE_LIMIT_REGISTER', 10),
    message: 'Too many sign-ups from this network. Please try again later.',
  }));
  app.use('/auth/forgot', limiter({
    name: 'forgot', audit, windowMs: 60 * MINUTE, limit: num('RATE_LIMIT_FORGOT', 5),
    message: 'Too many reset requests. Please try again in an hour.',
  }));
  app.use('/auth/resend-verification', limiter({
    name: 'resend_verification', audit, windowMs: 60 * MINUTE, limit: num('RATE_LIMIT_RESEND', 5),
    message: 'Too many verification emails requested. Please try again in an hour.',
  }));
  app.use('/auth/password', limiter({
    name: 'change_password', audit, windowMs: 15 * MINUTE, limit: num('RATE_LIMIT_CHANGE_PASSWORD', 10), skipSuccessfulRequests: true,
    message: 'Too many attempts. Please try again in 15 minutes.',
  }));
  app.use('/auth/reset', limiter({
    name: 'reset', audit, windowMs: 60 * MINUTE, limit: num('RATE_LIMIT_RESET', 10),
    message: 'Too many attempts. Please try again later.',
  }));
}

module.exports = { applySecurity };