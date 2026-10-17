import React, { useState, useEffect } from 'react';
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
import { COLORS, SPACING, RADII } from '../constants/theme';
import { useSettings } from '../lib/settings';
import { formatDistance, displayToKm, kmToDisplay, distanceUnit } from '../lib/units';
import { api } from '../lib/api';
import { parseDateInput } from '../lib/dateParse';
import { useActiveVehicle } from '../lib/useActiveVehicle';
import ShopPicker from './ShopPicker';
import * as DocumentPicker from 'expo-document-picker';
import { Field, BoxInput, AmountInput, MileageInput, toNumber, formatMoney } from './FormKit';

// Fixed height of the app bar itself (status bar space is added via marginTop).
const TOP_BAR_HEIGHT = 64;


const SERVICE_TYPES = ['Oil Change', 'Tires', 'Brakes', 'Fluids', 'Battery', 'Other'];

// Categories that have a service interval. The odometer reading is what lets the
// Alerts screen work out when each one is next due, so it is asked for as soon as
// one of these is ticked. "Other" has no interval, so it doesn't need it.
const NEEDS_MILEAGE = ['Oil Change', 'Tires', 'Brakes', 'Fluids', 'Battery'];

// Receipt / invoice attachments (same limits as the server and the repair form).
const MAX_PROOF_BYTES = 8 * 1024 * 1024;   // same limit as the server
const PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const mimeFromName = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : null;
};

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
          <View style={[styles.rippleFill, innerLayout]}>{children}</View>
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

const MAX_COST_ITEMS = 20;

