import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableNativeFeedback,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';

const VEHICLE_TYPES = [
  { id: 'car',        label: 'Car',        icon: 'car'           },
  { id: 'motorcycle', label: 'Motorcycle', icon: 'motorbike'     },
  { id: 'van',        label: 'Van',        icon: 'van-passenger' },
  { id: 'truck',      label: 'Truck',      icon: 'truck'         },
];

const FUEL_TYPES = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];

// Gives touchables a real Material ripple on Android; falls back to
// opacity dimming on iOS.
function Touchable({ onPress, style, children, rippleColor, borderless = false, disabled = false }) {
  if (Platform.OS === 'android') {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        <TouchableNativeFeedback
          onPress={onPress}
          disabled={disabled}
          background={TouchableNativeFeedback.Ripple(
            rippleColor || 'rgba(255,255,255,0.08)',
            borderless
          )}
        >
          <View style={{ flex: 1 }}>{children}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity style={style} activeOpacity={0.85} onPress={onPress} disabled={disabled}>
      {children}
    </TouchableOpacity>
  );
}

export default function AddVehicle() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const isEdit = route?.params?.isEdit || false;
  const vehicleToEdit = route?.params?.vehicleToEdit;

  const [vehicleType, setVehicleType] = useState(
    isEdit
      ? vehicleToEdit?.type?.toLowerCase() ||
        vehicleToEdit?.vehicle_type?.toLowerCase() || ''
      : ''
  );
  const [brand, setBrand] = useState(
    isEdit ? vehicleToEdit?.brand || vehicleToEdit?.make || '' : ''
  );
  const [model, setModel] = useState(
    isEdit ? vehicleToEdit?.model || vehicleToEdit?.series || '' : ''
  );
  const [year, setYear] = useState(
    isEdit && vehicleToEdit?.year ? String(vehicleToEdit.year) : ''
  );
  const [nickname, setNickname] = useState(
    isEdit ? vehicleToEdit?.name || vehicleToEdit?.nickname || '' : ''
  );
  const [plateNumber, setPlateNumber] = useState(
    isEdit
      ? vehicleToEdit?.plate ||
        vehicleToEdit?.plateNumber ||
        vehicleToEdit?.plate_number || ''
      : ''
  );
  const [fuelType, setFuelType] = useState(
    isEdit
      ? vehicleToEdit?.fuel ||
        vehicleToEdit?.fuelType ||
        vehicleToEdit?.fuel_type || ''
      : ''
  );
  const [tankCapacity, setTankCapacity] = useState(
    isEdit && vehicleToEdit?.tankCapacity != null
      ? String(vehicleToEdit.tankCapacity)
      : isEdit && vehicleToEdit?.tank_capacity != null
      ? String(vehicleToEdit.tank_capacity)
      : ''
  );
  const [saving, setSaving] = useState(false);

  const canSave =
    vehicleType !== '' &&
    brand.trim() !== '' &&
    model.trim() !== '' &&
    year.trim() !== '';

  const handleConfirm = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    try {
      if (!(await api.auth.hasSession())) {
        Alert.alert('Not Logged In', 'Please log in again before saving your vehicle.');
        return;
      }

      const parsedTankCapacity = parseFloat(
        String(tankCapacity).replace(/[^0-9.]/g, '')
      );

      const payload = {
        vehicle_type:  vehicleType,
        make:          brand.trim(),
        series:        model.trim(),
        year:          parseInt(year, 10),
        nickname:      nickname.trim() || `${brand.trim()} ${model.trim()}`,
        plate_number:  plateNumber.trim() || null,
        fuel_type:     fuelType || null,
        tank_capacity: Number.isNaN(parsedTankCapacity) ? null : parsedTankCapacity,
      };

      if (isEdit) {
        const { data, error } = await api.update('vehicles', vehicleToEdit.id, payload);

        if (error) {
          Alert.alert('Save Failed', error.message);
          return;
        }

        Alert.alert('Vehicle Updated', 'Your vehicle information has been updated.', [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('MainTabs', {
                screen: 'Home',
                params: { selectedVehicle: data },
              }),
          },
        ]);
      } else {
        const { data, error } = await api.create('vehicles', {
          ...payload,
          current_mileage: 0,
        });

        if (error) {
          Alert.alert('Save Failed', error.message);
          return;
        }

        console.log('Vehicle saved:', data);
        Alert.alert('Vehicle Added', 'Your vehicle has been added to your garage.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      console.error('Vehicle save error:', err);
      Alert.alert('Save Failed', 'Something went wrong while saving the vehicle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top app bar — extends behind the status bar */}
      <View style={[styles.topBar, { height: 64 + insets.top, paddingTop: insets.top }]}>
        <Touchable
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </Touchable>
        <Text style={styles.topBarTitle}>
          {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero block */}
          {!isEdit && (
            <View style={styles.heroBlock}>
              <View style={styles.heroCircle}>
                <MaterialCommunityIcons name="car" size={44} color={COLORS.primary} />
              </View>
              <Text style={styles.heroTitle}>Add New Vehicle</Text>
              <Text style={styles.heroSubtitle}>
                Enter your vehicle details below to begin tracking performance.
              </Text>
            </View>
          )}

          {/* Vehicle Type */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Vehicle Type <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPES.map((type) => {
                const selected = vehicleType === type.id;
                return (
                  <Touchable
                    key={type.id}
                    style={[styles.typeTile, selected && styles.typeTileSelected]}
                    onPress={() => setVehicleType(type.id)}
                    rippleColor="rgba(55, 194, 223, 0.15)"
                  >
                    <View style={styles.typeTileInner}>
                      <MaterialCommunityIcons
                        name={type.icon}
                        size={20}
                        color={selected ? COLORS.primary : COLORS.textMuted}
                        style={{ marginRight: SPACING.sm }}
                      />
                      <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                        {type.label}
                      </Text>
                    </View>
                  </Touchable>
                );
              })}
            </View>
          </View>

          {/* Nickname */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Vehicle Nickname</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Daily Drive, Family Van"
                placeholderTextColor={COLORS.textMuted}
                value={nickname}
                onChangeText={setNickname}
                selectionColor={COLORS.primary}
              />
            </View>
          </View>

          {/* Plate & Tank Capacity */}
          <View style={styles.twoColumnRow}>
            <View style={[styles.fieldBlock, styles.rowField]}>
              <Text style={styles.fieldLabel}>Plate Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. ABC 1234"
                  placeholderTextColor={COLORS.textMuted}
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  autoCapitalize="characters"
                  selectionColor={COLORS.primary}
                />
              </View>
            </View>

            <View style={[styles.fieldBlock, styles.rowField]}>
              <Text style={styles.fieldLabel}>Tank Capacity (L)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 70"
                  placeholderTextColor={COLORS.textMuted}
                  value={tankCapacity}
                  onChangeText={(t) => setTankCapacity(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  selectionColor={COLORS.primary}
                />
              </View>
            </View>
          </View>

          {/* Fuel Type */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Fuel Type</Text>
            <View style={styles.fuelTypeRow}>
              {FUEL_TYPES.map((f) => {
                const selected = fuelType === f;
                return (
                  <Touchable
                    key={f}
                    style={[styles.fuelChip, selected && styles.fuelChipSelected]}
                    onPress={() => setFuelType(f)}
                    rippleColor="rgba(55, 194, 223, 0.15)"
                  >
                    <View style={styles.fuelChipInner}>
                      <Text style={[styles.fuelChipText, selected && styles.fuelChipTextSelected]}>
                        {f}
                      </Text>
                    </View>
                  </Touchable>
                );
              })}
            </View>
          </View>

          {/* Make / Brand */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Make / Brand <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Toyota, Honda, Ford"
                placeholderTextColor={COLORS.textMuted}
                value={brand}
                onChangeText={setBrand}
                selectionColor={COLORS.primary}
              />
            </View>
          </View>

          {/* Model / Series */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Model / Series <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hiace, Vios, Ranger"
                placeholderTextColor={COLORS.textMuted}
                value={model}
                onChangeText={setModel}
                selectionColor={COLORS.primary}
              />
            </View>
          </View>

          {/* Year */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Model Year <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={[styles.inputContainer, { width: '48%' }]}>
              <TextInput
                style={styles.input}
                placeholder="YYYY"
                placeholderTextColor={COLORS.textMuted}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
                selectionColor={COLORS.primary}
              />
            </View>
          </View>

        </ScrollView>

        {/* Fixed bottom save button */}
        <View style={styles.bottomBlock}>
          <Touchable
            style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
            onPress={handleConfirm}
            disabled={!canSave || saving}
            rippleColor="rgba(0,0,0,0.15)"
          >
            <View style={styles.saveButtonInner}>
              <Ionicons name="save-outline" size={18} color={COLORS.textInverse} style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {saving
                  ? isEdit ? 'Saving Changes…' : 'Saving Vehicle…'
                  : isEdit ? 'Save Changes'   : 'Save Vehicle Profile'}
              </Text>
            </View>
          </Touchable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
    backgroundColor: COLORS.surface,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
  },
  topBarTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  heroBlock: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  fieldBlock: {
    marginBottom: SPACING.lg,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  rowField: { flex: 1 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  requiredAsterisk: { color: COLORS.primary },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.sm,
  },
  typeTile: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  typeTileSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  typeTileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeLabelSelected: { color: COLORS.primary },
  inputContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 50,
    justifyContent: 'center',
  },
  input: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  fuelTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fuelChip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 3,
    overflow: 'hidden',
  },
  fuelChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  fuelChipInner: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  fuelChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  fuelChipTextSelected: { color: COLORS.primary },
  bottomBlock: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: COLORS.primary,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonInner: {
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});