import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ScreenHeader, EmptyState, ErrorBanner, formatDate, ui } from './RoleUI';

const PAGE = 50;
const FILTERS = [
  { label: 'All', value: null },
  { label: 'Failed logins', value: 'login_failed' },
  { label: 'Access denied', value: 'access_denied' },
  { label: 'Rate limited', value: 'rate_limited' },
  { label: 'Role changes', value: 'role_changed' },
  { label: 'Blocked role attempts', value: 'role_escalation_blocked' },
  { label: 'Deleted users', value: 'user_deleted' },
  { label: 'Logins', value: 'login_success' },
];
const DANGER = new Set(['login_failed', 'access_denied', 'rate_limited', 'user_deleted', 'password_reset_failed', 'role_escalation_blocked']);

const detailText = (d) => (d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ') : '');

// Admin: the security audit log (who did what, when, from where), newest first.
export default function AdminAudit() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (action, skip) => {
    const { data, error: err } = await api.admin.audit({ action: action || undefined, limit: PAGE, skip });
    return { data, err };
  }, []);

  const load = useCallback(async (action = filter) => {
    const { data, err } = await fetchPage(action, 0);
    setError(err ? err.message : '');
    if (data) { setRows(data); setMore(data.length === PAGE); }
    else setRows((r) => r || []);
  }, [filter, fetchPage]);

  useFocusEffect(useCallback(() => { load(); /* eslint-disable-next-line */ }, []));

  const pick = (value) => {
    setFilter(value);
    setRows(null);
    load(value);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !more || !rows) return;
    setLoadingMore(true);
    const { data } = await fetchPage(filter, rows.length);
    if (data) { setRows([...rows, ...data]); setMore(data.length === PAGE); }
    setLoadingMore(false);
  };

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Audit Log" subtitle="Security events, newest first" />

      <View style={{ height: 52 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f.label} onPress={() => pick(f.value)} style={[ui.chip, filter === f.value && ui.chipActive]}>
              <Text style={[ui.chipText, filter === f.value && ui.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {rows === null ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) => r.id || String(i)}
          contentContainerStyle={ui.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={<ErrorBanner message={error} onRetry={() => load()} />}
          ListEmptyComponent={!error ? <EmptyState icon="document-text-outline" text="No events found." /> : null}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ margin: 16 }} /> : null}
          renderItem={({ item }) => (
            <View style={ui.card}>
              <View style={ui.rowBetween}>
                <Text style={[ui.cardTitle, { fontSize: 14, color: DANGER.has(item.action) ? COLORS.danger : COLORS.textPrimary }]}>
                  {String(item.action).replace(/_/g, ' ')}
                </Text>
                {item.role ? <Text style={ui.cardMuted}>{item.role}</Text> : null}
              </View>
              <Text style={ui.cardMuted}>{formatDate(item.created_at)}{item.ip ? `  ·  ${item.ip}` : ''}</Text>
              {item.target_type ? <Text style={ui.cardMuted}>Target: {item.target_type}</Text> : null}
              {detailText(item.detail) ? <Text style={ui.cardMeta}>{detailText(item.detail)}</Text> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}