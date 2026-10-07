import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';
import appJson from '../app.json';
import { useSettings, updateSettings } from '../lib/settings';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const settings = useSettings();

  // Real, saved preferences. Alerts and distance units read these.
  const toggles = [
    {
      id: 'maint',
      label: 'Mileage Reminders',
      desc: 'Alert when a service is due or overdue by odometer',
      value: settings.mileageReminders,
      onValueChange: (v) => updateSettings({ mileageReminders: v }),
    },
    {
      id: 'doc',
      label: 'Document Expiry Alerts',
      desc: '30-day notice before OR/CR, insurance and warranty expire',
      value: settings.docExpiryAlerts,
      onValueChange: (v) => updateSettings({ docExpiryAlerts: v }),
    },
    {
      id: 'metric',
      label: 'Use Kilometres',
      desc: 'Show distances in km (turn off for miles)',
      value: settings.useMetric,
      onValueChange: (v) => updateSettings({ useMetric: v }),
    },
  ];

  const accountItems = [
    {
      id: 'security',
      icon: 'lock-closed-outline',
      label: 'Security & Password',
      onPress: () => navigation.navigate('UpdatePassword'),
    },
  ];

  const links = [
    { id: 'faq', label: 'Help & FAQ' },
    { id: 'proof', label: 'Photo Proof Policy & Verification Guidelines' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms of Service' },
    { id: 'about', label: 'About ArchiveAuto' },
  ];

  const handleSignOut = async () => {
    await api.auth.signOut();   // clears the saved token
    navigation.reset({
      index: 0,
      routes: [{ name: 'SignIn' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {accountItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.linkRow, index !== accountItems.length - 1 && styles.rowDivider]}
              activeOpacity={0.7}
              onPress={item.onPress}>
              <View style={styles.linkRowLeft}>
                <Ionicons name={item.icon} size={18} color={COLORS.textMuted} />
                <Text style={styles.rowLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminders & Preferences */}
        <Text style={styles.sectionTitle}>Reminders & Preferences</Text>
        <View style={styles.card}>
          {toggles.map((item, index) => (
            <View
              key={item.id}
              style={[styles.row, index !== toggles.length - 1 && styles.rowDivider]}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onValueChange}
                trackColor={{ false: COLORS.surfaceSubtle, true: COLORS.primary }}
                thumbColor={item.value ? COLORS.textInverse : '#FFFFFF'}
              />
            </View>
          ))}
        </View>

        {/* Legal & About */}
        <Text style={styles.sectionTitle}>About & Legal</Text>
        <View style={styles.card}>
          {links.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.linkRow, index !== links.length - 1 && styles.rowDivider]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Info', { page: item.id })}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
          <View style={styles.linkRow}>
            <Text style={styles.rowLabel}>App Version</Text>
            <Text style={styles.versionText}>v{appJson.expo?.version || '1.0.0'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} activeOpacity={0.8} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: 90,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  linkRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  rowLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  rowDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.button,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});