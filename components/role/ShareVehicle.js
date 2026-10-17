import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
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
  const [fieldError, setFieldError] = useState('');     // shown in red under the input
  const [selected, setSelected] = useState(null);       // mechanic picked from the dropdown
  const [suggestions, setSuggestions] = useState([]);
  const [noMatch, setNoMatch] = useState(false);
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

  // Search-as-you-type (name or email) once two characters are typed.
  useEffect(() => {
    const q = email.trim();
    setNoMatch(false);
    if (selected || q.length < 2) { setSuggestions([]); return undefined; }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await api.mechanics.search(q);
      if (!alive) return;
      const list = Array.isArray(data) ? data : [];
      setSuggestions(list);
      setNoMatch(list.length === 0);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [email, selected]);

  // Don't offer mechanics this vehicle is already shared with.
  const options = suggestions.filter((m) => !(shares || []).some((x) => x.mechanic_id === m.id));

  const pickMechanic = (m) => {
    setSelected(m);
    setEmail(m.display_name);
    setSuggestions([]);
    setFieldError('');
  };

  const current = vehicles.find((v) => v.id === vehicleId);
  const title = params.vehicleName || (current ? vehicleName(current) : 'Share with mechanic');

  const share = async () => {
    const typed = email.trim().toLowerCase();
    if (!selected) {
      if (!typed) return setFieldError("Enter the mechanic's name or account email.");
      if (!/^\S+@\S+\.\S+$/.test(typed))
        return setFieldError('Pick a mechanic from the list, or enter a full email address.');
    }
    setBusy(true);
    const { error: err } = await api.shares.add(vehicleId, selected ? { mechanicId: selected.id } : { email: typed });
    setBusy(false);
    if (err) return setFieldError(err.message);
    setEmail('');
    setSelected(null);
    setSuggestions([]);
    setFieldError('');
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
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Share with mechanic" subtitle={vehicleId ? title : 'Choose a vehicle'} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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

              <Text style={ui.label}>Mechanic's name or account email</Text>
              <TextInput
                style={[ui.input, !!fieldError && styles.inputError]}
                value={email}
                onChangeText={(t) => { setEmail(t); setSelected(null); setFieldError(''); }}
                placeholder="Search by name or email"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              {!!fieldError && <Text style={styles.fieldError}>{fieldError}</Text>}

              {selected && !fieldError ? (
                <Text style={styles.selectedText}>
                  {selected.display_name} · {selected.email_hint}
                </Text>
              ) : null}

              {options.length > 0 && (
                <View style={styles.dropdown}>
                  {options.map((m, i) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.option, i > 0 && styles.optionBorder]}
                      activeOpacity={0.7}
                      onPress={() => pickMechanic(m)}
                    >
                      <Text style={ui.cardTitle} numberOfLines={1}>{m.display_name}</Text>
                      <Text style={ui.cardMeta} numberOfLines={1}>{m.email_hint}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {noMatch && !selected && email.trim().length >= 2 && (
                <Text style={styles.noMatch}>No registered mechanic matches that.</Text>
              )}

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

const styles = StyleSheet.create({
  inputError: { borderColor: COLORS.danger, borderWidth: 1.5 },
  fieldError: { color: COLORS.danger, fontSize: 13, marginTop: 6 },
  selectedText: { color: COLORS.primary, fontSize: 13, marginTop: 6 },
  noMatch: { color: COLORS.textMuted, fontSize: 13, marginTop: 8 },
  dropdown: {
    marginTop: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 16, paddingVertical: 12 },
  optionBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
});