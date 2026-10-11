// Small shared pieces for the mechanic, admin and sharing screens,
// built from the same theme tokens as the rest of the app.
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../constants/theme';
import { ROLE_LABELS } from '../../lib/roles';

export function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <View style={ui.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={ui.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={ui.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={ui.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right || null}
    </View>
  );
}

export function RolePill({ role }) {
  const color = role === 'admin' ? COLORS.danger : role === 'mechanic' ? COLORS.warning : COLORS.primary;
  const bg = role === 'admin' ? COLORS.dangerMuted : role === 'mechanic' ? COLORS.warningMuted : COLORS.primaryMuted;
  return (
    <View style={[ui.pill, { backgroundColor: bg }]}>
      <Text style={[ui.pillText, { color }]}>{ROLE_LABELS[role] || role}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, loading, disabled, icon, variant = 'solid', style }) {
  const outline = variant === 'outline';
  const danger = variant === 'danger';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        ui.btn,
        outline && ui.btnOutline,
        danger && ui.btnDanger,
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={outline ? COLORS.primary : COLORS.textInverse} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={outline ? COLORS.primary : danger ? COLORS.danger : COLORS.textInverse} style={{ marginRight: 8 }} /> : null}
          <Text style={[ui.btnText, outline && { color: COLORS.primary }, danger && { color: COLORS.danger }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function EmptyState({ icon = 'file-tray-outline', text }) {
  return (
    <View style={ui.empty}>
      <Ionicons name={icon} size={40} color={COLORS.textMuted} />
      <Text style={ui.emptyText}>{text}</Text>
    </View>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={ui.errorBox}>
      <Text style={ui.errorText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <Text style={ui.errorRetry}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Same look as the owner tabs in MainTabs.js, so every role feels like one app.
export function roleTabOptions(icons) {
  return ({ route }) => ({
    headerShown: false,
    tabBarShowLabel: true,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarStyle: ui.tabBar,
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textMuted,
    tabBarIcon: ({ color, focused }) => {
      const set = icons[route.name];
      return <Ionicons name={focused ? set.active : set.inactive} size={22} color={color} />;
    },
  });
}

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
};

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.screenPadding, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.screenPadding, paddingTop: SPACING.lg, paddingBottom: SPACING.lg,
  },
  backBtn: { marginRight: SPACING.md },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADII.card, borderWidth: 1,
    borderColor: COLORS.borderLight, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  cardMuted: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700', marginTop: SPACING.lg, marginBottom: SPACING.md },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADII.full, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48,
    borderRadius: RADII.button, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg,
  },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary },
  btnDanger: { backgroundColor: COLORS.dangerMuted, borderWidth: 1, borderColor: COLORS.danger },
  btnText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700' },
  label: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: SPACING.sm, marginTop: SPACING.lg },
  input: {
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.input, paddingHorizontal: SPACING.lg, height: 50, color: COLORS.textPrimary, fontSize: 15,
  },
  inputMulti: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADII.full, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceElevated, marginRight: 8, marginBottom: 8,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.md, textAlign: 'center', paddingHorizontal: 24 },
  errorBox: {
    backgroundColor: COLORS.dangerMuted, borderRadius: RADII.md, padding: SPACING.md,
    marginBottom: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  errorRetry: { color: COLORS.textPrimary, fontWeight: '700', marginLeft: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: RADII.card, borderWidth: 1,
    borderColor: COLORS.borderLight, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  statValue: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  tabBar: {
    backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 68, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
});