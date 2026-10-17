// A confirmation pop-up in the app's own style: an icon in a circle, a title, a small
// summary card, and Cancel / Confirm buttons.
//
//   <ConfirmCard
//     visible={open}
//     icon="construct"                      // any Ionicons name, shown inside the circle
//     title="Save this repair?"
//     headline="Alternator replacement"     // optional, bold line in the summary card
//     subline="Official Shop"               // optional, second line in the summary card
//     rows={[{ label: 'Odometer', value: '5,000 km' }, { label: 'Cost', value: '₱1,500' }]}
//     confirmLabel="Save"
//     onCancel={() => setOpen(false)}
//     onConfirm={() => { setOpen(false); save(); }}
//   />
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';

export default function ConfirmCard({
  visible,
  icon = 'help-circle',
  title,
  headline,
  subline,
  rows = [],
  cancelLabel = 'Cancel',
  confirmLabel = 'Save',
  onCancel,
  onConfirm,
}) {
  const hasSummary = !!headline || !!subline || rows.length > 0;

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={30} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>{title}</Text>

          {hasSummary && (
            <View style={styles.summary}>
              {!!headline && <Text style={styles.headline}>{headline}</Text>}
              {!!subline && <Text style={styles.subline}>{subline}</Text>}
              {rows.map((row) => (
                <View key={row.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  summary: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  headline: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subline: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  rowLabel: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: RADII.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  confirmText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});