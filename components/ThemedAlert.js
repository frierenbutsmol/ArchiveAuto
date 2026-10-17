// A themed replacement for the phone's plain grey pop-up (Alert.alert).
//
// installThemedAlert() routes EVERY Alert.alert(...) call in the app to <AlertHost />, so all dialogs
// (confirmations, errors, "saved" notices, menus) share one look built from constants/theme.
// No screen needs to change: they keep calling Alert.alert(title, message, buttons) as before.
//
//   App.js:  installThemedAlert();  ...  <AlertHost />   (mounted once, next to the navigator)
//
// Look:  an icon in a coloured circle (warning / success / question ...), a centred title, the message,
//        and buttons: primary (cyan), danger (red) for style 'destructive', ghost for style 'cancel'.
//        A message with several short lines ("Odometer: 5000 km") is shown as a tidy summary card.
// Like the native alert, tapping outside or pressing Back does NOT dismiss it unless the call passes
// { cancelable: true }, so a button's action can never be skipped by accident.
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII, TYPOGRAPHY } from '../constants/theme';

// ---------- pure helpers (also used by the tests) ----------

// Buttons as given by the caller -> clean list. No buttons at all means a single "OK".
export function normalizeButtons(buttons) {
  const list = Array.isArray(buttons) ? buttons.filter(Boolean) : [];
  if (list.length === 0) return [{ text: 'OK' }];
  return list.map((b) => ({
    text: b.text === undefined || b.text === null ? 'OK' : String(b.text),
    style: b.style,
    onPress: b.onPress,
  }));
}

const PROBLEM_RE = /\b(invalid|missing|could not|couldn't|cannot|can't|unable|failed|failure|error|almost|too large|not found|expired|unavailable|denied|required|wrong|not saved|no vehicle)\b/i;
const SUCCESS_RE = /\b(saved|added|updated|created|deleted|removed|verified|sent|shared|success|done)\b/i;

// Which icon and colour to use.
export function kindOf(title, buttons) {
  if (buttons.some((b) => b.style === 'destructive')) return 'danger';
  if (buttons.length === 1) {
    if (PROBLEM_RE.test(title || '')) return 'warning';
    if (SUCCESS_RE.test(title || '')) return 'success';
    return 'info';
  }
  return 'question';
}

const KINDS = {
  danger: { icon: 'warning', color: COLORS.danger, bg: COLORS.dangerMuted },
  warning: { icon: 'alert-circle', color: COLORS.warning, bg: COLORS.warningMuted },
  success: { icon: 'checkmark-circle', color: COLORS.success, bg: COLORS.successMuted },
  info: { icon: 'information-circle', color: COLORS.primary, bg: COLORS.primaryMuted },
  question: { icon: 'help-circle', color: COLORS.primary, bg: COLORS.primaryMuted },
};

// A message of 2+ short lines becomes summary rows. "Label: value" lines get a muted label on the
// left and the value on the right; other lines are shown as plain text. Otherwise returns null.
export function parseSummary(message) {
  const lines = String(message || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2 || !lines.every((l) => l.length <= 90)) return null;
  return lines.map((line) => {
    const m = /^([^:]{1,30}):\s+(.+)$/.exec(line);
    return m ? { label: m[1], value: m[2] } : { value: line };
  });
}

// Which buttons to show, in which order, and how: 1 = one wide button, 2 = side by side, 3+ = stacked.
export function layoutFor(buttons) {
  const cancel = buttons.find((b) => b.style === 'cancel');
  if (buttons.length === 1) return { layout: 'single', ordered: buttons };
  if (buttons.length === 2) {
    const ordered = cancel ? [cancel, buttons.find((b) => b !== cancel)] : buttons;
    return { layout: 'row', ordered };
  }
  const actions = buttons.filter((b) => b !== cancel);
  return { layout: 'stack', ordered: cancel ? [...actions, cancel] : actions };
}

// Look of each button. The first "normal" button is the primary (cyan) one.
export function variantOf(button, isFirstAction) {
  if (button.style === 'destructive') return 'danger';
  if (button.style === 'cancel') return 'ghost';
  return isFirstAction ? 'primary' : 'secondary';
}

// ---------- plumbing: Alert.alert -> host ----------
let nativeAlert = null;   // the original Alert.alert, used until the host is mounted
let listener = null;      // set by <AlertHost /> while it is mounted
let seq = 0;

export function installThemedAlert() {
  if (nativeAlert) return;            // only once
  nativeAlert = Alert.alert.bind(Alert);
  Alert.alert = (title, message, buttons, options) => {
    if (!listener) return nativeAlert(title, message, buttons, options);   // not mounted yet: use the normal one
    listener({ title, message, buttons, options });
    return undefined;
  };
}

const makeItem = ({ title, message, buttons, options }) => ({
  id: ++seq,
  title: title === undefined || title === null ? '' : String(title),
  message: message === undefined || message === null ? '' : String(message),
  buttons: normalizeButtons(buttons),
  options: options || {},
  done: false,
});

