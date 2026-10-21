import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';
import { useSettings } from '../lib/settings';
import { formatDistance } from '../lib/units';
import { formatMoney } from './FormKit';
import { ScreenHeader, EmptyState, ErrorBanner, ui } from './role/RoleUI';

// One timeline of everything recorded for a vehicle: maintenance, repairs and documents.

const KINDS = {
  maintenance: { label: 'Maintenance', color: COLORS.primary, bg: COLORS.primaryMuted, icon: 'wrench' },
  repair: { label: 'Repair', color: COLORS.warning, bg: COLORS.warningMuted, icon: 'tools' },
  document: { label: 'Document', color: COLORS.success, bg: COLORS.successMuted, icon: 'file-document-outline' },
};
const FILTERS = [
  ['all', 'All'],
  ['maintenance', 'Maintenance'],
  ['repair', 'Repairs'],
  ['document', 'Documents'],
];

const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
const asDate = (d) => (d ? new Date(`${d}T00:00:00`) : null);
const fmtDate = (d) =>
  d ? asDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';
const monthLabel = (d) =>
  d ? asDate(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No date';
const vehicleLabel = (v) =>
  v?.nickname || [v?.year, v?.make, v?.series].filter(Boolean).join(' ') || 'Vehicle';

function buildItems({ maintenance, repairs, documents }) {
  const items = [];

  for (const m of maintenance) {
    const title = m.maintenance_type || 'Maintenance';
    items.push({
      id: `m${m.id}`,
      kind: 'maintenance',
      date: day(m.service_date) || day(m.created_at),
      title,
      detail: [m.description && m.description !== title ? m.description : '', m.shop_name]
        .filter(Boolean)
        .join(' · '),
      mileage: Number(m.mileage) || 0,
      cost: Number(m.cost) || 0,
    });
  }

  for (const r of repairs) {
    const hasDescription = !!r.description;
    items.push({
      id: `r${r.id}`,
      kind: 'repair',
      date: day(r.repair_date) || day(r.created_at),
      title: r.description || r.repair_type || 'Repair',
      detail: [hasDescription ? r.repair_type : '', r.shop_name].filter(Boolean).join(' · '),
      mileage: Number(r.mileage) || 0,
      cost: Number(r.cost) || 0,
      badge: r.proof_file_path ? { text: 'Receipt attached', tone: 'ok' } : null,
    });
  }

  for (const d of documents) {
    const expiry = day(d.expiry_date);
    let badge = null;
    if (expiry) {
      const days = Math.round((asDate(expiry) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
      badge = {
        text: days < 0 ? `Expired ${fmtDate(expiry)}` : `Expires ${fmtDate(expiry)}`,
        tone: days < 0 ? 'bad' : days <= 30 ? 'warn' : 'muted',
      };
    }
    items.push({
      id: `d${d.id}`,
      kind: 'document',
      date: day(d.issue_date) || day(d.created_at),
      title: d.document_type || 'Document',
      detail: d.notes || '',
      mileage: 0,
      cost: 0,
      badge,
    });
  }

  // Newest first; records with no date go last.
  return items.sort((a, b) => (a.date === b.date ? 0 : !a.date ? 1 : !b.date ? -1 : a.date < b.date ? 1 : -1));
}

const TONE = {
  ok: COLORS.success,
  warn: COLORS.warning,
  bad: COLORS.danger,
  muted: COLORS.textMuted,
};

export default function VehicleHistory() {
  const navigation = useNavigation();
  const route = useRoute();
  const { useMetric } = useSettings();

  const [vehicle, setVehicle] = useState(route.params?.vehicle || null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      let v = route.params?.vehicle || vehicle;
      if (!v?.id) {
        const first = await api.firstVehicle();
        if (first.error) throw new Error(first.error.message);
        v = first.data;
      }
      if (!v?.id) {
        setVehicle(null);
        setItems([]);
        return;
      }
      setVehicle(v);

      const [m, r, d] = await Promise.all([
        api.list('maintenance_records', { vehicle_id: v.id }),
        api.list('repairs', { vehicle_id: v.id }),
        api.list('documents', { vehicle_id: v.id }),
      ]);
      const failed = m.error || r.error || d.error;
      if (failed) setError(failed.message || 'Could not load everything.');
      setItems(buildItems({ maintenance: m.data || [], repairs: r.data || [], documents: d.data || [] }));
    } catch (e) {
      setError(e.message || 'Could not load the history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params?.vehicle, vehicle]);

  // Reload each time the screen is shown, so new records appear after adding them.
  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.vehicle?.id])
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      maintenance: items.filter((i) => i.kind === 'maintenance').length,
      repair: items.filter((i) => i.kind === 'repair').length,
      document: items.filter((i) => i.kind === 'document').length,
    }),
    [items]
  );
  const totalSpent = useMemo(
    () => Math.round(items.reduce((t, i) => t + i.cost, 0) * 100) / 100,
    [items]
  );
  const odometer = useMemo(
    () => Math.max(Number(vehicle?.current_mileage) || 0, ...items.map((i) => i.mileage)),
    [items, vehicle]
  );

  const visible = filter === 'all' ? items : items.filter((i) => i.kind === filter);

  // Group by month for the section headings.
  const groups = useMemo(() => {
    const out = [];
    for (const it of visible) {
      const key = it.date ? it.date.slice(0, 7) : 'none';
      if (!out.length || out[out.length - 1].key !== key) out.push({ key, label: monthLabel(it.date), rows: [] });
      out[out.length - 1].rows.push(it);
    }
    return out;
  }, [visible]);

  // Exports the full history as a PDF document and opens the share sheet.
  const exportHistory = async () => {
    const esc = (v) =>
      String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows = items
      .map(
        (i) =>
          `<tr><td>${esc(fmtDate(i.date))}</td><td>${esc(KINDS[i.kind].label)}</td>` +
          `<td>${esc(i.title)}${i.detail ? `<br/><small>${esc(i.detail)}</small>` : ''}</td>` +
          `<td>${i.mileage ? esc(formatDistance(i.mileage, useMetric)) : ''}</td>` +
          `<td style="text-align:right">${i.cost ? `₱${esc(formatMoney(i.cost))}` : ''}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <style>
        body{font-family:Helvetica,Arial,sans-serif;color:#111;padding:24px}
        h1{margin:0 0 4px;font-size:22px} p{margin:0 0 4px;color:#444}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
        th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#f3f3f3} small{color:#666}
      </style></head><body>
      <h1>${esc(vehicleLabel(vehicle))} - Vehicle History</h1>
      <p>${counts.maintenance} maintenance, ${counts.repair} repairs, ${counts.document} documents</p>
      <p><b>Total spent: ₱${esc(formatMoney(totalSpent))}</b></p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Mileage</th><th>Cost</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `${vehicleLabel(vehicle)} history`,
        });
      } else {
        setError('Sharing is not available on this device.');
      }
    } catch (e) {
      setError(e?.message || 'Could not export the history.');
    }
  };

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader
        title="Vehicle History"
        subtitle={vehicle ? vehicleLabel(vehicle) : undefined}
        onBack={() => navigation.goBack()}
        right={
          items.length > 0 ? (
            <TouchableOpacity
              onPress={exportHistory}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Export to document"
            >
              <Ionicons name="share-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={ui.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        <ErrorBanner message={error} onRetry={load} />

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : !vehicle ? (
          <EmptyState icon="car-outline" text="Add a vehicle first, then its history will show up here." />
        ) : items.length === 0 ? (
          <EmptyState
            icon="time-outline"
            text="Nothing recorded yet. Log a service, a repair or a document and it will appear here."
          />
        ) : (
          <>
            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
                <Text style={styles.summaryValue}>₱{formatMoney(totalSpent)}</Text>
              </View>
              <View style={[styles.summaryCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.summaryLabel}>LATEST ODOMETER</Text>
                <Text style={styles.summaryValue}>
                  {odometer > 0 ? formatDistance(odometer, useMetric) : '—'}
                </Text>
              </View>
            </View>

            {/* Filters */}
            <View style={[ui.chipRow, { marginTop: SPACING.md }]}>
              {FILTERS.map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[ui.chip, filter === key && ui.chipActive]}
                  onPress={() => setFilter(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[ui.chipText, filter === key && ui.chipTextActive]}>
                    {label} {counts[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Timeline */}
            {visible.length === 0 ? (
              <EmptyState icon="filter-outline" text="No records of this kind." />
            ) : (
              groups.map((g, gi) => (
                <View key={g.key}>
                  <Text style={styles.monthHeader}>{g.label}</Text>
                  {g.rows.map((it, ri) => {
                    const k = KINDS[it.kind];
                    const isLast = gi === groups.length - 1 && ri === g.rows.length - 1;
                    return (
                      <View key={it.id} style={styles.row}>
                        <View style={styles.rail}>
                          <View style={[styles.dot, { backgroundColor: k.bg, borderColor: k.color }]}>
                            <MaterialCommunityIcons name={k.icon} size={14} color={k.color} />
                          </View>
                          {!isLast && <View style={styles.line} />}
                        </View>

                        <View style={styles.card}>
                          <View style={ui.rowBetween}>
                            <Text style={styles.title} numberOfLines={2}>{it.title}</Text>
                            {it.cost > 0 && <Text style={styles.cost}>₱{formatMoney(it.cost)}</Text>}
                          </View>
                          <Text style={styles.meta}>
                            {fmtDate(it.date)}
                            {it.mileage ? ` · ${formatDistance(it.mileage, useMetric)}` : ''}
                          </Text>
                          <Text style={[styles.kindTag, { color: k.color }]}>{k.label}</Text>
                          {!!it.detail && <Text style={styles.detail}>{it.detail}</Text>}
                          {it.badge && (
                            <Text style={[styles.badge, { color: TONE[it.badge.tone] }]}>{it.badge.text}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.lg,
  },
  summaryCol: { flex: 1 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  summaryValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 4 },
  monthHeader: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  row: { flexDirection: 'row' },
  rail: { width: 34, alignItems: 'center' },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 2 },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginLeft: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', paddingRight: 8 },
  cost: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  meta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  kindTag: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  detail: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6 },
  badge: { fontSize: 12, fontWeight: '600', marginTop: 6 },
});