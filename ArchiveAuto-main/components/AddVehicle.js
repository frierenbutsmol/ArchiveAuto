import React, { useEffect, useRef, useState } from 'react';
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
import SelectField from './SelectField';
import { OTHER, withCurrent } from '../constants/vehicleCatalog';
import { brandChoices, modelChoices } from '../lib/catalogMerge';
import { FUEL_TYPES, fuelOptionsFor } from '../lib/fuelTypes';

const VEHICLE_TYPES = [
  { id: 'car',        label: 'Car',        icon: 'car'           },
  { id: 'motorcycle', label: 'Motorcycle', icon: 'motorbike'     },
  { id: 'van',        label: 'Van',        icon: 'van-passenger' },
  { id: 'truck',      label: 'Truck',      icon: 'truck'         },
];

// The last year in the vehicle catalog data. A model whose range ends here is still on sale,
// so its year list continues to the current year (otherwise a brand-new car could not be picked).
// Update this number when the catalog is refreshed with newer years.
const CATALOG_LAST_YEAR = 2025;

// Years an owner can pick for a catalog model, newest first.
// { year_from: 2003, year_to: 2025 } -> ['2026', '2025', ..., '2003'].  null when there is no usable range.
function yearsFor(range) {
  if (!range) return null;
  const from = Number(range.year_from);
  const catalogTo = Number(range.year_to);
  if (!Number.isFinite(from) || !Number.isFinite(catalogTo) || from > catalogTo) return null;
  const to = catalogTo >= CATALOG_LAST_YEAR ? Math.max(catalogTo, new Date().getFullYear()) : catalogTo;
  const years = [];
  for (let y = to; y >= from; y--) years.push(String(y));
  return years;
}

