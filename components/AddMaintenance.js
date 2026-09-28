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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '../lib/supabase';

// Colors pulled from the AutoCare design tokens (tailwind config)
const C = {
  background: '#141316',
  surfaceContainerHigh: '#2b292d',
  surfaceContainerLow: '#1c1b1e',
  surfaceContainerHighest: '#363437',
  outline: '#849495',
  outlineVariant: '#3a494b',
  primaryContainer: '#00f2ff',
  onSurface: '#e6e1e5',
  onSurfaceVariant: '#b9cacb',
};

// Material-style app bar surface: a tonal step lighter than the page
// background rather than a hard border, so it reads as elevated.
const APPBAR_SURFACE = C.surfaceContainerHigh;

// Fixed height of the app bar itself (status bar space is added via marginTop).
const TOP_BAR_HEIGHT = 64;

// Change to 'mi' if you track mileage in miles.
const MILEAGE_UNIT = 'km';

const SERVICE_TYPES = ['Oil Change', 'Tires', 'Brakes', 'Fluids', 'Battery', 'Other'];

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
          <View style={styles.rippleFill}>{children}</View>
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

const todayISO = () => new Date().toISOString().split('T')[0];

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().split('T')[0] === value;
};

export default function AddMaintenance() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Space to push the top bar below the (translucent) status bar.
  // On Android we fall back to StatusBar.currentHeight in case the safe-area
  // inset comes back as 0 (e.g. the app root has no SafeAreaProvider).
  const statusBarOffset =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const vehicle = route?.params?.vehicle || route?.params?.selectedVehicle;

  const [serviceType, setServiceType] = useState('Oil Change');
  const [taskName, setTaskName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [shopName, setShopName] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [notes, setNotes] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [saving, setSaving] = useState(false);

  const canSave = taskName.trim() !== '' && mileage.trim() !== '';

  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleAddRecord = async () => {
    if (!canSave || saving) return;

    if (!vehicle?.id) {
      Alert.alert('No Vehicle', 'No vehicle was selected for this maintenance record.');
      return;
    }

    const mileageValue = parseInt(mileage.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(mileageValue)) {
      Alert.alert('Invalid Odometer', 'Please enter a valid odometer reading.');
      return;
    }

    const costValue = parseFloat(cost.replace(/[^0-9.]/g, ''));

    const serviceDate = date.trim() || todayISO();
    if (!isValidDate(serviceDate)) {
      Alert.alert('Invalid Date', 'Please enter the date as YYYY-MM-DD.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to save a maintenance record.');
        return;
      }

      const { data, error } = await supabase
        .from('maintenance_records')
        .insert({
          vehicle_id: vehicle.id,
          maintenance_type: serviceType,
          description: taskName.trim(),
          service_date: serviceDate,
          mileage: mileageValue,
          cost: Number.isNaN(costValue) ? null : costValue,
          shop_name: shopName.trim() || null,
          notes: notes.trim() || null,
          // Only sent when filled in, so saving still works if the
          // `parts_replaced` column hasn't been added to the table yet.
          ...(partsReplaced.trim() ? { parts_replaced: partsReplaced.trim() } : {}),
        })
        .select()
        .single();

      if (error) {
        console.error('Maintenance save error:', error);
        Alert.alert('Save Failed', error.message || 'Could not save the maintenance record.');
        return;
      }

      console.log('Maintenance saved:', data);

      Alert.alert('Maintenance Saved', 'Your maintenance record has been added.', [
        { text: 'OK', onPress: handleCancel },
      ]);
    } catch (err) {
      console.error('Unexpected save error:', err);
      Alert.alert('Save Failed', 'Something went wrong while saving the maintenance record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    // Top edge is excluded on purpose — the top bar is pushed down with
    // marginTop (statusBarOffset) so its content never sits under the
    // status bar clock / icons.
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top app bar */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <Touchable
          onPress={handleCancel}
          style={styles.backButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <MaterialIcons name="arrow-back" size={24} color={C.onSurfaceVariant} />
        </Touchable>
        <Text style={styles.headerTitle}>Add Record</Text>
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
          {/* Icon + subtitle */}
          <View style={styles.introBlock}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="build" size={32} color={C.primaryContainer} />
            </View>
            <Text style={styles.introText}>Log maintenance details for your vehicle.</Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {/* Service Category */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>SERVICE CATEGORY</Text>
              <View style={styles.chipsRow}>
                {SERVICE_TYPES.map((type) => {
                  const selected = serviceType === type;
                  return (
                    <Touchable
                      key={type}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setServiceType(type)}
                      rippleColor="rgba(0, 242, 255, 0.15)"
                    >
                      <View style={styles.chipInner}>
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {type}
                        </Text>
                      </View>
                    </Touchable>
                  );
                })}
              </View>
            </View>

            {/* Task Name */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                TASK NAME <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, focusedField === 'taskName' && styles.inputFocused]}
                placeholder="e.g., Fully Synthetic Oil Change"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={taskName}
                onChangeText={setTaskName}
                onFocus={() => setFocusedField('taskName')}
                onBlur={() => setFocusedField(null)}
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Date */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <TextInput
                style={[styles.input, focusedField === 'date' && styles.inputFocused]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={date}
                onChangeText={setDate}
                onFocus={() => setFocusedField('date')}
                onBlur={() => setFocusedField(null)}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Mileage & Cost */}
            <View style={styles.twoColumnRow}>
              <View style={[styles.fieldBlock, styles.column]}>
                <Text style={styles.fieldLabel}>
                  MILEAGE <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.mileageRow}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.mileageInput,
                      focusedField === 'mileage' && styles.inputFocused,
                    ]}
                    placeholder="24500"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={mileage}
                    onChangeText={(text) => setMileage(text.replace(/[^0-9]/g, ''))}
                    onFocus={() => setFocusedField('mileage')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="numeric"
                    underlineColorAndroid="transparent"
                    selectionColor={C.primaryContainer}
                  />
                  <Text style={styles.mileageUnit}>{MILEAGE_UNIT}</Text>
                </View>
              </View>

              <View style={[styles.fieldBlock, styles.column]}>
                <Text style={styles.fieldLabel}>TOTAL COST (₱)</Text>
                <TextInput
                  style={[styles.input, focusedField === 'cost' && styles.inputFocused]}
                  placeholder="2500"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={cost}
                  onChangeText={(text) => setCost(text.replace(/[^0-9.]/g, ''))}
                  onFocus={() => setFocusedField('cost')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="decimal-pad"
                  underlineColorAndroid="transparent"
                  selectionColor={C.primaryContainer}
                />
              </View>
            </View>

            {/* Shop / Provider */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>SERVICE PROVIDER / SHOP (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, focusedField === 'shopName' && styles.inputFocused]}
                placeholder="e.g., Shell Helix Oil Service Center"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={shopName}
                onChangeText={setShopName}
                onFocus={() => setFocusedField('shopName')}
                onBlur={() => setFocusedField(null)}
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Parts Replaced */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>PARTS REPLACED (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, focusedField === 'partsReplaced' && styles.inputFocused]}
                placeholder="e.g., Oil filter, Brake pads"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={partsReplaced}
                onChangeText={setPartsReplaced}
                onFocus={() => setFocusedField('partsReplaced')}
                onBlur={() => setFocusedField(null)}
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Notes */}
            <View style={[styles.fieldBlock, { marginTop: 4 }]}>
              <Text style={styles.fieldLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Details on oil grade, filter brand, or recommendations..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <MaterialIcons name="info" size={20} color={C.primaryContainer} />
              <Text style={styles.infoText}>
                This record will be added to your vehicle's history log.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionArea}>
          <Touchable
            style={[styles.submitButton, (!canSave || saving) && styles.submitButtonDisabled]}
            onPress={handleAddRecord}
            disabled={!canSave || saving}
            rippleColor="rgba(0,0,0,0.15)"
          >
            <View style={styles.submitButtonInner}>
              <MaterialIcons name="add-circle" size={20} color="#121212" />
              <Text style={styles.submitButtonText}>
                {saving ? 'Saving...' : 'Add Record'}
              </Text>
            </View>
          </Touchable>

          <Touchable
            style={styles.cancelButton}
            onPress={handleCancel}
            rippleColor="rgba(255,255,255,0.08)"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Touchable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  flex: {
    flex: 1,
  },
  rippleFill: {
    flex: 1,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: APPBAR_SURFACE,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: C.onSurface,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  introBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(58,73,75,0.3)',
  },
  introText: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  fieldBlock: {
    gap: 8,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
  fieldLabel: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  requiredAsterisk: {
    color: C.primaryContainer,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  chipActive: {
    backgroundColor: 'rgba(0, 242, 255, 0.1)',
    borderColor: C.primaryContainer,
  },
  chipInner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: C.primaryContainer,
  },
  input: {
    color: C.onSurface,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
  },
  inputFocused: {
    borderBottomWidth: 2,
    borderBottomColor: C.primaryContainer,
  },
  mileageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mileageInput: {
    flex: 1,
  },
  mileageUnit: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    marginLeft: 8,
  },
  textarea: {
    backgroundColor: C.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    color: C.onSurface,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(58,73,75,0.5)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: C.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
  },
  actionArea: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 8,
  },
  submitButton: {
    borderRadius: 999,
    backgroundColor: C.primaryContainer,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: C.primaryContainer,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: C.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '500',
  },
});