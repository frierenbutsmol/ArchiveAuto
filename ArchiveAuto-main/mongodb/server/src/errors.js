// Turns any error into a safe response. Full details go to the server log only,
// so database messages, stack traces and file paths never reach the app.
function sendError(err, req) {
  if (err.name === 'ValidationError' && err.errors) {            // mongoose
    const fields = {};
    for (const [path, e] of Object.entries(err.errors)) fields[path] = e.kind === 'required' ? 'is required' : 'is invalid';
    return { status: 400, body: { error: 'Some fields are missing or invalid.', fields } };
  }
  if (err.name === 'CastError') return { status: 400, body: { error: `Invalid value for ${err.path}.` } };
  if (err.code === 11000) return { status: 409, body: { error: 'That value is already in use.' } };
  if (err.type === 'entity.too.large') return { status: 413, body: { error: 'That upload is too large.' } };
  if (err.type === 'entity.parse.failed') return { status: 400, body: { error: 'The request contains invalid JSON.' } };
  if (err.status >= 400 && err.status < 500) return { status: err.status, body: { error: 'Bad request.' } };

  console.error(`[${req.id}] Unhandled error:`, err);              // the only place details go
  return { status: 500, body: { error: 'Something went wrong. Please try again.', request_id: req.id } };
}

module.exports = { sendError };