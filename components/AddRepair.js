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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { useSettings } from '../lib/settings';
import { formatDistance, displayToKm, kmToDisplay, distanceUnit } from '../lib/units';
import { api } from '../lib/api';
import { useActiveVehicle } from '../lib/useActiveVehicle';
import { formatInteger, formatMoney } from '../lib/numberFormat';
import { todayLocalISO } from '../lib/dateParse';
import MechanicPicker from './MechanicPicker';
import ConfirmCard from './ConfirmCard';
import * as DocumentPicker from 'expo-document-picker';
import CameraButton from './CameraButton';
import RemoveFileButton from './RemoveFileButton';

const MAX_PROOF_BYTES = 8 * 1024 * 1024;   // same limit as the server
const PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const mimeFromName = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : null;
};

const REPAIR_TYPES = [
  { id: 'DIY',                  label: 'DIY',                   requiresProof: false },
  { id: 'Informal Mechanic',    label: 'Informal Mechanic',      requiresProof: false },
  { id: 'Official Shop',        label: 'Official Shop',          requiresProof: true  },
  { id: 'Manufacturer/Dealer',  label: 'Manufacturer/Dealer',    requiresProof: true  },
];

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
          {/* flexGrow (not flex: 1): flex: 1 has a zero basis and collapses to 0 height
              inside an auto-height parent such as the pinned footer, hiding the button. */}
          <View style={[{ flexGrow: 1 }, innerLayout]}>{children}</View>
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

