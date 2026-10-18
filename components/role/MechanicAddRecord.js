import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ScreenHeader, PrimaryButton, ui } from './RoleUI';

const SERVICE_TYPES = ['Oil Change', 'Tires', 'Brakes', 'Fluids', 'Battery', 'Other'];
const MAX_PROOF_BYTES = 8 * 1024 * 1024;   // same limit as the server
const PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const mimeFromName = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : null;
};
const todayISO = () => new Date().toISOString().split('T')[0];

const validDate = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

// Form for a mechanic to add a maintenance or repair record to a shared vehicle.
// The record is saved on the owner's account and labelled with the mechanic's name.
export default function MechanicAddRecord() {
  const navigation = useNavigation();
  const { vehicleId, vehicleName, kind } = useRoute().params;
  const isRepair = kind === 'repair';

  const [type, setType] = useState(isRepair ? '' : SERVICE_TYPES[0]);
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [shop, setShop] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [proofFile, setProofFile] = useState(null);   // optional receipt / work order

  // Tap to choose a receipt photo or PDF; tap again to remove it.
  const pickProof = async () => {
    if (proofFile) { setProofFile(null); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: PROOF_TYPES, copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      const mime = PROOF_TYPES.includes(file.mimeType) ? file.mimeType : mimeFromName(file.name);
      if (!mime) return Alert.alert('Unsupported file', 'Please choose a JPG, PNG or PDF.');
      if (file.size && file.size > MAX_PROOF_BYTES) return Alert.alert('File too large', 'Please choose a file under 8 MB.');
      setProofFile({ ...file, mime });
    } catch {
      Alert.alert('File selection failed', 'Could not select the file.');
    }
  };

  const save = async () => {
    if (!type.trim()) return Alert.alert('Missing information', isRepair ? 'Enter the repair type.' : 'Choose a service type.');
    if (!validDate(date)) return Alert.alert('Invalid date', 'Use the format YYYY-MM-DD, for example 2026-10-31.');

    const body = { [isRepair ? 'repair_type' : 'maintenance_type']: type.trim(), [isRepair ? 'repair_date' : 'service_date']: date };
    if (description.trim()) body.description = description.trim();
    if (shop.trim()) body.shop_name = shop.trim();
    if (notes.trim()) body.notes = notes.trim();
    if (mileage.trim()) {
      const n = Number(mileage);
      if (!Number.isFinite(n) || n < 0) return Alert.alert('Invalid mileage', 'Mileage must be a positive number.');
      body.mileage = n;
    }
    if (cost.trim()) {
      const n = Number(cost);
      if (!Number.isFinite(n) || n < 0) return Alert.alert('Invalid cost', 'Cost must be a positive number.');
      body.cost = n;
    }

    setSaving(true);
    let proofId = null;
    if (proofFile) {
      const upload = await api.files.upload(proofFile.uri, { mime: proofFile.mime, name: proofFile.name });
      if (upload.error) {
        setSaving(false);
        return Alert.alert('Upload failed', upload.error.message);
      }
      proofId = upload.data.id;
      body.proof_file_path = proofId;
      body.proof_file_name = proofFile.name || null;
    }
    const { error } = isRepair
      ? await api.mechanic.addRepair(vehicleId, body)
      : await api.mechanic.addMaintenance(vehicleId, body);
    setSaving(false);

    if (error) {
      if (proofId) await api.files.remove(proofId);   // don't leave an orphan upload behind
      return Alert.alert('Could not save', error.message);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader
        title={isRepair ? 'Add Repair' : 'Add Maintenance'}
        subtitle={vehicleName}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
          <Text style={[ui.label, { marginTop: 0 }]}>{isRepair ? 'Repair type' : 'Service type'}</Text>
          {isRepair ? (
            <TextInput style={ui.input} value={type} onChangeText={setType} placeholder="e.g. Brake pad replacement" placeholderTextColor={COLORS.textMuted} maxLength={60} />
          ) : (
            <View style={ui.chipRow}>
              {SERVICE_TYPES.map((t) => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[ui.chip, type === t && ui.chipActive]}>
                  <Text style={[ui.chipText, type === t && ui.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={ui.label}>Date (YYYY-MM-DD)</Text>
          <TextInput style={ui.input} value={date} onChangeText={setDate} placeholder="2026-10-31" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" maxLength={10} />

          <Text style={ui.label}>Description</Text>
          <TextInput style={ui.input} value={description} onChangeText={setDescription} placeholder="What was done" placeholderTextColor={COLORS.textMuted} maxLength={300} />

          <Text style={ui.label}>Mileage (km)</Text>
          <TextInput style={ui.input} value={mileage} onChangeText={setMileage} placeholder="e.g. 45000" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

          <Text style={ui.label}>Cost</Text>
          <TextInput style={ui.input} value={cost} onChangeText={setCost} placeholder="e.g. 3500" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

          <Text style={ui.label}>Shop name</Text>
          <TextInput style={ui.input} value={shop} onChangeText={setShop} placeholder="Your shop" placeholderTextColor={COLORS.textMuted} maxLength={100} />

          <Text style={ui.label}>Notes</Text>
          <TextInput style={[ui.input, ui.inputMulti]} value={notes} onChangeText={setNotes} placeholder="Anything the owner should know" placeholderTextColor={COLORS.textMuted} multiline maxLength={2000} />

          <Text style={ui.label}>Receipt or work order (optional)</Text>
          <TouchableOpacity
            onPress={pickProof}
            activeOpacity={0.8}
            style={{
              borderWidth: 1.5,
              borderStyle: proofFile ? 'solid' : 'dashed',
              borderColor: proofFile ? COLORS.success : 'rgba(55, 194, 223, 0.4)',
              borderRadius: 12,
              paddingVertical: 18,
              paddingHorizontal: 16,
              alignItems: 'center',
              backgroundColor: COLORS.surface,
            }}
          >
            <Ionicons name={proofFile ? 'checkmark-circle' : 'camera-outline'} size={28} color={proofFile ? COLORS.success : COLORS.primary} />
            <Text style={{ color: proofFile ? COLORS.success : COLORS.primary, fontSize: 13, fontWeight: '600', marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
              {proofFile ? proofFile.name || 'Receipt attached' : 'Tap to attach a receipt photo or PDF'}
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4 }}>
              {proofFile ? 'Tap again to remove' : 'The owner keeps it with the record'}
            </Text>
          </TouchableOpacity>

          <PrimaryButton label="Save record" onPress={save} loading={saving} style={{ marginTop: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}