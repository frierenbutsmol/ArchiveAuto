import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';

// A message shown inside the form instead of a pop-up.
//   <FormMessage type="error" text="Invalid email or password." />
//   <FormMessage type="info" text="..." actionLabel="Resend email" onAction={resend} />
const TONES = {
  error: { color: COLORS.danger, background: COLORS.dangerMuted, icon: 'alert-circle' },
  info: { color: COLORS.primary, background: COLORS.primaryMuted, icon: 'information-circle' },
  success: { color: COLORS.primary, background: COLORS.primaryMuted, icon: 'checkmark-circle' },
};

export default function FormMessage({ type = 'error', text, actionLabel, onAction, style }) {
  const tone = TONES[type] || TONES.error;
  return (
    <View
      style={[styles.box, { backgroundColor: tone.background, borderColor: tone.color }, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={tone.icon} size={18} color={tone.color} style={styles.icon} />
      <View style={styles.body}>
        <Text style={[styles.text, { color: tone.color }]}>{text}</Text>
        {!!actionLabel && !!onAction && (
          <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.action}>
            <Text style={[styles.actionText, { color: tone.color }]}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  icon: { marginRight: 8, marginTop: 1 },
  body: { flex: 1 },
  text: { fontSize: 13, lineHeight: 18 },
  action: { alignSelf: 'flex-start', marginTop: 6 },
  actionText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});