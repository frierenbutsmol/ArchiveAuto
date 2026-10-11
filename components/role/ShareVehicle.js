import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ScreenHeader, PrimaryButton, EmptyState, ErrorBanner, ui } from './RoleUI';

const vehicleName = (v) => v.nickname || [v.make, v.series].filter(Boolean).join(' ') || 'Vehicle';

// Owner: share a vehicle with a mechanic by email, and see or revoke who has access.
// Opened from a Garage card (vehicle already known) or from Profile (pick a vehicle first).
export default function ShareVehicle() {
  const navigation = useNavigation();
  const params = useRoute().params || {};

  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState(params.vehicleId || null);
  const [shares, setShares] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingList, setLoadingList] = useState(!params.vehicleId);

  // Vehicle picker (only needed when no vehicle was passed in).
  useEffect(() => {
    if (params.vehicleId) return;
    api.list('vehicles').then(({ data, error: err }) => {
      if (err) setError(err.message);
      else {
        setVehicles(data || []);
        if (data?.length === 1) setVehicleId(data[0].id);
      }
      setLoadingList(false);
    });
  }, [params.vehicleId]);

  const loadShares = useCallback(async () => {
    if (!vehicleId) return;
    const { data, error: err } = await api.shares.list(vehicleId);
    setError(err ? err.message : '');
    setShares(data || []);
  }, [vehicleId]);

  useEffect(() => { setShares(null); loadShares(); }, [loadShares]);

  const current = vehicles.find((v) => v.id === vehicleId);
  const title = params.vehicleName || (current ? vehicleName(current) : 'Share with mechanic');

  const share = async () => {
    const target = email.trim().toLowerCase();
    if (!target) return Alert.alert('Missing email', "Enter the mechanic's account email.");
    setBusy(true);
    const { error: err } = await api.shares.add(vehicleId, target);
    setBusy(false);
    if (err) return Alert.alert('Could not share', err.message);
    setEmail('');
    loadShares();
  };

  const revoke = (m) =>
    Alert.alert('Stop sharing', `Remove ${m.display_name || m.email}'s access to this vehicle?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error: err } = await api.shares.remove(vehicleId, m.mechanic_id);
          if (err) return Alert.alert('Could not remove', err.message);
          loadShares();
        },
      },
    ]);

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Share with mechanic" subtitle={vehicleId ? title : 'Choose a vehicle'} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          {!vehicleId ? (
            loadingList ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
            ) : vehicles.length === 0 ? (
              <EmptyState icon="car-outline" text="Add a vehicle in your Garage first, then you can share it with a mechanic." />
            ) : (
              vehicles.map((v) => (
                <TouchableOpacity key={v.id} style={ui.card} activeOpacity={0.85} onPress={() => setVehicleId(v.id)}>
                  <View style={ui.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={ui.cardTitle}>{vehicleName(v)}</Text>
                      <Text style={ui.cardMeta}>{[v.year, v.make, v.series].filter(Boolean).join(' ')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : (
            <>
              <Text style={[ui.cardMeta, { marginBottom: 4 }]}>
                A mechanic you share with can view this vehicle's service records and add new ones. You can remove access at any time.
              </Text>

              <Text style={ui.label}>Mechanic's account email</Text>
              <TextInput
                style={ui.input}
                value={email}
                onChangeText={setEmail}
                placeholder="mechanic@example.com"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <PrimaryButton label="Share vehicle" icon="share-outline" onPress={share} loading={busy} style={{ marginTop: 16 }} />

              <Text style={ui.sectionTitle}>Shared with</Text>
              {shares === null ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : shares.length === 0 ? (
                <EmptyState icon="people-outline" text="Not shared with anyone yet." />
              ) : (
                shares.map((m) => (
                  <View key={m.mechanic_id} style={ui.card}>
                    <View style={ui.rowBetween}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={ui.cardTitle}>{m.display_name || 'Mechanic'}</Text>
                        <Text style={ui.cardMeta}>{m.email}</Text>
                      </View>
                      <TouchableOpacity onPress={() => revoke(m)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle-outline" size={26} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {!params.vehicleId && vehicles.length > 1 ? (
                <PrimaryButton label="Choose another vehicle" variant="outline" onPress={() => setVehicleId(null)} style={{ marginTop: 16 }} />
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}