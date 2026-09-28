import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableNativeFeedback,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const SELECTED_VEHICLE_KEY = '@archiveauto_selected_vehicle';
const BUCKET = 'archiveauto-files';

// Colors pulled from the AutoCare design tokens
const C = {
  background: '#141316',
  surfaceContainerHigh: '#2b292d',
  surfaceContainerLow: '#1c1b1e',
  outline: '#849495',
  outlineVariant: '#3a494b',
  primaryContainer: '#00f2ff',
  onSurface: '#e6e1e5',
  onSurfaceVariant: '#b9cacb',
  error: '#ffb4ab',
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

const DOCUMENT_TYPES = ['OR/CR', 'Insurance', 'Warranty', 'Other'];

const TYPE_ICONS = {
  'OR/CR': 'directions-car',
  Insurance: 'shield',
  Warranty: 'verified',
  Other: 'description',
};

const getMimeType = (fileName) => {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return null;
  }
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

// Maps a DB row to what the card needs.
const toCard = (row) => {
  const ext = row.file_path?.split('.').pop()?.toLowerCase();
  const isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png';

  let status = 'No expiry';
  let statusColor = C.onSurfaceVariant;

  if (row.expiry_date) {
    const days = Math.ceil(
      (new Date(row.expiry_date).getTime() - Date.now()) / 86400000
    );
    if (days < 0) {
      status = 'Expired';
      statusColor = C.error;
    } else if (days <= 30) {
      status = 'Expiring Soon';
      statusColor = C.error;
    } else {
      status = 'Active';
      statusColor = C.primaryContainer;
    }
  }

  return {
    id: row.id,
    filePath: row.file_path,
    icon: TYPE_ICONS[row.document_type] || 'description',
    title: row.notes || row.document_type || 'Untitled document',
    dateLabel: row.created_at ? `Added: ${formatDate(row.created_at)}` : '',
    status,
    statusColor,
    fileType: (ext || 'file').toUpperCase(),
    fileIcon: isImage ? 'image' : 'description',
  };
};

// Real Material ripple on Android; opacity dimming on iOS.
// The caller's style goes on the touchable's child so it shrink-wraps its
// content; the outer View only clips the ripple to the border radius.
function Touchable({ onPress, style, children, rippleColor, borderless = false, disabled = false }) {
  if (Platform.OS === 'android') {
    const flatStyle = StyleSheet.flatten(style) || {};
    return (
      <View style={{ borderRadius: flatStyle.borderRadius, overflow: 'hidden' }}>
        <TouchableNativeFeedback
          onPress={onPress}
          disabled={disabled}
          background={TouchableNativeFeedback.Ripple(
            rippleColor || 'rgba(255,255,255,0.08)',
            borderless
          )}
        >
          <View style={style}>{children}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={style}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function AddDocument() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const [vehicle, setVehicle] = useState(
    route?.params?.vehicle || route?.params?.selectedVehicle || null
  );
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add-document sheet state
  const [showForm, setShowForm] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('OR/CR');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expiryFocused, setExpiryFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  // Route param -> saved vehicle -> first vehicle.
  const resolveVehicle = async () => {
    if (vehicle?.id) return vehicle;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('You are not signed in.');

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!vehicles || vehicles.length === 0) return null;

    let chosen = null;
    const saved = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        chosen = vehicles.find((v) => v.id === parsed.id) || null;
      } catch (e) {
        console.log('Failed to read saved vehicle:', e.message);
      }
    }
    return chosen || vehicles[0];
  };

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const activeVehicle = await resolveVehicle();
      setVehicle(activeVehicle);

      if (!activeVehicle) {
        setDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('vehicle_id', activeVehicle.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []).map(toCard));
    } catch (error) {
      console.error('Load documents error:', error);
      Alert.alert('Could not load documents', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.vehicle?.id, route?.params?.selectedVehicle?.id]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments])
  );

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const resetForm = () => {
    setDocName('');
    setDocType('OR/CR');
    setExpiryDate('');
    setSelectedFile(null);
  };

  const openForm = () => {
    if (!vehicle?.id) {
      Alert.alert('No Vehicle', 'Add a vehicle first, then you can upload documents.');
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      const detectedMimeType = getMimeType(file.name);
      if (!detectedMimeType) {
        Alert.alert('Unsupported File', 'Please select a PDF, JPG, JPEG, or PNG file.');
        return;
      }

      setSelectedFile({ ...file, detectedMimeType });

      if (!docName.trim()) {
        setDocName(file.name?.replace(/\.[^/.]+$/, '') || '');
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('File Selection Failed', 'Could not select the document.');
    }
  };

  const handleSaveDocument = async () => {
    if (!vehicle?.id) {
      Alert.alert('No Vehicle', 'Please select a vehicle first.');
      return;
    }
    if (!docName.trim()) {
      Alert.alert('Missing Information', 'Please enter a document title.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Missing Document', 'Please select a PDF or photo scan.');
      return;
    }

    // Validate the date before uploading anything.
    let formattedExpiryDate = null;
    if (expiryDate.trim()) {
      const parsedExpiry = new Date(expiryDate.trim());
      if (Number.isNaN(parsedExpiry.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid expiry date.');
        return;
      }
      formattedExpiryDate = parsedExpiry.toISOString().split('T')[0];
    }

    const mimeType =
      selectedFile.detectedMimeType || getMimeType(selectedFile.name);
    if (!mimeType) {
      Alert.alert('Unsupported File', 'Only PDF, JPG, JPEG, and PNG files are supported.');
      return;
    }

    let filePath = null;

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const fileExtension =
        selectedFile.name?.split('.').pop()?.toLowerCase() || 'file';
      const safeFileName =
        selectedFile.name?.replace(/[^a-zA-Z0-9._-]/g, '_') ||
        `document.${fileExtension}`;

      filePath = `${user.id}/${vehicle.id}/documents/${Date.now()}_${safeFileName}`;

      const response = await fetch(selectedFile.uri);
      if (!response.ok) throw new Error('Failed to read the selected file.');

      // ArrayBuffer instead of Blob: React Native/Expo can report fetched
      // blobs as text/plain.
      const fileArrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, fileArrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Document upload error:', uploadError);
        filePath = null; // nothing to clean up
        Alert.alert('Upload Failed', uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from('documents').insert({
        vehicle_id: vehicle.id,
        document_type: docType,
        file_path: filePath,
        issue_date: null,
        expiry_date: formattedExpiryDate,
        notes: docName.trim(),
      });

      if (insertError) {
        console.error('Document database error:', insertError);
        await supabase.storage.from(BUCKET).remove([filePath]);
        Alert.alert('Save Failed', insertError.message);
        return;
      }

      setShowForm(false);
      resetForm();
      await loadDocuments();
      Alert.alert('Saved', 'Document uploaded successfully.');
    } catch (error) {
      console.error('Save document error:', error);
      if (filePath) {
        await supabase.storage.from(BUCKET).remove([filePath]).catch(() => {});
      }
      Alert.alert('Save Failed', 'Something went wrong while uploading the document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentPress = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.filePath, 60 * 5);
      if (error) throw error;
      await Linking.openURL(data.signedUrl);
    } catch (error) {
      console.error('Open document error:', error);
      Alert.alert('Could not open document', error?.message || 'Please try again.');
    }
  };

  const deleteDocument = async (doc) => {
    try {
      const { error: rowError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);
      if (rowError) throw rowError;

      await supabase.storage.from(BUCKET).remove([doc.filePath]);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (error) {
      console.error('Delete document error:', error);
      Alert.alert('Delete Failed', error?.message || 'Please try again.');
    }
  };

  const handleMorePress = (doc) => {
    Alert.alert(doc.title, undefined, [
      { text: 'Open', onPress: () => handleDocumentPress(doc) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete document?', 'This removes the file permanently.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteDocument(doc) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const canSave = docName.trim().length > 0 && !!selectedFile && !saving;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top app bar */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <Touchable
          onPress={handleBack}
          style={styles.backButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
        </Touchable>
        <Text style={styles.brand}>ArchiveAuto</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Documents</Text>
            <Text style={styles.subtitle}>
              Manage your vehicle records and paperwork.
            </Text>
          </View>
        </View>

        <Touchable
          style={styles.uploadButton}
          onPress={openForm}
          rippleColor="rgba(0,0,0,0.15)"
        >
          <View style={styles.uploadButtonInner}>
            <MaterialIcons name="upload" size={20} color="#121212" />
            <Text style={styles.uploadButtonText}>Upload Document</Text>
          </View>
        </Touchable>

        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="small" color={C.primaryContainer} />
          </View>
        ) : (
          <View style={styles.grid}>
            {documents.length === 0 && (
              <Text style={styles.emptyText}>
                {vehicle
                  ? 'No documents yet. Upload your OR/CR, insurance, or warranty to keep them in one place.'
                  : 'Add a vehicle first, then you can upload documents.'}
              </Text>
            )}

            {documents.map((doc) => (
              <Touchable
                key={doc.id}
                style={styles.card}
                onPress={() => handleDocumentPress(doc)}
                rippleColor="rgba(255,255,255,0.06)"
              >
                <View style={styles.cardInner}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIconWrapper}>
                      <MaterialIcons name={doc.icon} size={22} color={C.primaryContainer} />
                    </View>
                    <Touchable
                      style={styles.moreButton}
                      borderless
                      rippleColor="rgba(255,255,255,0.15)"
                      onPress={() => handleMorePress(doc)}
                    >
                      <MaterialIcons name="more-vert" size={20} color={C.onSurfaceVariant} />
                    </Touchable>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{doc.title}</Text>
                    {!!doc.dateLabel && <Text style={styles.cardDate}>{doc.dateLabel}</Text>}
                  </View>

                  <View style={styles.cardFooter}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: `${doc.statusColor}1A` },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: doc.statusColor }]}>
                        {doc.status}
                      </Text>
                    </View>
                    <View style={styles.fileTypeRow}>
                      <MaterialIcons name={doc.fileIcon} size={16} color={C.onSurfaceVariant} />
                      <Text style={styles.fileTypeText}>{doc.fileType}</Text>
                    </View>
                  </View>
                </View>
              </Touchable>
            ))}

            {/* Add new document card */}
            <Touchable
              style={styles.addCard}
              onPress={openForm}
              rippleColor="rgba(255,255,255,0.06)"
            >
              <View style={styles.addCardInner}>
                <MaterialIcons name="add-circle" size={36} color={C.onSurfaceVariant} />
                <Text style={styles.addCardTitle}>Add New Document</Text>
                <Text style={styles.addCardHint}>Tap to browse</Text>
              </View>
            </Touchable>
          </View>
        )}
      </ScrollView>

      {/* Add document sheet */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKav}
          >
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Add Document</Text>
                <Touchable
                  style={styles.moreButton}
                  borderless
                  onPress={closeForm}
                  disabled={saving}
                  rippleColor="rgba(255,255,255,0.15)"
                >
                  <MaterialIcons name="close" size={20} color={C.onSurfaceVariant} />
                </Touchable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
              >
                <Text style={styles.fieldLabel}>Document title *</Text>
                <TextInput
                  style={[styles.input, nameFocused && styles.inputFocused]}
                  placeholder="e.g. Official Receipt (OR), Insurance Policy"
                  placeholderTextColor="rgba(185, 202, 203, 0.5)"
                  value={docName}
                  onChangeText={setDocName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  editable={!saving}
                  selectionColor={C.primaryContainer}
                  underlineColorAndroid="transparent"
                />

                <Text style={styles.fieldLabel}>Document type *</Text>
                <View style={styles.typeRow}>
                  {DOCUMENT_TYPES.map((type) => {
                    const active = docType === type;
                    return (
                      <Touchable
                        key={type}
                        style={[styles.typeButton, active && styles.typeButtonActive]}
                        onPress={() => setDocType(type)}
                        disabled={saving}
                        rippleColor="rgba(0, 242, 255, 0.12)"
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            active && styles.typeButtonTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </Touchable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Expiry / renewal date</Text>
                <TextInput
                  style={[styles.input, expiryFocused && styles.inputFocused]}
                  placeholder="e.g. Oct 28, 2026 or YYYY-MM-DD"
                  placeholderTextColor="rgba(185, 202, 203, 0.5)"
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  onFocus={() => setExpiryFocused(true)}
                  onBlur={() => setExpiryFocused(false)}
                  editable={!saving}
                  selectionColor={C.primaryContainer}
                  underlineColorAndroid="transparent"
                />

                <Text style={styles.fieldLabel}>Document file *</Text>
                <Touchable
                  style={styles.filePickerBox}
                  onPress={pickDocument}
                  disabled={saving}
                  rippleColor="rgba(0, 242, 255, 0.12)"
                >
                  <MaterialIcons
                    name={selectedFile ? 'attach-file' : 'upload-file'}
                    size={24}
                    color={C.primaryContainer}
                  />
                  <Text style={styles.filePickerText} numberOfLines={2}>
                    {selectedFile ? selectedFile.name : 'Select PDF or photo scan'}
                  </Text>
                </Touchable>
                <Text style={styles.fileHint}>Supported files: PDF, JPG, JPEG, PNG</Text>

                <View style={!canSave && styles.disabled}>
                  <Touchable
                    style={styles.saveButton}
                    onPress={handleSaveDocument}
                    disabled={!canSave}
                    rippleColor="rgba(0,0,0,0.15)"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#121212" />
                    ) : (
                      <>
                        <MaterialIcons name="cloud-upload" size={20} color="#121212" />
                        <Text style={styles.saveButtonText}>Save Document</Text>
                      </>
                    )}
                  </Touchable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
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
    marginRight: 8,
  },
  brand: {
    color: C.primaryContainer,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    marginBottom: 4,
  },
  headerTextBlock: {
    gap: 4,
  },
  title: {
    color: C.onSurface,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  subtitle: {
    color: C.onSurfaceVariant,
    fontSize: 15,
  },
  uploadButton: {
    borderRadius: 999,
    backgroundColor: C.primaryContainer,
    ...Platform.select({
      ios: {
        shadowColor: C.primaryContainer,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  uploadButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  uploadButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  centerBlock: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: C.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(42,42,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(51,51,51,0.8)',
    borderRadius: 16,
  },
  cardInner: {
    padding: 16,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardIconWrapper: {
    backgroundColor: C.surfaceContainerLow,
    padding: 12,
    borderRadius: 10,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  cardDate: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58,73,75,0.5)',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fileTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileTypeText: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  addCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.outlineVariant,
    borderRadius: 16,
  },
  addCardInner: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addCardTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  addCardHint: {
    color: C.onSurfaceVariant,
    fontSize: 12,
  },

  // Add document sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalKav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.outlineVariant,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sheetTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  fieldLabel: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.surfaceContainerHigh,
    borderBottomWidth: 2,
    borderBottomColor: C.outline,
    paddingHorizontal: 16,
    minHeight: 52,
    color: C.onSurface,
    fontSize: 16,
    marginBottom: 16,
  },
  inputFocused: {
    borderBottomColor: C.primaryContainer,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  typeButtonActive: {
    backgroundColor: 'rgba(0, 242, 255, 0.12)',
    borderColor: C.primaryContainer,
  },
  typeButtonText: {
    color: C.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: C.primaryContainer,
    fontWeight: '600',
  },
  filePickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerHigh,
    marginBottom: 6,
  },
  filePickerText: {
    color: C.primaryContainer,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  fileHint: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: C.primaryContainer,
  },
  saveButtonText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  disabled: {
    opacity: 0.4,
  },
});