// ---------- the dialog ----------
export function AlertHost() {
  const [queue, setQueue] = useState([]);       // alerts wait their turn, one dialog at a time
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listener = (req) => setQueue((q) => [...q, makeItem(req)]);
    return () => { listener = null; };
  }, []);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [current && current.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Close first, then run the button's action (like the native alert), and only once per dialog.
  const press = (button) => {
    if (!current || current.done) return;
    current.done = true;
    setQueue((q) => q.slice(1));
    if (typeof button.onPress === 'function') setTimeout(() => button.onPress(), 0);
  };

  const dismiss = () => {
    if (!current || current.done || current.options.cancelable !== true) return;
    current.done = true;
    setQueue((q) => q.slice(1));
    if (typeof current.options.onDismiss === 'function') setTimeout(() => current.options.onDismiss(), 0);
  };

  if (!current) return <Modal visible={false} transparent />;

  const kind = KINDS[kindOf(current.title, current.buttons)];
  const summary = parseSummary(current.message);
  const { layout, ordered } = layoutFor(current.buttons);
  const firstActionIndex = ordered.findIndex((b) => b.style !== 'cancel' && b.style !== 'destructive');

  const renderButton = (b, i) => {
    const variant = variantOf(b, i === firstActionIndex);
    const v = VARIANTS[variant];
    return (
      <TouchableOpacity
        key={`${current.id}-${i}`}
        testID={`alert-btn-${i}`}
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={() => press(b)}
        style={[styles.btn, v.btn, layout === 'row' && styles.btnRow, layout === 'stack' && styles.btnStack]}
      >
        <Text style={[styles.btnText, v.text]} numberOfLines={1}>{b.text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <Pressable testID="alert-backdrop" style={styles.backdrop} onPress={dismiss} accessible={false}>
        <Pressable accessible={false} onPress={() => {}} style={styles.cardWrap}>
          <Animated.View
            testID="themed-alert"
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={[
              styles.card,
              { opacity: appear, transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: kind.bg }]}>
              <Ionicons name={kind.icon} size={30} color={kind.color} />
            </View>

            {current.title ? <Text testID="alert-title" style={styles.title}>{current.title}</Text> : null}

            {summary ? (
              <View testID="alert-summary" style={styles.summary}>
                {summary.map((row, i) =>
                  row.label ? (
                    <View key={i} style={[styles.summaryRow, i > 0 && styles.summaryGap]}>
                      <Text style={styles.summaryLabel}>{row.label}</Text>
                      <Text style={styles.summaryValue}>{row.value}</Text>
                    </View>
                  ) : (
                    <Text key={i} style={[styles.summaryPlain, i === 0 && styles.summaryFirst, i > 0 && styles.summaryGap]}>
                      {row.value}
                    </Text>
                  )
                )}
              </View>
            ) : current.message ? (
              <ScrollView style={styles.messageScroll} bounces={false}>
                <Text testID="alert-message" style={styles.message}>{current.message}</Text>
              </ScrollView>
            ) : null}

            <View style={layout === 'row' ? styles.buttonsRow : styles.buttonsStack}>
              {ordered.map(renderButton)}
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const VARIANTS = {
  primary: {
    btn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    text: { color: COLORS.textInverse },
  },
  secondary: {
    btn: { backgroundColor: COLORS.surfaceSubtle, borderColor: COLORS.border },
    text: { color: COLORS.textPrimary },
  },
  danger: {
    btn: { backgroundColor: COLORS.dangerMuted, borderColor: COLORS.danger },
    text: { color: COLORS.danger },
  },
  ghost: {
    btn: { backgroundColor: 'transparent', borderColor: COLORS.border },
    text: { color: COLORS.textSecondary },
  },
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  cardWrap: { width: '100%', maxWidth: 380 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    alignItems: 'stretch',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.titleSm, textAlign: 'center' },
  messageScroll: { maxHeight: 220, marginTop: SPACING.sm },
  message: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  summary: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryGap: { marginTop: SPACING.sm },
  summaryLabel: { ...TYPOGRAPHY.bodySm, color: COLORS.textMuted, marginRight: SPACING.md },
  summaryValue: { ...TYPOGRAPHY.bodyBold, flexShrink: 1, textAlign: 'right' },
  summaryPlain: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textSecondary },
  summaryFirst: { ...TYPOGRAPHY.subtitle, color: COLORS.textPrimary },
  buttonsRow: { flexDirection: 'row', marginTop: SPACING.xl },
  buttonsStack: { marginTop: SPACING.xl },
  btn: {
    height: 48,
    borderRadius: RADII.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  btnRow: { flex: 1, marginHorizontal: SPACING.xs },
  btnStack: { marginBottom: SPACING.sm },
  btnText: { fontSize: 15, fontWeight: '700' },
});