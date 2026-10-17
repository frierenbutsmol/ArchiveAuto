import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ScreenHeader, EmptyState, ErrorBanner, ui } from './RoleUI';

const vehicleName = (v) => v.nickname || [v.make, v.series].filter(Boolean).join(' ') || 'Vehicle';

// Mechanic home: vehicles that owners shared with this mechanic.
export default function MechanicVehicles() {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await api.mechanic.vehicles();
    setError(err ? err.message : '');
    if (data) setVehicles(data);
    else if (!vehicles) setVehicles([]);
  }, [vehicles]);

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
          ListHeaderComponent={<ErrorBanner message={error} onRetry={load} />}
          ListEmptyComponent={
            !error ? (
              <EmptyState icon="car-outline" text="No vehicles shared with you yet. Ask an owner to share one using your account email." />
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={ui.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MechanicVehicleDetail', { vehicle: item })}>
              <View style={ui.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={ui.cardTitle} numberOfLines={1}>{vehicleName(item)}</Text>
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