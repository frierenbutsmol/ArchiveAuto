// Escalating login lockout.
//   5 failed logins  -> logins are paused for 5 minutes
//   5 more failures  -> 10 minutes, then 20, 40 and 60 (the last step repeats)
// A successful login clears the counters, and unused counters expire after 24 hours.
//
// Failures are counted per typed email address (so it works for emails that do not exist and
// never reveals which emails are registered) and per client IP address (so repeatedly mistyping
// the email, or trying one password against many emails, is caught too).
// Note: people on the same Wi-Fi share an IP address. If that gets in the way, raise
// LOGIN_MAX_FAILURES_IP in the server's environment.
const MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES) || 5;
const MAX_FAILURES_IP = Number(process.env.LOGIN_MAX_FAILURES_IP) || MAX_FAILURES;
const LOCK_MINUTES = [5, 10, 20, 40, 60];
const KEEP_MS = 24 * 60 * 60 * 1000;

const keysFor = (req, email) => [`e:${email}`, `ip:${req.ip}`];
const maxFor = (key) => (key.startsWith('ip:') ? MAX_FAILURES_IP : MAX_FAILURES);

// Seconds left on the longest active lock for these keys (0 = not locked).
async function secondsLocked(M, keys) {
  const now = Date.now();
  const rows = await M.LoginAttempt.find({ key: { $in: keys }, locked_until: { $gt: new Date(now) } });
  return rows.reduce((max, r) => Math.max(max, Math.ceil((r.locked_until.getTime() - now) / 1000)), 0);
}

async function bump(M, key, now) {
  const update = { $inc: { failures: 1 }, $set: { expire_at: new Date(now + KEEP_MS) } };
  try {
    return await M.LoginAttempt.findOneAndUpdate({ key }, update, { upsert: true, new: true });
  } catch (e) {
    if (e.code !== 11000) throw e;   // two first attempts at once: the row exists now, so retry
    return M.LoginAttempt.findOneAndUpdate({ key }, update, { new: true });
  }
}

// Counts one failed login. Returns the attempts left before the next lock (0 = just locked).
async function recordFailure(M, keys) {
  let left = Infinity;
  for (const key of keys) {
    const now = Date.now();
    const row = await bump(M, key, now);
    if (row.failures >= maxFor(key)) {
      const minutes = LOCK_MINUTES[Math.min(row.level, LOCK_MINUTES.length - 1)];
      const until = now + minutes * 60 * 1000;
      await M.LoginAttempt.updateOne(
        { key },
        { $set: { failures: 0, locked_until: new Date(until), expire_at: new Date(until + KEEP_MS) }, $inc: { level: 1 } }
      );
      left = 0;
    } else {
      left = Math.min(left, maxFor(key) - row.failures);
    }
  }
  return left;
}

const recordSuccess = (M, keys) => M.LoginAttempt.deleteMany({ key: { $in: keys } });

const waitText = (s) => {
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.ceil(s / 60);
  return `${m} minute${m === 1 ? '' : 's'}`;
};

module.exports = { keysFor, secondsLocked, recordFailure, recordSuccess, waitText, MAX_FAILURES, LOCK_MINUTES };