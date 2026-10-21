// A small red "Remove" button to show under an attached file.
//
//   {file && <RemoveFileButton onPress={() => setFile(null)} />}
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

export default function RemoveFileButton({ onPress, disabled, label = 'Remove file', style }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: COLORS.dangerMuted,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    marginTop: 10,
  },
  text: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});