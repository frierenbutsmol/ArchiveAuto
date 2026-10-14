import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';

const REQUIREMENTS = [
  {
    key: 'length',
    label: 'At least 8 characters',
    test: (v) => v.length >= 8,
  },
  {
    key: 'lower',
    label: 'One lowercase letter',
    test: (v) => /[a-z]/.test(v),
  },
  {
    key: 'upper',
    label: 'One uppercase letter',
    test: (v) => /[A-Z]/.test(v),
  },
  {
    key: 'number',
    label: 'One number',
    test: (v) => /[0-9]/.test(v),
  },
];

export default function UpdatePassword({ navigation, route }) {
  // Set when the user arrives from a reset link: archiveauto://reset-password?token=...
  const resetToken = route?.params?.token;
  // Changing the password while logged in needs the current one; a reset link does not.
  const needsCurrent = !resetToken;
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = useMemo(
    () =>
      REQUIREMENTS.map((r) => ({
        ...r,
        met: r.test(password),
      })),
    [password]
  );

  const allMet = checks.every((c) => c.met);

  const passwordsMatch =
    password.length > 0 && password === confirmPassword;

  const sameAsCurrent =
    needsCurrent && password.length > 0 && password === currentPassword;

  const canSubmit =
    allMet &&
    passwordsMatch &&
    (!needsCurrent || (currentPassword.length > 0 && !sameAsCurrent)) &&
    !loading;

  const handleResetPassword = async () => {
    if (!canSubmit) return;

    setLoading(true);

    const { error } = resetToken
      ? await api.auth.resetPassword(resetToken, password)
      : await api.auth.updatePassword(currentPassword, password);

    setLoading(false);

    if (error) {
      Alert.alert(
        'Password Update Failed',
        error.message
      );
      return;
    }

    Alert.alert(
      'Password Updated',
      'Your password has been changed successfully.',
      [
        {
          text: 'Continue',
          onPress: async () => {
            if (!resetToken) await api.auth.signOut();   // log in again with the new password
            navigation.reset({
              index: 0,
              routes: [{ name: 'SignIn' }],
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Image
            source={require('../assets/Vector2.png')}
            resizeMode="cover"
            style={styles.bannerImage}
          />

          <View style={styles.headerGradientOverlay} />

          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.canGoBack() && navigation.goBack()
              }
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
              }}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>

            <Text style={styles.brandBadge}>
              ARCHIVEAUTO
            </Text>

            <Text style={styles.title}>
              {needsCurrent ? 'Change password' : 'Reset password'}
            </Text>

            <Text style={styles.subtitle}>
              {needsCurrent
                ? 'Enter your current password, then choose a new one'
                : 'Create a new secure password for your account'}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {needsCurrent && (
            <>
              <Text style={styles.label}>
                Current password
              </Text>

              <View style={styles.inputRow}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  onPress={() => setShowCurrentPassword((v) => !v)}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={[styles.label, needsCurrent && { marginTop: SPACING.lg }]}>
            New password
          </Text>

          <View style={styles.inputRow}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={COLORS.textMuted}
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword((v) => !v)
              }
            >
              <Ionicons
                name={
                  showPassword
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Requirements */}
          <View style={styles.checklist}>
            {checks.map((c) => (
              <View
                key={c.key}
                style={styles.checkRow}
              >
                <View
                  style={[
                    styles.checkDot,
                    c.met && {
                      backgroundColor:
                        COLORS.success,
                      borderColor:
                        COLORS.success,
                    },
                  ]}
                >
                  {c.met && (
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={COLORS.textInverse}
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.checkLabel,
                    c.met &&
                      styles.checkLabelMet,
                  ]}
                >
                  {c.label}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={[
              styles.label,
              { marginTop: SPACING.lg },
            ]}
          >
            Confirm new password
          </Text>

          <View style={styles.inputRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.textMuted}
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword((v) =>
                  !v
                )
              }
            >
              <Ionicons
                name={
                  showConfirmPassword
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {sameAsCurrent && (
            <Text style={styles.mismatchText}>
              New password must be different from the current one
            </Text>
          )}

          {confirmPassword.length > 0 &&
            !passwordsMatch && (
              <Text style={styles.mismatchText}>
                Passwords don&apos;t match
              </Text>
            )}

          <TouchableOpacity
            style={[
              styles.ctaButton,
              !canSubmit &&
                styles.ctaButtonDisabled,
            ]}
            onPress={handleResetPassword}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            <Text style={styles.ctaText}>
              {loading
                ? 'Updating...'
                : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xxxl,
  },

  headerCard: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    height: 230,
    position: 'relative',
    justifyContent: 'flex-end',
  },

  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  headerGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'rgba(15, 14, 17, 0.45)',
  },

  headerContent: {
    paddingHorizontal:
      SPACING.screenPadding,
    paddingBottom: SPACING.xxl,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor:
      'rgba(15, 14, 17, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  brandBadge: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },

  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },

  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  form: {
    flex: 1,
    paddingHorizontal:
      SPACING.screenPadding,
    paddingTop: SPACING.xxl,
  },

  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.input,
    paddingHorizontal: SPACING.lg,
    height: 50,
  },

  inputIcon: {
    marginRight: SPACING.sm,
  },

  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },

  checklist: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },

  checkLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },

  checkLabelMet: {
    color: COLORS.textPrimary,
  },

  mismatchText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },

  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  ctaButtonDisabled: {
    opacity: 0.4,
  },

  ctaText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});