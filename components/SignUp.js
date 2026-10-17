import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';
import { emailError } from '../lib/validators';
import { routeForRole } from '../lib/roles';
import FormMessage from './FormMessage';

export default function SignUp() {
  const navigation = useNavigation();

  const [role, setRole] = useState('user');   // 'user' = vehicle owner, or 'mechanic'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);   // the server says this email already has an account
  const [submitted, setSubmitted] = useState(false);     // after the first tap on Create Account, every problem shows
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [formError, setFormError] = useState('');
  const emailMsg = emailError(email);
  const showEmailError = emailTaken || ((emailTouched || submitted) && !!emailMsg);
  const shownEmailMsg = emailTaken
    ? 'This email is already registered. Try logging in instead.'
    : emailMsg;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);   // Terms and Conditions checkbox

  // Password requirements
  const passwordRequirements = [
    {
      label: 'At least 8 characters',
      valid: password.length >= 8,
    },
    {
      label: 'One lowercase letter',
      valid: /[a-z]/.test(password),
    },
    {
      label: 'One uppercase letter',
      valid: /[A-Z]/.test(password),
    },
    {
      label: 'One number',
      valid: /[0-9]/.test(password),
    },
  ];

  // Same idea as the login screen: whatever is wrong turns that field red, with a short message.
  const passwordValid = passwordRequirements.every((requirement) => requirement.valid);
  const confirmMsg = !confirmPassword
    ? 'Please confirm your password.'
    : confirmPassword !== password
      ? 'Passwords do not match.'
      : '';
  const showNameError = submitted && !displayName.trim();
  const showPasswordError = submitted && !passwordValid;
  const showConfirmError = (confirmTouched || submitted) && !!confirmMsg;
  const showTermsError = submitted && !agreed;

  const handleCreateAccount = async () => {
    setSubmitted(true);
    setFormError('');

    // Nothing is sent until every field is right; the red fields show what to fix.
    if (!displayName.trim() || emailMsg || !passwordValid || confirmMsg || !agreed) return;

    setLoading(true);

    // Create the account on our server (this also saves the display name)
    const { data, error } = await api.auth.signUp({
      email: email.trim(),
      password: password,
      displayName: displayName.trim(),
      role,
    });

    setLoading(false);

    if (error) {
      if (error.status === 409) setEmailTaken(true);   // turns the email field red
      else setFormError(error.message);
      return;
    }

    // New accounts must verify their email first, so send them to Log In (which explains what to do).
    if (data?.needsVerification) {
      navigation.reset({
        index: 0,
        routes: [{
          name: 'SignIn',
          params: { verifyEmail: email.trim(), emailSent: !!data.emailSent },
        }],
      });
      return;
    }

    if (!data?.user) {
      setFormError('The account was created, but the user information could not be found.');
      return;
    }

    // Owners and mechanics each land on their own dashboard.
    navigation.reset({
      index: 0,
      routes: [{ name: routeForRole(data.user.role) }],
    });
  };

  const handleGoToLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('SignIn');
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
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

            <View
              style={styles.headerGradientOverlay}
            />

            <View style={styles.headerTextWrap}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoToLogin}
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
                Create Account
              </Text>

              <Text style={styles.subtitle}>
                Start tracking your vehicles and repairs
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>

            {/* Account type: owner or mechanic (admins are never created here) */}
            <Text style={styles.label}>
              I am a
            </Text>

            <View style={styles.roleRow}>
              {[
                { value: 'user', label: 'Vehicle Owner', icon: 'car-outline' },
                { value: 'mechanic', label: 'Mechanic', icon: 'construct-outline' },
              ].map((opt) => {
                const active = role === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.85}
                    onPress={() => setRole(opt.value)}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={active ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.roleHint}>
              {role === 'mechanic'
                ? 'You will see vehicles that owners share with you and can add service records.'
                : 'Track your own vehicles, records and reminders.'}
            </Text>

            {/* Display Name */}
            <Text style={[styles.label, { marginTop: SPACING.lg }]}>
              Name
            </Text>

            <View style={[styles.inputRow, showNameError && styles.inputRowError]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textMuted}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={COLORS.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {showNameError && <Text style={styles.errorText}>Name is required.</Text>}

            {/* Email */}
            <Text
              style={[
                styles.label,
                { marginTop: SPACING.lg },
              ]}
            >
              Email address
            </Text>

            <View style={[styles.inputRow, showEmailError && styles.inputRowError]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textMuted}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setEmailTaken(false);
                }}
                onBlur={() => setEmailTouched(true)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {showEmailError && <Text style={styles.errorText}>{shownEmailMsg}</Text>}

            {/* Password */}
            <Text
              style={[
                styles.label,
                { marginTop: SPACING.lg },
              ]}
            >
              Password
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
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
                hitSlop={{
                  top: 8,
                  bottom: 8,
                  left: 8,
                  right: 8,
                }}
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
                {password ? 'Your password must meet every requirement below.' : 'Password is required.'}
              </Text>
            )}

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              {passwordRequirements.map(
                (requirement) => (
                  <View
                    key={requirement.label}
                    style={styles.requirementRow}
                  >
                    <Ionicons
                      name={
                        requirement.valid
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={17}
                      color={
                        requirement.valid
                          ? COLORS.primary
                          : showPasswordError
                            ? COLORS.danger
                            : COLORS.textMuted
                      }
                    />

                    <Text
                      style={[
                        styles.requirementText,
                        requirement.valid &&
                          styles.requirementTextValid,
                        !requirement.valid &&
                          showPasswordError &&
                          styles.requirementTextError,
                      ]}
                    >
                      {requirement.label}
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* Confirm Password */}
            <Text
              style={[
                styles.label,
                { marginTop: SPACING.lg },
              ]}
            >
              Confirm Password
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
                placeholder="Re-enter your password"
                placeholderTextColor={COLORS.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => setConfirmTouched(true)}
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowConfirmPassword(
                    (value) => !value
                  )
                }
                hitSlop={{
                  top: 8,
                  bottom: 8,
                  left: 8,
                  right: 8,
                }}
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

            {showConfirmError && <Text style={styles.errorText}>{confirmMsg}</Text>}

            {/* Terms and Conditions: must be ticked to sign up */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                onPress={() => setAgreed((v) => !v)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                accessibilityLabel="Agree to the Terms and Conditions"
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked, showTermsError && styles.checkboxError]}>
                  {agreed && <Ionicons name="checkmark" size={15} color={COLORS.textInverse} />}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I have read and agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('Info', { page: 'terms' })}
                >
                  Terms and Conditions
                </Text>
              </Text>
            </View>

            {showTermsError && (
              <Text style={styles.errorText}>
                You must agree to the Terms and Conditions to sign up.
              </Text>
            )}

            {!!formError && (
              <FormMessage type="error" text={formError} style={{ marginTop: SPACING.lg }} />
            )}

            {/* Create Account */}
            <TouchableOpacity
              style={[
                styles.createButton,
                loading &&
                  styles.createButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleCreateAccount}
              disabled={loading}
            >
              <Text
                style={styles.createButtonText}
              >
                {loading
                  ? 'Creating Account...'
                  : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Login */}
            <View style={styles.loginRow}>
              <Text
                style={styles.loginPrefixText}
              >
                Already have an account?{' '}
              </Text>

              <TouchableOpacity
                onPress={handleGoToLogin}
              >
                <Text style={styles.loginText}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
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
    justifyContent: 'flex-end',
    position: 'relative',
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

  headerTextWrap: {
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

  roleRow: {
    flexDirection: 'row',
  },

  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    marginRight: 8,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },

  roleChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },

  roleChipText: {
    marginLeft: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  roleChipTextActive: {
    color: COLORS.primary,
  },

  roleHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.sm,
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

  inputRowError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },

  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },

  requirementsBox: {
    marginTop: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  requirementText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 7,
  },

  requirementTextValid: {
    color: COLORS.primary,
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  checkboxError: {
    borderColor: COLORS.danger,
  },

  requirementTextError: {
    color: COLORS.danger,
  },

  termsText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  termsLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  createButton: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textInverse,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },

  loginPrefixText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },

  loginText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});