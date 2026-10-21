// Shared form pieces, so every "add a record" screen looks and behaves the same:
//   <Field label="Odometer (km)" required hint="...">  label (+ optional hint) above an input
//   <BoxInput />      boxed text input (add `multiline` for a notes box)
//   <AmountInput />   boxed money input with a peso sign, 2 decimals max
//   <MileageInput />  boxed odometer input: thousands commas, 6 digits max (999,999)
// Use these in any new form instead of styling a TextInput by hand.
import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADII } from '../constants/theme';

// ---------- helpers ----------
export const MAX_MILEAGE_DIGITS = 6;
export const withCommas = (digits) => String(digits || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const cleanMileage = (text) =>
  text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_MILEAGE_DIGITS);

// Digits and one dot, 2 decimals, 7 digits before the dot at most.
export const cleanAmount = (text) => {
  const [whole, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  const int = whole.slice(0, 7);
  return rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int;
};
// "3199.5" -> "3,199.5" (what the money box shows; the stored value stays plain digits).
export const withCommasDecimal = (text) => {
  const [whole, dec] = String(text || '').split('.');
  return withCommas(whole) + (dec !== undefined ? `.${dec}` : '');
};
export const toNumber = (text) => {
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
export const formatMoney = (n) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- components ----------
export function Field({ label, required = false, hint, style, children }) {
  return (
    <View style={style}>
      {!!label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.asterisk}> *</Text>}
        </Text>
      )}
      {children}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export const BoxInput = forwardRef(function BoxInput({ style, multiline, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={COLORS.textMuted}
      selectionColor={COLORS.primary}
      underlineColorAndroid="transparent"
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...props}
      style={[styles.input, multiline && styles.textarea, focused && styles.focused, style]}
      onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
      onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
    />
  );
});

export function AmountInput({ value, onChangeText, placeholder = '0.00', style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, focused && styles.focused, style]}>
      <Text style={styles.prefix}>₱</Text>
      <TextInput
        style={styles.boxText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        selectionColor={COLORS.primary}
        underlineColorAndroid="transparent"
        keyboardType="decimal-pad"
        {...props}
        value={withCommasDecimal(value)}
        onChangeText={(t) => onChangeText(cleanAmount(t))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// `value` is the plain digits ("24500"); it is shown as "24,500". onChangeText gets plain digits back.
export function MileageInput({ value, onChangeText, placeholder = 'e.g. 24,500', ...props }) {
  return (
    <BoxInput
      placeholder={placeholder}
      keyboardType="number-pad"
      {...props}
      value={withCommas(value)}
      onChangeText={(t) => onChangeText(cleanMileage(t))}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  asterisk: { color: COLORS.primary },
  hint: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
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
  textarea: {
    height: 90,
    paddingVertical: SPACING.sm,
  },
  focused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 50,
  },
  prefix: { color: COLORS.textMuted, fontSize: 15, marginRight: 4 },
  boxText: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },
});