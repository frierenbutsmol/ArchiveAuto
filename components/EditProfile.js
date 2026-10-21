import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';
import { takeProfilePhoto, chooseProfilePhoto } from '../lib/pickPhoto';
import Avatar, { fileIdOf, FILE_PREFIX } from './Avatar';
import { Field, BoxInput } from './FormKit';
import { ScreenHeader, PrimaryButton, ErrorBanner } from './role/RoleUI';

const NAME_MAX = 60;   // same limit as the server

// Account information: change your display name and profile photo.
// Opened from "Account information" in Profile (owners, mechanics and admins).
export default function EditProfile() {
  const navigation = useNavigation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [newPhoto, setNewPhoto] = useState(null);        // { uri, name, mimeType }, picked but not saved yet
  const [removePhoto, setRemovePhoto] = useState(false); // the saved photo will be removed on Save
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.auth.getUser().then(({ data, error: err }) => {
      if (!alive) return;
      if (err || !data?.user) {
        setError(err?.message || 'Could not load your account.');
      } else {
        setUser(data.user);
        setName(data.user.display_name || '');
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const savedPhoto = user?.avatar_url || '';
  const hasPhoto = !!newPhoto || (!!savedPhoto && !removePhoto);
  const nameChanged = name.trim() !== (user?.display_name || '').trim();
  const photoChanged = !!newPhoto || removePhoto;
  const canSave = !!user && !busy && !!name.trim() && (nameChanged || photoChanged);

  const onPhotoResult = (r) => {
    if (r.file) {
      setNewPhoto(r.file);
      setRemovePhoto(false);
      setError('');
      return;
    }
    if (r.error) {
      Alert.alert(
        'Photo',
        r.error,
        r.blocked
          ? [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          : undefined
      );
    }
  };

  const onTakePhoto = async () => {
    if (busy) return;
    onPhotoResult(await takeProfilePhoto());
  };

  const onChoosePhoto = async () => {
    if (busy) return;
    onPhotoResult(await chooseProfilePhoto());
  };

  const onRemovePhoto = () => {
    setNewPhoto(null);
    setRemovePhoto(!!savedPhoto);
  };

  const save = async () => {
    if (!canSave) return;
    const trimmed = name.trim();
    setBusy(true);
    setError('');

    const fields = {};
    if (nameChanged) fields.display_name = trimmed;

    // 1) upload the new photo first, then point the profile at it
    let uploadedId = null;
    if (newPhoto) {
      const up = await api.files.upload(newPhoto.uri, { mime: newPhoto.mimeType, name: newPhoto.name });
      if (up.error || !up.data?.id) {
        setBusy(false);
        setError(up.error?.message || 'Could not upload the photo. Please try again.');
        return;
      }
      uploadedId = up.data.id;
      fields.avatar_url = `${FILE_PREFIX}${uploadedId}`;
    } else if (removePhoto) {
      fields.avatar_url = '';
    }

    // 2) save the name and photo together
    const res = await api.updateProfile(fields);
    if (res.error) {
      if (uploadedId) api.files.remove(uploadedId);   // don't leave an unused upload behind
      setBusy(false);
      setError(res.error.message || 'Could not save your changes. Please try again.');
      return;
    }

    // 3) the old photo is no longer used, so delete it
    const oldId = fileIdOf(savedPhoto);
    if (oldId && photoChanged) api.files.remove(oldId);

    setBusy(false);
    Alert.alert('Saved', 'Your account information was updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Account information" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Profile photo */}
            <View style={styles.photoBlock}>
              <Avatar
                size={112}
                localUri={newPhoto?.uri}
                value={removePhoto ? '' : savedPhoto}
              />

              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={onTakePhoto} activeOpacity={0.8} disabled={busy}>
                  <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={onChoosePhoto} activeOpacity={0.8} disabled={busy}>
                  <Ionicons name="images-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Choose photo</Text>
                </TouchableOpacity>
              </View>

              {hasPhoto ? (
                <TouchableOpacity onPress={onRemovePhoto} disabled={busy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.removeText}>Remove photo</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Name and email */}
            <Field label="Display name" required style={styles.field}>
              <BoxInput
                value={name}
                onChangeText={(t) => { setName(t); if (error) setError(''); }}
                placeholder="Your name"
                maxLength={NAME_MAX}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                editable={!busy}
              />
            </Field>

            <Field
              label="Email"
              hint="Your email is used to sign in and can't be changed here."
              style={styles.field}
            >
              <BoxInput value={user?.email || ''} editable={false} style={styles.readOnly} />
            </Field>

            <ErrorBanner message={error} />

            <PrimaryButton
              label="Save changes"
              onPress={save}
              loading={busy}
              disabled={!canSave}
              style={{ marginTop: SPACING.lg }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.screenPadding, paddingBottom: SPACING.xxxl },
  photoBlock: { alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.xxl },
  photoButtons: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    height: 42,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  photoBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  removeText: { color: COLORS.danger, fontSize: 14, fontWeight: '600', marginTop: SPACING.md },
  field: { marginBottom: SPACING.lg },
  readOnly: { opacity: 0.55 },
});