export default function AddRepair({ navigation, route }) {
  const { useMetric } = useSettings();
  const insets = useSafeAreaInsets();

  // The vehicle this record belongs to (passed in, else the one chosen on Home)
  const vehicle = useActiveVehicle(
    route?.params?.vehicle ||
    route?.params?.selectedVehicle
  );

  const [repairType,  setRepairType]  = useState('Official Shop');
  const [title,       setTitle]       = useState('');
  const [shopName,    setShopName]    = useState('');
  const [odometer,    setOdometer]    = useState('');
  const [cost,        setCost]        = useState('');
  const [proofFile,   setProofFile]   = useState(null);   // picked receipt / work order
  const hasPhoto = !!proofFile;
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);   // the "Save this repair?" card
  const [showErrors, setShowErrors] = useState(false);       // turns on after the first tap on Save
  const [focusedField, setFocusedField] = useState(null);

  const currentTypeConfig = REPAIR_TYPES.find((t) => t.id === repairType);
  const requiresProof = currentTypeConfig?.requiresProof;

  // What is still missing, so the Save button can say so instead of silently greying out.
  const missing = [];
  if (!title.trim()) missing.push('repair description');
  if (!odometer.trim()) missing.push('odometer');
  if (requiresProof && !hasPhoto) missing.push('receipt photo or PDF');
  const canSave = missing.length === 0;

  // Odometer: any number is accepted (up to 6 digits). It is deliberately NOT compared with earlier
  // readings, because an old repair can be logged late and an odometer can be replaced or reset.
  // Red + "required" only shows after the user has tried to save without one.
  const MAX_ODOMETER_DIGITS = 6;
  const odometerMissing = showErrors && !odometer.trim();

  // Tap to choose a receipt photo or PDF (tapping again chooses a different one).
  // The Remove button below the box takes the attachment off.
  const removeProof = () => setProofFile(null);

  const pickProof = async () => {
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

  // Photo taken with the camera (replaces any attachment that is already there).
  const handleCameraPhoto = (photo) => {
    if (photo.size && photo.size > MAX_PROOF_BYTES) {
      Alert.alert('File Too Large', 'Please take the photo again, or choose a file under 8 MB.');
      return;
    }
    setProofFile({ ...photo, mime: photo.mimeType });
  };

  // Save button: explain what is missing, or ask for confirmation before saving.
  const handleConfirm = () => {
    if (saving) return;
    if (!canSave) {
      setShowErrors(true);
      Alert.alert('Almost there', `Please add: ${missing.join(', ')}.`);
      return;
    }
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;

    if (!vehicle?.id) {
      Alert.alert('No Vehicle', 'No vehicle was selected for this repair record.');
      return;
    }

    const mileageValue = parseInt(odometer.replace(/[^0-9]/g, ''), 10);
    const costValue    = parseFloat(cost.replace(/[^0-9.]/g, ''));

    if (Number.isNaN(mileageValue)) {
      Alert.alert('Invalid Odometer', 'Please enter a valid odometer reading.');
      return;
    }

    setSaving(true);
    try {
      if (!(await api.auth.hasSession())) {
        Alert.alert('Error', 'You must be logged in to save a repair record.');
        return;
      }

      let proofId = null;
      if (requiresProof && proofFile) {
        const upload = await api.files.upload(proofFile.uri, { mime: proofFile.mime, name: proofFile.name });
        if (upload.error) {
          Alert.alert('Upload Failed', upload.error.message);
          return;
        }
        proofId = upload.data.id;
      }

      const { error } = await api.create('repairs', {
          vehicle_id:      vehicle.id,
          repair_type:     repairType,
          description:     title.trim(),
          repair_date:     todayLocalISO(),   // the phone's own date, not UTC
          mileage:         displayToKm(mileageValue, useMetric),
          cost:            Number.isNaN(costValue) ? null : costValue,
          shop_name:       repairType === 'DIY' ? null : (shopName.trim() || null),
          proof_file_path: proofId,
          proof_file_name: requiresProof ? (proofFile?.name || null) : null,
          notes:           notes.trim() || null,
      });

      if (error) {
        if (proofId) await api.files.remove(proofId);   // don't leave an orphan upload behind
        Alert.alert('Save Failed', error.message || 'Could not save the repair record.');
        return;
      }

      Alert.alert('Repair Saved', 'Your repair record has been added.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Unexpected repair save error:', err);
      Alert.alert('Save Failed', 'Something went wrong while saving the repair record.');
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
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </Touchable>
        <Text style={styles.headerTitle}>Log Repair</Text>
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

          {/* Repair Type */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Repair Type <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.typeGrid}>
              {REPAIR_TYPES.map((type) => {
                const selected = repairType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeTile, selected && styles.typeTileSelected]}
                    onPress={() => {
                      setRepairType(type.id);
                      if (!type.requiresProof) setProofFile(null);   // no receipt for DIY / Informal
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeTileText, selected && styles.typeTileTextSelected]}>
                      {type.label}
                    </Text>
                    {type.requiresProof && (
                      <Ionicons
                        name="camera"
                        size={12}
                        color={selected ? COLORS.primary : COLORS.textMuted}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Repair Description */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>
              Repair Description / Part Repaired <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, focusedField === 'title' && styles.inputFocused]}
              placeholder="e.g. Alternator Replacement, Radiator Fix"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
              selectionColor={COLORS.primary}
              underlineColorAndroid="transparent"
            />
          </View>

          {/* Shop / Provider (not needed for DIY) */}
          {repairType !== 'DIY' && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Repair Shop / Mechanic Name</Text>
              <MechanicPicker value={shopName} onChange={setShopName} />
            </View>
          )}

          {/* Odometer & Cost */}
          <View style={styles.row}>
            <View style={[styles.fieldBlock, styles.rowField]}>
              <Text style={styles.fieldLabel}>
                Odometer ({distanceUnit(useMetric)}) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'odometer' && styles.inputFocused,
                  odometerMissing && styles.inputError,
                ]}
                placeholder="e.g. 21300"
                placeholderTextColor={COLORS.textMuted}
                value={odometer}
                onChangeText={(t) => setOdometer(formatInteger(t, MAX_ODOMETER_DIGITS))}
                onFocus={() => setFocusedField('odometer')}
                onBlur={() => setFocusedField(null)}
                keyboardType="numeric"
                selectionColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={[styles.fieldBlock, styles.rowField]}>
              <Text style={styles.fieldLabel}>Total Cost (₱)</Text>
              <View style={[styles.costWrapper, focusedField === 'cost' && styles.inputFocused]}>
                <Text style={styles.costPrefix}>₱</Text>
                <TextInput
                  style={styles.costInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={cost}
                  onChangeText={(t) => setCost(formatMoney(t))}
                  onFocus={() => setFocusedField('cost')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="numeric"
                  selectionColor={COLORS.primary}
                  underlineColorAndroid="transparent"
                />
              </View>
            </View>
          </View>

          {odometerMissing && <Text style={styles.errorText}>Odometer is required.</Text>}

          {/* Photo proof */}
          <View style={styles.fieldBlock}>
            <View style={styles.proofHeaderRow}>
              <Text style={styles.fieldLabel}>
                Photo Proof of Receipt or Work Order
                {requiresProof && <Text style={styles.requiredAsterisk}> *</Text>}
              </Text>
              {requiresProof && (
                <Text style={styles.proofNotice}>Required for Official / Dealer</Text>
              )}
            </View>

            <Touchable
              style={[
                styles.uploadBox,
                hasPhoto && styles.uploadBoxAttached,
                requiresProof && !hasPhoto && styles.uploadBoxRequired,
                !requiresProof && styles.uploadBoxDisabled,
              ]}
              onPress={pickProof}
              disabled={!requiresProof}
              rippleColor="rgba(255,255,255,0.06)"
            >
              <View style={styles.uploadBoxInner}>
                <Ionicons
                  name={hasPhoto ? 'checkmark-circle' : 'camera-outline'}
                  size={32}
                  color={hasPhoto ? COLORS.success : requiresProof ? COLORS.primary : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.uploadTitle,
                    hasPhoto && { color: COLORS.success },
                    !requiresProof && { color: COLORS.textMuted },
                  ]}
                >
                  {!requiresProof
                    ? 'No receipt needed for this repair type'
                    : hasPhoto
                    ? proofFile.name || 'Receipt Attached'
                    : 'Tap to Attach Receipt Photo or PDF'}
                </Text>
                <Text style={styles.uploadHint}>
                  {!requiresProof
                    ? 'Choose Official Shop or Manufacturer/Dealer to attach one'
                    : hasPhoto
                    ? 'Tap to choose a different file'
                    : 'Proves repairs for warranty & resale value'}
                </Text>
              </View>
            </Touchable>

            {hasPhoto && <RemoveFileButton onPress={removeProof} label="Remove attachment" />}

            {requiresProof && (
              <CameraButton
                onPhoto={handleCameraPhoto}
                label="Take a photo of the receipt"
                style={{ marginTop: 10 }}
              />
            )}
          </View>

          {/* Notes */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Repair Notes & Diagnosis</Text>
            <TextInput
              style={[styles.input, styles.textarea, focusedField === 'notes' && styles.inputFocused]}
              placeholder="What was the symptom? Which parts were replaced?"
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
              onFocus={() => setFocusedField('notes')}
              onBlur={() => setFocusedField(null)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              selectionColor={COLORS.primary}
              underlineColorAndroid="transparent"
            />
          </View>

        </ScrollView>

        {/* Pinned footer: always visible, even with the keyboard open */}
        <View style={styles.footer}>
          {!canSave && (
            <Text style={styles.footerHint}>Still needed: {missing.join(', ')}</Text>
          )}
          <Touchable
            style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
            onPress={handleConfirm}
            disabled={saving}
            rippleColor="rgba(0,0,0,0.15)"
          >
            <View style={styles.saveButtonInner}>
              <Ionicons name="save-outline" size={20} color={COLORS.textInverse} />
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving…' : 'Save Repair Record'}
              </Text>
            </View>
          </Touchable>
        </View>
      </KeyboardAvoidingView>

      <ConfirmCard
        visible={confirmOpen}
        icon="construct"
        title="Save this repair?"
        headline={title.trim()}
        subline={repairType}
        rows={[
          { label: 'Odometer', value: `${odometer} ${distanceUnit(useMetric)}` },
          ...(cost.trim() ? [{ label: 'Cost', value: `₱${cost.trim()}` }] : []),
        ]}
        confirmLabel="Save"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          handleSave();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  fieldBlock: { marginBottom: SPACING.lg },
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
    rowGap: 8,
  },
  typeTile: {
    width: '48%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
  },
  typeTileSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  typeTileText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  typeTileTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  input: {
    color: COLORS.textPrimary,
    fontSize: 15,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 50,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.lg,
  },
  textarea: {
    height: 90,
    paddingVertical: SPACING.sm,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  rowField: { flex: 1 },
  costWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 50,
  },
  costPrefix: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginRight: 4,
  },
  costInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  proofHeaderRow: {
    marginBottom: SPACING.sm,
  },
  proofNotice: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: -4,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADII.card,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  uploadBoxDisabled: {
    opacity: 0.4,
  },
  uploadBoxRequired: {
    borderColor: 'rgba(55, 194, 223, 0.4)',
  },
  uploadBoxAttached: {
    borderColor: COLORS.success,
    borderStyle: 'solid',
    backgroundColor: 'rgba(46, 213, 115, 0.08)',
  },
  uploadBoxInner: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  uploadHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  saveButton: {
    borderRadius: RADII.button,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xs,
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
  footer: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  saveButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});