// Today's date on the phone's own calendar, as YYYY-MM-DD.
// (new Date().toISOString() gives the UTC date, which is a day behind in the Philippines
// until 8:00 AM, and made every date look invalid.)
const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

  // The vehicle this record belongs to (passed in, else the one chosen on Home)
  const vehicle = useActiveVehicle(route?.params?.vehicle || route?.params?.selectedVehicle);

  const { useMetric } = useSettings();
  const MILEAGE_UNIT = distanceUnit(useMetric);
  // The Alerts screen can open this form pre-set to a service type.
  // Several categories can be ticked at once (checkboxes).
  const [serviceTypes, setServiceTypes] = useState([route?.params?.serviceType || 'Oil Change']);
  const toggleServiceType = (type) =>
    setServiceTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  const [date, setDate] = useState(todayISO());
  const [mileage, setMileage] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partItems, setPartItems] = useState([]);   // [{ key, name, amount }]
  const addPartItem = () =>
    setPartItems((prev) =>
      prev.length >= MAX_COST_ITEMS ? prev : [...prev, { key: String(Date.now() + prev.length), name: '', amount: '' }]
    );
  const updatePartItem = (key, patch) =>
    setPartItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const removePartItem = (key) => setPartItems((prev) => prev.filter((it) => it.key !== key));
  // The total is never typed: it is always labour + every item.
  const totalCost =
    Math.round((toNumber(laborCost) + partItems.reduce((t, it) => t + toNumber(it.amount), 0)) * 100) / 100;
  const [shopName, setShopName] = useState('');
  const [diy, setDiy] = useState(false);   // chose "No shop / did it myself"
  const [proofFile, setProofFile] = useState(null);   // optional receipt / invoice
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const needsMileage = serviceTypes.some((t) => NEEDS_MILEAGE.includes(t));
  // The provider is required: pick a registered mechanic, type another shop, or choose DIY.
  const hasProvider = diy || shopName.trim() !== '';
  // A receipt can only be attached to shop / mechanic work, not when you did it yourself.
  const canAttach = !diy && shopName.trim() !== '';
  useEffect(() => { if (diy) setProofFile(null); }, [diy]);

  // Tap to choose a receipt photo or PDF; tap again to remove it.
  const pickProof = async () => {
    if (!canAttach) return;
    if (proofFile) {
      setProofFile(null);
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: PROOF_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;

      const mime = PROOF_TYPES.includes(file.mimeType) ? file.mimeType : mimeFromName(file.name);
      if (!mime) {
        Alert.alert('Unsupported File', 'Please choose a JPG, PNG or PDF.');
        return;
      }
      if (file.size && file.size > MAX_PROOF_BYTES) {
        Alert.alert('File Too Large', 'Please choose a file under 8 MB.');
        return;
      }
      setProofFile({ ...file, mime });
    } catch {
      Alert.alert('File Selection Failed', 'Could not select the file.');
    }
  };

  const canSave = serviceTypes.length > 0 && hasProvider && (!needsMileage || mileage.trim() !== '');

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

    const mileageValue = needsMileage ? parseInt(mileage.replace(/[^0-9]/g, ''), 10) : NaN;
    if (needsMileage && Number.isNaN(mileageValue)) {
      Alert.alert('Invalid Odometer', 'Please enter a valid odometer reading.');
      return;
    }

    const laborValue = toNumber(laborCost);
    const items = partItems
      .map((it) => ({ name: it.name.trim() || 'Item', amount: toNumber(it.amount) }))
      .filter((it) => it.amount > 0);

    // Read the date ourselves (lib/dateParse.js) and keep it within this year or earlier.
    const serviceDate = parseDateInput(date.trim() || todayISO());
    if (!serviceDate) {
      Alert.alert('Invalid Date', 'Please enter a real date, like 2026-10-18.');
      return;
    }
    const thisYear = new Date().getFullYear();
    if (Number(serviceDate.slice(0, 4)) > thisYear) {
      Alert.alert('Date Not Allowed', `Please choose a date in ${thisYear} or earlier.`);
      return;
    }

    setSaving(true);

    try {
      if (!(await api.auth.hasSession())) {
        Alert.alert('Error', 'You must be logged in to save a maintenance record.');
        return;
      }

      let proofId = null;
      if (canAttach && proofFile) {
        const upload = await api.files.upload(proofFile.uri, { mime: proofFile.mime, name: proofFile.name });
        if (upload.error) {
          Alert.alert('Upload Failed', upload.error.message);
          return;
        }
        proofId = upload.data.id;
      }

      const { data, error } = await api.create('maintenance_records', {
          vehicle_id: vehicle.id,
          maintenance_type: serviceTypes.join(', '),   // e.g. "Oil Change, Brakes"
          service_date: serviceDate,
          mileage: Number.isNaN(mileageValue) ? null : displayToKm(mileageValue, useMetric),
          cost: totalCost > 0 ? totalCost : null,   // the server recomputes this from the parts below
          ...(laborValue > 0 ? { labor_cost: laborValue } : {}),
          ...(items.length ? { cost_items: items } : {}),
          shop_name: diy ? null : (shopName.trim() || null),
          ...(proofId ? { proof_file_path: proofId, proof_file_name: proofFile?.name || null } : {}),
          notes: notes.trim() || null,
      });

      if (error) {
        if (proofId) await api.files.remove(proofId);   // don't leave an orphan upload behind
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
          <MaterialIcons name="arrow-back" size={24} color={COLORS.textMuted} />
        </Touchable>
        <Text style={styles.headerTitle}>Add Record</Text>
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
          {/* Icon + subtitle */}
          <View style={styles.introBlock}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="build" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.introText}>Log maintenance details for your vehicle.</Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {/* Service Category */}
            <Field label="Service Category" required>
              <View style={styles.checkGrid}>
                {SERVICE_TYPES.map((type) => {
                  const checked = serviceTypes.includes(type);
                  return (
                    <Touchable
                      key={type}
                      style={[styles.checkRow, checked && styles.checkRowActive]}
                      onPress={() => toggleServiceType(type)}
                      rippleColor="rgba(55, 194, 223, 0.15)"
                    >
                      <View style={styles.checkRowInner}>
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <MaterialIcons name="check" size={14} color={COLORS.textInverse} />}
                        </View>
                        <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{type}</Text>
                      </View>
                    </Touchable>
                  );
                })}
              </View>
              {serviceTypes.length === 0 && (
                <Text style={styles.checkError}>Pick at least one category.</Text>
              )}
            </Field>

            {/* Date */}
            <Field label="Date">
              <BoxInput
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </Field>

            {/* Mileage (only for categories that have a service interval) */}
            {needsMileage && (
              <Field
                label={`Current Mileage (${MILEAGE_UNIT})`}
                required
                hint="The number on your dashboard right now (up to 999,999)."
              >
                <MileageInput value={mileage} onChangeText={setMileage} />
              </Field>
            )}

            {/* Cost breakdown: the total is calculated, not typed */}
            <Field label="Cost Breakdown (₱)">
              <View style={styles.costRow}>
                <Text style={styles.costRowLabel}>Labor</Text>
                <AmountInput style={styles.costAmount} value={laborCost} onChangeText={setLaborCost} />
              </View>

              {partItems.map((item) => (
                <View key={item.key} style={[styles.costRow, { marginTop: SPACING.sm }]}>
                  <BoxInput
                    style={styles.costName}
                    placeholder="Part (e.g., Oil filter)"
                    value={item.name}
                    maxLength={80}
                    onChangeText={(text) => updatePartItem(item.key, { name: text })}
                  />
                  <AmountInput
                    style={styles.costAmount}
                    value={item.amount}
                    onChangeText={(text) => updatePartItem(item.key, { amount: text })}
                  />
                  <TouchableOpacity
                    onPress={() => removePartItem(item.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Remove item"
                  >
                    <MaterialIcons name="close" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              {partItems.length < MAX_COST_ITEMS && (
                <TouchableOpacity style={styles.addItemButton} onPress={addPartItem} activeOpacity={0.7}>
                  <MaterialIcons name="add" size={18} color={COLORS.primary} />
                  <Text style={styles.addItemText}>Add part or item</Text>
                </TouchableOpacity>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>₱{formatMoney(totalCost)}</Text>
              </View>
            </Field>

            {/* Shop / Provider */}
            <Field label="Service Provider" required>
              <ShopPicker value={shopName} onChange={setShopName} none={diy} onNone={setDiy} />
            </Field>

            {/* Receipt / invoice: only for shop or mechanic work */}
            <Field label="Receipt or Invoice (optional)">
              <TouchableOpacity
                style={[
                  styles.uploadBox,
                  proofFile && styles.uploadBoxAttached,
                  !canAttach && styles.uploadBoxDisabled,
                ]}
                onPress={pickProof}
                disabled={!canAttach}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={proofFile ? 'check-circle' : 'photo-camera'}
                  size={30}
                  color={proofFile ? COLORS.success : canAttach ? COLORS.primary : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.uploadTitle,
                    proofFile && { color: COLORS.success },
                    !canAttach && { color: COLORS.textMuted },
                  ]}
                  numberOfLines={2}
                >
                  {diy
                    ? 'No receipt needed when you did it yourself'
                    : !canAttach
                    ? 'Choose a service provider first'
                    : proofFile
                    ? proofFile.name || 'Receipt attached'
                    : 'Tap to attach a receipt photo or PDF'}
                </Text>
                <Text style={styles.uploadHint}>
                  {proofFile
                    ? 'Tap again to remove attachment'
                    : 'Keeps your paperwork with the record (JPG, PNG or PDF, up to 8 MB)'}
                </Text>
              </TouchableOpacity>
            </Field>

            {/* Notes */}
            <Field label="Notes (optional)">
              <BoxInput
                placeholder="Oil grade, filter brand, parts replaced, recommendations..."
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </Field>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <MaterialIcons name="info" size={20} color={COLORS.primary} />
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
              <MaterialIcons name="add-circle" size={20} color={COLORS.textInverse} />
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
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  // flexGrow (not flex: 1): flex: 1 gives the wrapper a zero basis, so buttons
  // without a fixed height (like Add Record / Cancel) collapsed to nothing on Android.
  rippleFill: {
    flexGrow: 1,
    alignSelf: 'stretch',
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceElevated,
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
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xxl,
  },
  introBlock: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  introText: {
    color: COLORS.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  formCard: {
    gap: SPACING.lg,
  },
  fieldBlock: {
    gap: SPACING.sm,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  column: {
    flex: 1,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  requiredAsterisk: {
    color: COLORS.primary,
  },
  checkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  checkRow: {
    width: '48%',
    borderRadius: RADII.input,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  checkRowActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  checkRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  checkLabelActive: {
    color: COLORS.primary,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(55, 194, 223, 0.4)',
    borderRadius: RADII.card,
    backgroundColor: COLORS.surface,
    paddingVertical: 22,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBoxAttached: {
    borderColor: COLORS.success,
    borderStyle: 'solid',
    backgroundColor: 'rgba(46, 213, 115, 0.08)',
  },
  uploadBoxDisabled: {
    opacity: 0.4,
    borderColor: COLORS.border,
  },
  uploadTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  checkError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  chipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  chipInner: {
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  input: {
    color: COLORS.textPrimary,
    fontSize: 16,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inputFocused: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  mileageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mileageInput: {
    flex: 1,
  },
  mileageUnit: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginLeft: SPACING.sm,
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  costRowLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  costName: {
    flex: 1,
  },
  costAmount: {
    width: 130,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  addItemText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  textarea: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADII.md,
    color: COLORS.textPrimary,
    fontSize: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    minHeight: 80,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  actionArea: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xxl : SPACING.lg,
    paddingTop: SPACING.sm,
  },
  submitButton: {
    borderRadius: RADII.full,
    backgroundColor: COLORS.primary,
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
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  submitButtonText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: RADII.sm,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});