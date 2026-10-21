import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ScreenHeader, ErrorBanner, ui } from './RoleUI';

function Stat({ value, label }) {
  return (
    <View style={ui.statCard}>
      <Text style={ui.statValue}>{value ?? '-'}</Text>
      <Text style={ui.statLabel}>{label}</Text>
    </View>
  );
}

// Admin: account and record counts. Numbers only; no private owner data.
export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await api.admin.stats();
    setError(err ? err.message : '');
    if (data) setStats(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Statistics" subtitle="Overview of the whole system" />
      <ScrollView
        contentContainerStyle={ui.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <ErrorBanner message={error} onRetry={load} />
        {!stats && !error ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : stats ? (
          <>
            <Text style={[ui.sectionTitle, { marginTop: 0 }]}>Accounts</Text>
            <View style={ui.statGrid}>
              <Stat value={stats.users.total} label="Total accounts" />
              <Stat value={stats.users.user} label="Vehicle owners" />
              <Stat value={stats.users.admin} label="Admins" />
            </View>

            <Text style={ui.sectionTitle}>Records</Text>
            <View style={ui.statGrid}>
              <Stat value={stats.vehicles} label="Vehicles" />
              <Stat value={stats.maintenance_records} label="Maintenance records" />
              <Stat value={stats.repairs} label="Repairs" />
              <Stat value={stats.documents} label="Documents" />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}