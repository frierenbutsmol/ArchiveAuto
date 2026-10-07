// Builds real notifications from the user's own data:
//  - "service due": last service of a type + its interval vs. the vehicle's odometer
//  - "document expiring": documents.expiry_date within 30 days (or already past)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { formatDistance } from './units';

// Kilometres between services. Only types the user has already logged are checked.
export const SERVICE_INTERVALS_KM = {
  'Oil Change': 5000,
  Tires: 40000,
  Brakes: 30000,
  Fluids: 40000,
  Battery: 50000,
};
const SOON_KM = 500;          // "due soon" window
const DOC_WARN_DAYS = 30;
const DOC_CRITICAL_DAYS = 7;

const DISMISSED_KEY = 'archiveauto_dismissed_alerts';
const SEEN_KEY = 'archiveauto_seen_alerts';

const vehicleName = (v) => v.nickname || [v.make, v.series].filter(Boolean).join(' ') || 'Your vehicle';

function parseLocalDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function buildAlerts({ vehicles, maintenance, repairs, parts, documents, settings, now = new Date() }) {
  const alerts = [];
  const byVehicle = (rows, id) => (rows || []).filter((r) => String(r.vehicle_id) === String(id));
  const metric = settings.useMetric !== false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const v of vehicles || []) {
    const name = vehicleName(v);

    if (settings.mileageReminders) {
      const vMaint = byVehicle(maintenance, v.id);
      // The odometer can be ahead of vehicles.current_mileage, so also look at every record.
      const current = Math.max(
        Number(v.current_mileage) || 0,
        ...[vMaint, byVehicle(repairs, v.id), byVehicle(parts, v.id)].flat().map((r) => Number(r.mileage) || 0)
      );

      for (const [type, interval] of Object.entries(SERVICE_INTERVALS_KM)) {
        const last = vMaint
          .filter((r) => r.maintenance_type === type && Number(r.mileage) > 0)
          .sort((a, b) => Number(b.mileage) - Number(a.mileage))[0];
        if (!last) continue;

        const remaining = Number(last.mileage) + interval - current;
        if (remaining > SOON_KM) continue;

        const overdue = remaining < 0;
        alerts.push({
          id: `svc:${v.id}:${type}:${last.id}`,
          kind: 'service',
          critical: overdue,
          sort: remaining,
          vehicle: v,
          serviceType: type,
          categoryLabel: overdue ? 'Service Overdue' : 'Service Due Soon',
          title: `${type} ${overdue ? 'overdue' : 'due soon'}`,
          message: overdue
            ? `${name} is ${formatDistance(-remaining, metric)} past its ${type.toLowerCase()} interval (last done at ${formatDistance(last.mileage, metric)}).`
            : `${name} is due for ${type.toLowerCase()} in ${formatDistance(remaining, metric)} (last done at ${formatDistance(last.mileage, metric)}).`,
        });
      }
    }

    if (settings.docExpiryAlerts) {
      for (const d of byVehicle(documents, v.id)) {
        const exp = parseLocalDate(d.expiry_date);
        if (!exp) continue;
        const days = Math.round((exp - today) / 86400000);
        if (days > DOC_WARN_DAYS) continue;

        const label = d.document_type || 'Document';
        alerts.push({
          id: `doc:${d.id}:${d.expiry_date}`,
          kind: 'document',
          critical: days <= DOC_CRITICAL_DAYS,
          sort: days,
          vehicle: v,
          categoryLabel: days < 0 ? 'Document Expired' : 'Document Expiry',
          title: days < 0 ? `${label} expired` : `${label} expiring soon`,
          message:
            days < 0
              ? `${name}: ${label} expired ${-days} day${days === -1 ? '' : 's'} ago (${d.expiry_date}).`
              : days === 0
              ? `${name}: ${label} expires today.`
              : `${name}: ${label} expires in ${days} day${days === 1 ? '' : 's'} (${d.expiry_date}).`,
        });
      }
    }
  }

  return alerts.sort((a, b) => Number(b.critical) - Number(a.critical) || a.sort - b.sort);
}

async function readSet(key) {
  try { return new Set(JSON.parse((await AsyncStorage.getItem(key)) || '[]')); }
  catch { return new Set(); }
}
const writeSet = (key, set) => AsyncStorage.setItem(key, JSON.stringify([...set])).catch(() => {});

// Returns { alerts, error }. Dismissed alerts are removed; each alert gets `unread`.
export async function fetchAlerts(settings) {
  const [v, m, r, p, d] = await Promise.all([
    api.list('vehicles'),
    api.list('maintenance_records'),
    api.list('repairs'),
    api.list('parts_replacements'),
    api.list('documents'),
  ]);
  const failed = [v, m, r, p, d].find((x) => x.error);
  if (failed) return { alerts: [], error: failed.error };

  const all = buildAlerts({
    vehicles: v.data, maintenance: m.data, repairs: r.data, parts: p.data, documents: d.data, settings,
  });
  const activeIds = new Set(all.map((a) => a.id));

  // Forget dismissals/reads for alerts that no longer exist (service logged, document renewed).
  const dismissed = await readSet(DISMISSED_KEY);
  const seen = await readSet(SEEN_KEY);
  const keepDismissed = new Set([...dismissed].filter((id) => activeIds.has(id)));
  if (keepDismissed.size !== dismissed.size) writeSet(DISMISSED_KEY, keepDismissed);

  const visible = all.filter((a) => !keepDismissed.has(a.id)).map((a) => ({ ...a, unread: !seen.has(a.id) }));
  writeSet(SEEN_KEY, new Set([...seen, ...visible.map((a) => a.id)].filter((id) => activeIds.has(id))));
  return { alerts: visible, error: null };
}

export async function dismissAlert(id) {
  const dismissed = await readSet(DISMISSED_KEY);
  dismissed.add(id);
  await writeSet(DISMISSED_KEY, dismissed);
}