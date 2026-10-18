import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';
import { routeForRole } from '../lib/roles';
import { emailError } from '../lib/validators';
import FormMessage from './FormMessage';

export default function SignIn({ navigation, route }) {
  const [email, setEmail] = useState(route?.params?.verifyEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Problems from the server show inside the form (no pop-ups): wrong password,
  // unverified email, no connection.
  const [formError, setFormError] = useState('');
  const [credentialsWrong, setCredentialsWrong] = useState(false);

  // Too many failed logins: the server pauses logins and says for how long. Count it down here.
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) setLockedUntil(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);
  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const locked = lockedUntil > 0 && secondsLeft > 0;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const verifyParam = route?.params?.verifyEmail;
  const mailFailed = route?.params?.emailSent === false;
  const [notice, setNotice] = useState(
    verifyParam
      ? mailFailed
        ? {
            type: 'error',
            canResend: true,
            text: `Your account was created, but we could not send the email to ${verifyParam}. Tap "Resend email" to try again.`,
          }
        : {
            type: 'success',
            canResend: false,
            text: `We sent a verification link to ${verifyParam}. It expires in 30 minutes, so open it soon (check your spam folder too), then log in.`,
          }
      : null
  );

  // Errors appear after the field is left (or after the first tap on LogIn),
  // then update live while the user keeps typing.
  const emailMsg = emailError(email);
  const showEmailError = (emailTouched || submitted) && !!emailMsg;
  const showPasswordError = submitted && !password;

  const handleSignIn = async () => {
    if (locked) return;
    setSubmitted(true);
    setFormError('');
    setCredentialsWrong(false);
    setNotice(null);
    if (emailMsg || !password) return;   // inline messages explain what is wrong

    setLoading(true);

    const { data, error } = await api.auth.signIn({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      if (error.code === 'email_not_verified') {
        setNotice({ type: 'info', canResend: true, text: error.message });
        return;
      }
      if (error.code === 'login_locked') {
        setLockedUntil(Date.now() + (error.retryAfter || 300) * 1000);
        setNow(Date.now());
        return;
      }
      if (error.status === 401) setCredentialsWrong(true);   // both fields turn red
      setFormError(error.message);
      return;
    }

    // Each role lands on its own dashboard.
    navigation.reset({
      index: 0,
      routes: [{ name: routeForRole(data?.user?.role) }],
    });
  };

  const resendVerification = async () => {
    const r = await api.auth.resendVerification(email.trim());
    setNotice(
      r.error
        ? { type: 'error', canResend: true, text: r.error.message }
        : { type: 'success', canResend: false, text: 'Email sent. Check your inbox (and spam folder) for the new link.' }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          {/* Curved Header card with topo banner */}
          <View style={styles.headerCard}>
            <Image
              source={require('../assets/Vector2.png')}
              resizeMode="cover"
              style={styles.bannerImage}
            />
            <View style={styles.headerGradientOverlay} />
            <View style={styles.headerTextWrap}>
              
              <Text style={styles.title}>LogIn</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>
            <View style={[styles.inputRow, (showEmailError || credentialsWrong) && styles.inputRowError]}>
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
                  setFormError('');
                  setCredentialsWrong(false);
                }}
                onBlur={() => setEmailTouched(true)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
            {showEmailError && <Text style={styles.errorText}>{emailMsg}</Text>}

            <Text style={[styles.label, { marginTop: SPACING.lg }]}>
              Password
            </Text>

            <View style={[styles.inputRow, (showPasswordError || credentialsWrong) && styles.inputRowError]}>
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
                onChangeText={(v) => {
                  setPassword(v);
                  setFormError('');
                  setCredentialsWrong(false);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />

              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {showPasswordError && <Text style={styles.errorText}>Password is required.</Text>}
            {locked && (
              <FormMessage
                type="error"
                text={`Too many failed attempts. Logging in is paused. Try again in ${countdown}.`}
                style={{ marginTop: SPACING.md }}
              />
            )}
            {!locked && !!formError && (
              <FormMessage type="error" text={formError} style={{ marginTop: SPACING.md }} />
            )}
            {notice && (
              <FormMessage
                type={notice.type}
                text={notice.text}
                actionLabel={notice.canResend ? 'Resend email' : undefined}
                onAction={notice.canResend ? resendVerification : undefined}
                style={{ marginTop: SPACING.md }}
              />
            )}

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeWrap}
                onPress={() => setRememberMe((v) => !v)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}>
                  {rememberMe && (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={COLORS.textInverse}
                    />
                  )}
                </View>

                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ResetPassword')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.ctaButton,
                (loading || locked) && { opacity: locked ? 0.4 : 0.6 },
              ]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={loading || locked}>
              <Text style={styles.ctaText}>
                {locked ? `Try again in ${countdown}` : loading ? 'Logging In...' : 'LogIn'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                Don&apos;t have an account?{' '}
              </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>SignUp</Text>
              </TouchableOpacity>
            </View>
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
  keyboardView: {
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
    height: 200,
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
    backgroundColor: 'rgba(15, 14, 17, 0.45)',
  },
  headerTextWrap: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.xl,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  form: {
    flex: 1,
    paddingHorizontal: SPACING.screenPadding,
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
    backgroundColor: COLORS.surfaceElevated,
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
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  rememberMeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rememberMeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxxl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});