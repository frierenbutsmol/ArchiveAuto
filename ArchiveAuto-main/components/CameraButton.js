import React, { useState } from 'react';
import { Text, TouchableOpacity, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { takePhoto } from '../lib/takePhoto';

// A "Take a photo" button. It asks for camera permission the first time, opens the camera,
// and calls onPhoto({ uri, name, mimeType, size }) with the picture.
//   <CameraButton onPhoto={(photo) => ...} />
export default function CameraButton({ onPhoto, disabled = false, label = 'Take a photo', style }) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (busy || disabled) return;
    setBusy(true);
    const result = await takePhoto();
    setBusy(false);

    if (result.file) {
      onPhoto(result.file);
      return;
    }
    if (result.error) {
      Alert.alert(
        'Camera',
        result.error,
        result.blocked
          ? [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          : undefined
      );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={open}
      disabled={disabled || busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <MaterialIcons name="photo-camera" size={20} color={disabled ? COLORS.textMuted : COLORS.primary} />
      )}
      <Text style={[styles.text, disabled && styles.textDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 46,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  disabled: { opacity: 0.45, borderColor: COLORS.border },
  text: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  textDisabled: { color: COLORS.textMuted },
});