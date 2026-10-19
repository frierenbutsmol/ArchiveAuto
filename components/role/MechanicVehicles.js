import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ScreenHeader, EmptyState, ErrorBanner, ui } from './RoleUI';

const vehicleName = (v) => v.nickname || [v.make, v.series].filter(Boolean).join(' ') || 'Vehicle';

// Vehicles the mechanic has already opened. Anything not in this list is shown as NEW,
// so a vehicle an owner just shared is easy to spot.
const SEEN_KEY = 'mechanic_seen_vehicle_ids';

// Mechanic home: vehicles that owners shared with this mechanic.
export default function MechanicVehicles() {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [seen, setSeen] = useState(null);   // Set of opened vehicle ids (null = not loaded yet)

  const load = useCallback(async () => {
    const { data, error: err } = await api.mechanic.vehicles();
    setError(err ? err.message : '');
    if (data) setVehicles(data);
    else if (!vehicles) setVehicles([]);
    try {
      const raw = await AsyncStorage.getItem(SEEN_KEY);
      setSeen(new Set(raw ? JSON.parse(raw) : []));
    } catch (e) {
      setSeen(new Set());
    }
  }, [vehicles]);

  const isNew = (id) => seen !== null && !seen.has(id);
  const newCount = (vehicles || []).filter((v) => isNew(v.id)).length;

  // Opening a vehicle marks it as seen.
  const openVehicle = (item) => {
    const next = new Set(seen || []);
    next.add(item.id);
    setSeen(next);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...next])).catch(() => {});
    navigation.navigate('MechanicVehicleDetail', { vehicle: item });
  };

  useFocusEffect(useCallback(() => { load(); /* eslint-disable-next-line */ }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Shared Vehicles" subtitle="Vehicles owners shared with you" />

      {vehicles === null ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(v) => v.id}
          contentContainerStyle={ui.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <>
              <ErrorBanner message={error} onRetry={load} />
              {newCount > 0 && (
                <View style={local.banner}>
                  <Ionicons name="notifications" size={18} color={COLORS.success} />
                  <Text style={local.bannerText}>
                    {newCount === 1
                      ? '1 new vehicle was shared with you'
                      : `${newCount} new vehicles were shared with you`}
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <EmptyState icon="car-outline" text="No vehicles shared with you yet. Ask an owner to share one using your account email." />
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={ui.card}
              activeOpacity={0.85}
              onPress={() => openVehicle(item)}>
              <View style={ui.rowBetween}>
                <View style={{ flex: 1 }}>
                  <View style={local.titleRow}>
                    <Text style={[ui.cardTitle, { flexShrink: 1 }]} numberOfLines={1}>{vehicleName(item)}</Text>
                    {isNew(item.id) && (
                      <View style={local.newPill}>
                        <Text style={local.newPillText}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={ui.cardMeta}>
                    {[item.year, item.make, item.series].filter(Boolean).join(' ')}
                  </Text>
                  <Text style={ui.cardMuted}>Owner: {item.owner_name || 'Unknown'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  bannerText: { color: COLORS.success, fontSize: 14, fontWeight: '600', marginLeft: 10, flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  newPill: {
    backgroundColor: COLORS.successMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  newPillText: { color: COLORS.success, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});