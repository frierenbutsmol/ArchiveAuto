// API client for the ArchiveAuto server.
// Every method returns { data, error }, so screens can use
// `if (error) { ... }` handling.
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'archiveauto_token';
const ROLE_KEY = 'archiveauto_role';   // cached copy of the role (the server stays the authority)
const TIMEOUT_MS = 60000;

let token = null;
let tokenLoaded = false;
const expiredListeners = new Set();

async function loadToken() {
  if (!tokenLoaded) {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    tokenLoaded = true;
  }
  return token;
}

async function saveToken(value) {
  token = value;
  tokenLoaded = true;
  if (value) await AsyncStorage.setItem(TOKEN_KEY, value);
  else {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ROLE_KEY);
  }
}

async function saveRole(role) {
  if (role) await AsyncStorage.setItem(ROLE_KEY, role);
}

async function request(method, path, body, { noAuth = false, timeoutMs = TIMEOUT_MS, rawBody, headers: extraHeaders } = {}) {
  if (!API_URL) {
    return {
      data: null,
      error: { message: 'EXPO_PUBLIC_API_URL is not set. Add it to your .env and restart Expo.' },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const jwt = noAuth ? null : await loadToken();
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      // rawBody = binary upload (files); otherwise JSON
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }

    if (!res.ok) {
      // Logged-in token rejected: clear it and let the app send the user to Sign In.
      if (res.status === 401 && jwt) {
        await saveToken(null);
        expiredListeners.forEach((fn) => fn());
      }
      return {
        data: null,
        error: { message: json?.error || `Request failed (${res.status}).`, status: res.status, code: json?.code, retryAfter: json?.retry_after },
      };
    }
    return { data: json, error: null };
  } catch (e) {
    return {
      data: null,
      error: {
        message:
          e.name === 'AbortError'
            ? 'The server took too long to respond. Please try again.'
            : 'Cannot reach the server. Check your connection and that the API is running.',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

const qs = (params = {}) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

// Newest first by the given fields (ISO 'YYYY-MM-DD' strings sort correctly as text).
// The server returns rows by created_at; screens that used to ask Supabase for
// `.order('service_date', desc)` call this instead.
export function sortDesc(rows, ...fields) {
  return [...(rows || [])].sort((a, b) => {
    for (const f of fields) {
      const x = a?.[f] ?? '';
      const y = b?.[f] ?? '';
      if (x > y) return -1;
      if (x < y) return 1;
    }
    return 0;
  });
}

const auth = {
  // role: 'user' (vehicle owner, the default) or 'mechanic'. The server refuses anything else.
  async signUp({ email, password, displayName, role = 'user' }) {
    const r = await request('POST', '/auth/register', { email, password, display_name: displayName, role }, { noAuth: true });
    if (r.error) return r;
    // The server no longer logs new accounts in: they must open the email link first.
    if (r.data?.needs_verification) {
      return { data: { needsVerification: true, email: r.data.email, emailSent: r.data.email_sent !== false }, error: null };
    }
    await saveToken(r.data.token);
    await saveRole(r.data.user?.role || 'user');
    return { data: { user: r.data.user }, error: null };
  },

  resendVerification: (email) => request('POST', '/auth/resend-verification', { email }, { noAuth: true }),

  async signIn({ email, password }) {
    const r = await request('POST', '/auth/login', { email, password }, { noAuth: true });
    if (r.error) return r;
    await saveToken(r.data.token);
    await saveRole(r.data.user?.role || 'user');
    return { data: { user: r.data.user }, error: null };
  },

  async signOut() {
    await saveToken(null);
    return { error: null };
  },

  // Returns { data: { user }, error }. user = { id, email, display_name, avatar_url }
  async getUser() {
    if (!(await loadToken())) {
      return { data: { user: null }, error: { message: 'Not logged in' } };
    }
    const r = await request('GET', '/me');
    if (r.error) return { data: { user: null }, error: r.error };
    await saveRole(r.data?.role || 'user');
    return { data: { user: r.data }, error: null };
  },

  // The role last seen on this phone: 'user' | 'mechanic' | 'admin' (null if unknown).
  // Only used to pick a start screen when the server can't be reached.
  cachedRole: () => AsyncStorage.getItem(ROLE_KEY),

  async hasSession() {
    return !!(await loadToken());
  },

  forgotPassword: (email) => request('POST', '/auth/forgot', { email }, { noAuth: true }),
  resetPassword: (resetToken, password) => request('POST', '/auth/reset', { token: resetToken, password }, { noAuth: true }),
  updatePassword: (currentPassword, password) => request('PUT', '/auth/password', { current_password: currentPassword, password }),

  onSessionExpired(fn) {
    expiredListeners.add(fn);
    return () => expiredListeners.delete(fn);
  },
};

export const api = {
  auth,

  // ---------- Owner: share a vehicle with a mechanic ----------
  shares: {
    list: (vehicleId) => request('GET', `/vehicles/${vehicleId}/shares`),
    // target: { email } for a typed address, or { mechanicId } for a mechanic picked from the search list
    add: (vehicleId, { email, mechanicId }) =>
      request('POST', `/vehicles/${vehicleId}/share`, mechanicId ? { mechanic_id: mechanicId } : { email }),
    remove: (vehicleId, mechanicId) => request('DELETE', `/vehicles/${vehicleId}/share/${mechanicId}`),
  },

  // ---------- This user's own service providers, for the shop dropdown in the Add forms ----------
  // [{ name, kind: 'recent' | 'mechanic', last_used, uses }]: shops typed into their own records
  // and mechanics they shared a vehicle with. Never anyone else's.
  providers: {
    list: () => request('GET', '/service-providers'),
  },

  // ---------- Mechanics, found by name or email (the Share screen only) ----------
  mechanics: {
    // [{ id, display_name, email_hint }] (email_hint is masked)
    search: (q) => request('GET', `/mechanics/search?q=${encodeURIComponent(q)}`),
  },

  // ---------- Mechanic: vehicles that owners shared ----------
  mechanic: {
    vehicles: () => request('GET', '/mechanic/vehicles'),
    records: (vehicleId) => request('GET', `/mechanic/vehicles/${vehicleId}/records`),
    addMaintenance: (vehicleId, body) => request('POST', `/mechanic/vehicles/${vehicleId}/maintenance_records`, body),
    addRepair: (vehicleId, body) => request('POST', `/mechanic/vehicles/${vehicleId}/repairs`, body),
  },

  // ---------- Admin: accounts, statistics, audit log ----------
  // ---------- Make / model suggestions for Add Vehicle (read-only catalog) ----------
  catalog: {
    makes: (type) => request('GET', `/catalog/makes${qs({ type })}`),
    models: (type, make) => request('GET', `/catalog/models${qs({ type, make })}`),
  },

  admin: {
    users: (params) => request('GET', `/admin/users${qs(params)}`),
    setRole: (userId, role) => request('PUT', `/admin/users/${userId}/role`, { role }),
    deleteUser: (userId) => request('DELETE', `/admin/users/${userId}`),
    stats: () => request('GET', '/admin/stats'),
    audit: (params) => request('GET', `/admin/audit${qs(params)}`),
  },

  // AI assistant. mode: 'vehicle' | 'general'. Returns { data: { reply }, error }.
  // Longer timeout than normal requests because the AI can take a while.
  // history = the earlier turns of this conversation: [{ role: 'user' | 'assistant', text }, ...]
  chat: ({ message, mode, vehicleId, history = [] }) =>
    request('POST', '/ai-chat', { message, mode, vehicle_id: vehicleId, history }, { timeoutMs: 60000 }),

  // Profile (display_name, avatar_url)
  updateProfile: (fields) => request('PUT', '/me', fields),

  // Data: resource is 'vehicles' | 'maintenance_records' | 'repairs' | 'parts_replacements' | 'documents'
  // The user's oldest vehicle, or null (replaces `.order('created_at').limit(1).maybeSingle()`).
  async firstVehicle() {
    const r = await request('GET', '/vehicles');
    if (r.error) return r;
    const oldest = (r.data || []).reduce(
      (a, b) => (!a || new Date(b.created_at) < new Date(a.created_at) ? b : a),
      null
    );
    return { data: oldest, error: null };
  },

  // Uploaded documents and repair-proof photos (PDF / JPG / PNG, 8 MB max).
  files: {
    // uri comes from expo-document-picker. Resolves { data: { id, name, mime, size }, error }.
    async upload(uri, { mime, name }) {
      let bytes;
      try {
        const res = await fetch(uri);
        if (!res.ok) throw new Error('read failed');
        // ArrayBuffer instead of Blob: React Native can report fetched blobs as text/plain.
        bytes = await res.arrayBuffer();
      } catch {
        return { data: null, error: { message: 'Could not read the selected file.' } };
      }
      return request('POST', '/files', undefined, {
        rawBody: bytes,
        headers: { 'Content-Type': mime, 'X-File-Name': encodeURIComponent(name || '') },
        timeoutMs: 90000,
      });
    },

    // Opens the file in the phone's browser / PDF viewer through a 10-minute link.
    async open(id) {
      if (!/^[a-f0-9]{24}$/.test(id || '')) {
        return {
          data: null,
          error: { message: 'This file was uploaded before the server move and is no longer available. Please upload it again.' },
        };
      }
      const r = await request('POST', `/files/${id}/link`);
      if (r.error) return r;
      try {
        await Linking.openURL(r.data.url);
        return { data: true, error: null };
      } catch {
        return { data: null, error: { message: 'Could not open the file on this device.' } };
      }
    },

    remove: (id) => request('DELETE', `/files/${id}`),
  },

  list: (resource, params) => request('GET', `/${resource}${qs(params)}`),
  get: (resource, id) => request('GET', `/${resource}/${id}`),
  create: (resource, body) => request('POST', `/${resource}`, body),
  update: (resource, id, body) => request('PUT', `/${resource}/${id}`, body),
  remove: (resource, id) => request('DELETE', `/${resource}/${id}`),
};

export default api;