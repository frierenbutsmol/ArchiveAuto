import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import { api, sortDesc } from '../../lib/api';
import { ScreenHeader, PrimaryButton, EmptyState, ErrorBanner, ui } from './RoleUI';

const vehicleName = (v) => v?.nickname || [v?.make, v?.series].filter(Boolean).join(' ') || 'Vehicle';
const km = (n) => (n == null ? null : `${Number(n).toLocaleString()} km`);

function RecordCard({ title, date, record }) {
  const bits = [km(record.mileage), record.cost != null ? `Cost ${record.cost}` : null, record.shop_name].filter(Boolean);
  return (
    <View style={ui.card}>
      <View style={ui.rowBetween}>
        <Text style={[ui.cardTitle, { flex: 1 }]} numberOfLines={1}>{title}</Text>
        <Text style={ui.cardMuted}>{date}</Text>
      </View>
      {record.description ? <Text style={ui.cardMeta}>{record.description}</Text> : null}
      {bits.length ? <Text style={ui.cardMuted}>{bits.join('  ·  ')}</Text> : null}
      {record.added_by_name ? <Text style={ui.cardMuted}>Added by {record.added_by_name}</Text> : null}
    </View>
  );
}

// One shared vehicle: its maintenance and repair history plus buttons to add records.
export default function MechanicVehicleDetail() {
  const navigation = useNavigation();
  const { vehicle } = useRoute().params;
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error: err } = await api.mechanic.records(vehicle.id);
    setError(err ? err.message : '');
    if (data) {
      setRecords({
        maintenance: sortDesc(data.maintenance_records, 'service_date', 'created_at'),
        repairs: sortDesc(data.repairs, 'repair_date', 'created_at'),
      });
    } else if (!records) setRecords({ maintenance: [], repairs: [] });
  }, [vehicle.id, records]);

  // Reload when coming back from the add-record form.
  useFocusEffect(useCallback(() => { load(); /* eslint-disable-next-line */ }, []));

  const add = (kind) => navigation.navigate('MechanicAddRecord', { vehicleId: vehicle.id, vehicleName: vehicleName(vehicle), kind });

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader
        title={vehicleName(vehicle)}
        subtitle={[vehicle.year, vehicle.make, vehicle.series].filter(Boolean).join(' ')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={ui.content}>
        <View style={{ flexDirection: 'row' }}>
          <PrimaryButton label="Add maintenance" icon="construct-outline" onPress={() => add('maintenance')} style={{ flex: 1, marginRight: 8 }} />
          <PrimaryButton label="Add repair" icon="build-outline" variant="outline" onPress={() => add('repair')} style={{ flex: 1, marginLeft: 8 }} />
        </View>

        <ErrorBanner message={error} onRetry={load} />

        {records === null ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={ui.sectionTitle}>Maintenance</Text>
            {records.maintenance.length === 0 ? (
              <EmptyState text="No maintenance records yet." />
            ) : (
              records.maintenance.map((r) => <RecordCard key={r.id} title={r.maintenance_type} date={r.service_date} record={r} />)
            )}

            <Text style={ui.sectionTitle}>Repairs</Text>
            {records.repairs.length === 0 ? (
              <EmptyState text="No repair records yet." />
            ) : (
              records.repairs.map((r) => <RecordCard key={r.id} title={r.repair_type} date={r.repair_date} record={r} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}