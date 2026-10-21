import React, { useMemo, useState } from 'react';
import {
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';
import FormMessage from './FormMessage';

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
  const [submitted, setSubmitted] = useState(false);       // after the first tap on Continue, problems show
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [currentWrong, setCurrentWrong] = useState(false);  // the server said the current password is wrong
  const [formError, setFormError] = useState('');

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

  const formValid =
    allMet &&
    passwordsMatch &&
    (!needsCurrent || (currentPassword.length > 0 && !sameAsCurrent));

  // Same idea as the login screen: a field turns red, with a message, when something is wrong.
  const showCurrentError = needsCurrent && (currentWrong || (submitted && !currentPassword));
  const showPasswordError = submitted && (!allMet || sameAsCurrent);
  const showConfirmError = (submitted || confirmTouched) && !passwordsMatch;

  const handleResetPassword = async () => {
    setSubmitted(true);
    setFormError('');
    setCurrentWrong(false);
    if (loading || !formValid) return;   // the red fields show what to fix

    setLoading(true);

    const { error } = resetToken
      ? await api.auth.resetPassword(resetToken, password)
      : await api.auth.updatePassword(currentPassword, password);

    setLoading(false);

    if (error) {
      if (/current password/i.test(error.message)) setCurrentWrong(true);
      setFormError(error.message);
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

              <View style={[styles.inputRow, showCurrentError && styles.inputRowError]}>
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
                  onChangeText={(v) => {
                    setCurrentPassword(v);
                    setCurrentWrong(false);
                    setFormError('');
                  }}
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
              {showCurrentError && (
                <Text style={styles.errorText}>
                  {currentWrong ? 'Your current password is incorrect.' : 'Enter your current password.'}
                </Text>
              )}
            </>
          )}

          <Text style={[styles.label, needsCurrent && { marginTop: SPACING.lg }]}>
            New password
          </Text>

          <View style={[styles.inputRow, showPasswordError && styles.inputRowError]}>
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

          {showPasswordError && (
            <Text style={styles.errorText}>
              {sameAsCurrent
                ? 'New password must be different from the current one.'
                : password
                  ? 'Your new password must meet every requirement below.'
                  : 'Enter a new password.'}
            </Text>
          )}

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
                    !c.met && submitted && { borderColor: COLORS.danger },
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
                    !c.met && submitted && styles.checkLabelError,
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

          <View style={[styles.inputRow, showConfirmError && styles.inputRowError]}>
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
              onBlur={() => setConfirmTouched(true)}
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

          {showConfirmError && (
            <Text style={styles.errorText}>
              {confirmPassword ? 'Passwords do not match.' : 'Please confirm your new password.'}
            </Text>
          )}

          {!!formError && (
            <FormMessage type="error" text={formError} style={{ marginTop: SPACING.lg }} />
          )}

          <TouchableOpacity
            style={[
              styles.ctaButton,
              loading &&
                styles.ctaButtonDisabled,
            ]}
            onPress={handleResetPassword}
            activeOpacity={0.85}
            disabled={loading}
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

  inputRowError: {
    borderColor: COLORS.danger,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
  },

  checkLabelError: {
    color: COLORS.danger,
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