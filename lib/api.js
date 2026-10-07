// API client for the ArchiveAuto server (replaces lib/supabase.js).
// Every method returns { data, error } like supabase-js did, so screens
// can keep their existing `if (error) { ... }` handling.
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'archiveauto_token';
const TIMEOUT_MS = 15000;

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
  else await AsyncStorage.removeItem(TOKEN_KEY);
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
        error: { message: json?.error || `Request failed (${res.status}).`, status: res.status },
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
  async signUp({ email, password, displayName }) {
    const r = await request('POST', '/auth/register', { email, password, display_name: displayName }, { noAuth: true });
    if (r.error) return r;
    await saveToken(r.data.token);
    return { data: { user: r.data.user }, error: null };
  },

  async signIn({ email, password }) {
    const r = await request('POST', '/auth/login', { email, password }, { noAuth: true });
    if (r.error) return r;
    await saveToken(r.data.token);
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
    return r.error ? { data: { user: null }, error: r.error } : { data: { user: r.data }, error: null };
  },

  async hasSession() {
    return !!(await loadToken());
  },

  forgotPassword: (email) => request('POST', '/auth/forgot', { email }, { noAuth: true }),
  resetPassword: (resetToken, password) => request('POST', '/auth/reset', { token: resetToken, password }, { noAuth: true }),
  updatePassword: (password) => request('PUT', '/auth/password', { password }),

  onSessionExpired(fn) {
    expiredListeners.add(fn);
    return () => expiredListeners.delete(fn);
  },
};

export const api = {
  auth,

  // AI assistant. mode: 'vehicle' | 'general'. Returns { data: { reply }, error }.
  // Longer timeout than normal requests because the AI can take a while.
  chat: ({ message, mode, vehicleId }) =>
    request('POST', '/ai-chat', { message, mode, vehicle_id: vehicleId }, { timeoutMs: 60000 }),

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