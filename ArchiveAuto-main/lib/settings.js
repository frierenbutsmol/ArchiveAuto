// Saved app preferences (per device). Use the hook in screens: const settings = useSettings();
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'archiveauto_settings';
export const DEFAULTS = { mileageReminders: true, docExpiryAlerts: true, useMetric: true };

let cache = null;
const listeners = new Set();

export async function loadSettings() {
  if (!cache) {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      cache = { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
    } catch {
      cache = { ...DEFAULTS };
    }
  }
  return cache;
}

export async function updateSettings(patch) {
  cache = { ...(await loadSettings()), ...patch };
  listeners.forEach((fn) => fn(cache));
  try { await AsyncStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* keep in memory */ }
  return cache;
}

export function useSettings() {
  const [settings, setSettings] = useState(cache || DEFAULTS);
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setSettings(s));
    listeners.add(setSettings);
    return () => { alive = false; listeners.delete(setSettings); };
  }, []);
  return settings;
}