// Gives touchables a real Material ripple on Android; falls back to
// opacity dimming on iOS.
function Touchable({ onPress, style, children, rippleColor, borderless = false, disabled = false }) {
  if (Platform.OS === 'android') {
    // The icon/content sits in an inner view that fills the button, so it needs the
    // button's own centering too, otherwise it ends up in the top-left corner.
    const flat = StyleSheet.flatten(style) || {};
    const innerLayout = { alignItems: flat.alignItems, justifyContent: flat.justifyContent };
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
          <View style={[{ flex: 1 }, innerLayout]}>{children}</View>
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
  const [fuelType, setFuelType] = useState(() => {
    const saved = isEdit
      ? vehicleToEdit?.fuel || vehicleToEdit?.fuelType || vehicleToEdit?.fuel_type || ''
      : '';
    // Older vehicles may have no fuel type ("Not specified"); the user picks one when editing.
    return FUEL_TYPES.includes(saved) ? saved : '';
  });
  const savedFuel = useRef(fuelType).current;   // what the vehicle had when this screen opened
  const [showAllFuel, setShowAllFuel] = useState(false);
  const [tankCapacity, setTankCapacity] = useState(
    isEdit && vehicleToEdit?.tankCapacity != null
      ? String(vehicleToEdit.tankCapacity)
      : isEdit && vehicleToEdit?.tank_capacity != null
      ? String(vehicleToEdit.tank_capacity)
      : ''
  );
  const [saving, setSaving] = useState(false);

  // Choosing a different vehicle type changes the brand list, so start brand/model over.
  const handleTypeChange = (typeId) => {
    if (typeId === vehicleType) return;
    setVehicleType(typeId);
    setBrand('');
    setModel('');
    setYear('');
  };

  // Brands and models come from the database catalog (1995-2025, /catalog/makes and /catalog/models),
  // merged with the short built-in lists in constants/vehicleCatalog.js. If the catalog is empty or
  // cannot be reached, only the built-in lists are used, so the form always works.
  const [dbBrands, setDbBrands] = useState(null);
  const [dbModels, setDbModels] = useState(null);   // [{ model, year_from, year_to }] for the chosen brand

  useEffect(() => {
    if (!vehicleType) { setDbBrands(null); return undefined; }
    let cancelled = false;
    api.catalog.makes(vehicleType).then(({ data }) => {
      if (!cancelled) setDbBrands(Array.isArray(data) && data.length ? data : null);
    });
    return () => { cancelled = true; };
  }, [vehicleType]);

  useEffect(() => {
    if (!vehicleType || !brand || brand === OTHER) { setDbModels(null); return undefined; }
    let cancelled = false;
    api.catalog.models(vehicleType, brand).then(({ data }) => {
      if (!cancelled) setDbModels(Array.isArray(data) && data.length ? data : null);
    });
    return () => { cancelled = true; };
  }, [vehicleType, brand]);

  // A value already saved on this vehicle stays selectable when editing.
  const brandOptions = withCurrent(brandChoices(vehicleType, dbBrands), brand);
  const modelOptions = withCurrent(modelChoices(vehicleType, brand, dbModels), model);
  const modelYears = Object.fromEntries((dbModels || []).map((m) => [m.model, `${m.year_from}\u2013${m.year_to}`]));

  // The year list follows the chosen model (e.g. Vios 2003\u20132025 gives 2026 down to 2003).
  // A model that is not in the catalog has no year range, so the year is typed instead.
  const pickedModel = (dbModels || []).find((m) => m.model === model);
  const catalogYears = yearsFor(pickedModel);
  const yearOptions = catalogYears ? withCurrent(catalogYears, year) : null;   // a saved year stays selectable when editing

  // Picking another model keeps the year only if that model was also made in that year.
  const handleModelChange = (nextModel) => {
    if (nextModel === model) return;
    setModel(nextModel);
    const nextYears = yearsFor((dbModels || []).find((m) => m.model === nextModel));
    if (nextYears && !nextYears.includes(year)) setYear('');
  };

  // Fuel type comes after make, model and year: it is filled in when the model has only one,
  // offered from the model's own list when it came in several versions, and left open (all
  // types) only when we have no data for the model.
  const modelChosen = brand.trim() !== '' && model.trim() !== '' && /^\d{4}$/.test(year.trim());
  const fuelInfo = modelChosen ? fuelOptionsFor({ vehicleType, make: brand, model, year }) : null;
  const restricted = !!fuelInfo && fuelInfo.known && !showAllFuel;
  const fuelChoices = !fuelInfo ? [] : restricted ? fuelInfo.options : FUEL_TYPES;
  const autoFuel = restricted && fuelInfo.options.length === 1 ? fuelInfo.options[0] : null;

  // A different make, model or year starts over with that model's own fuel list.
  useEffect(() => { setShowAllFuel(false); }, [vehicleType, brand, model, year]);

  useEffect(() => {
    if (!fuelInfo) { setFuelType(''); return; }
    if (autoFuel) { setFuelType(autoFuel); return; }
    if (fuelType && !fuelChoices.includes(fuelType)) setFuelType('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelChosen, autoFuel, fuelChoices.join('|')]);

  const canSave =
    vehicleType !== '' &&
    brand.trim() !== '' &&
    model.trim() !== '' &&
    /^\d{4}$/.test(year.trim()) &&
    fuelType !== '';

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
        fuel_type:     fuelType,
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
        behavior="padding"
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
                    onPress={() => handleTypeChange(type.id)}
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
            <Text style={styles.fieldLabel}>
              Vehicle Nickname <Text style={styles.optionalTag}>(optional)</Text>
            </Text>
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

          {/* Tank Capacity */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Tank Capacity (L) <Text style={styles.optionalTag}>(optional)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Leave blank if you're not sure"
                placeholderTextColor={COLORS.textMuted}
                value={tankCapacity}
                onChangeText={(t) => setTankCapacity(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                selectionColor={COLORS.primary}
              />
            </View>
          </View>

          {/* Make / Brand: pick from the list */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Make / Brand <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <SelectField
              value={brand}
              options={brandOptions}
              title="Select brand"
              placeholder={vehicleType ? 'Select a brand' : 'Choose a vehicle type first'}
              disabled={!vehicleType}
              searchable
              onSelect={(b) => {
                setBrand(b);
                setModel('');   // the model list depends on the brand
                setYear('');    // and the year list depends on the model
              }}
            />
          </View>

          {/* Model / Series: pick from the list for that brand */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Model / Series <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <SelectField
              value={model}
              options={modelOptions}
              title={brand ? `Select ${brand} model` : 'Select model'}
              placeholder={brand ? 'Select a model' : 'Select a brand first'}
              disabled={!brand}
              searchable
              details={modelYears}
              onSelect={handleModelChange}
            />
          </View>

          {/* Year: pick from the years the chosen model was made; typed only if the model has no list */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Model Year <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            {yearOptions || !model ? (
              <View style={{ width: '48%' }}>
                <SelectField
                  value={year}
                  options={yearOptions || []}
                  title={model ? `Select ${model} year` : 'Select year'}
                  placeholder={model ? 'Select a year' : 'Select a model first'}
                  disabled={!yearOptions}
                  searchable
                  onSelect={setYear}
                />
              </View>
            ) : (
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
            )}
          </View>

          {/* Fuel Type: decided by the make, model and year above */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Fuel Type <Text style={styles.requiredAsterisk}>*</Text>
            </Text>

            {!fuelInfo ? (
              <View style={styles.fuelPlaceholder}>
                <Text style={styles.fuelPlaceholderText}>
                  Choose the make, model and year first. The fuel type for that model will show here.
                </Text>
              </View>
            ) : autoFuel ? (
              <View style={styles.fuelAuto}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fuelAutoValue}>{autoFuel}</Text>
                  <Text style={styles.fuelHint}>Set automatically for {brand} {model} {year}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.fuelTypeRow}>
                {fuelChoices.map((f) => {
                  const selected = fuelType === f;
                  return (
                    <Touchable
                      key={f}
                      style={[
                        styles.fuelChip,
                        fuelChoices.length <= 2 && { width: '48%' },
                        selected && styles.fuelChipSelected,
                      ]}
                      onPress={() => setFuelType(f)}
                      rippleColor="rgba(55, 194, 223, 0.15)"
                    >
                      <View style={styles.fuelChipInner}>
                        <Text
                          numberOfLines={1}
                          style={[styles.fuelChipText, selected && styles.fuelChipTextSelected]}
                        >
                          {f}
                        </Text>
                      </View>
                    </Touchable>
                  );
                })}
              </View>
            )}

            {fuelInfo && !fuelInfo.known && (
              <Text style={styles.fuelHint}>
                We don't have fuel data for this model yet, so choose yours.
              </Text>
            )}
            {restricted && !autoFuel && (
              <Text style={styles.fuelHint}>
                This model came in more than one fuel type. Choose yours.
              </Text>
            )}
            {isEdit && savedFuel && fuelType && fuelType !== savedFuel && (
              <Text style={styles.fuelHint}>Changed from {savedFuel} to match this model.</Text>
            )}
            {restricted && (
              <TouchableOpacity onPress={() => setShowAllFuel(true)} activeOpacity={0.7}>
                <Text style={styles.fuelLink}>Not right? Show all fuel types</Text>
              </TouchableOpacity>
            )}
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
  optionalTag: { color: COLORS.textMuted, fontWeight: '400' },
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.sm,
  },
  fuelChip: {
    width: '32%',   // three chips per row
    backgroundColor: COLORS.surface,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  fuelChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  fuelChipInner: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  fuelChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  fuelChipTextSelected: { color: COLORS.primary },
  fuelPlaceholder: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    opacity: 0.7,
  },
  fuelPlaceholderText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fuelAuto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  fuelAutoValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  fuelHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  fuelLink: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
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