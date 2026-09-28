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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function SignUp() {
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

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

  const handleCreateAccount = async () => {
    // Check display name
    if (!displayName.trim()) {
      Alert.alert(
        'Missing Name',
        'Please enter your display name.'
      );
      return;
    }

    // Check email
    if (!email.trim()) {
      Alert.alert(
        'Missing Email',
        'Please enter your email address.'
      );
      return;
    }

    // Check password
    if (!password) {
      Alert.alert(
        'Missing Password',
        'Please enter a password.'
      );
      return;
    }

    // Check password requirements
    if (password.length < 8) {
      Alert.alert(
        'Invalid Password',
        'Your password must be at least 8 characters long.'
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      Alert.alert(
        'Invalid Password',
        'Your password must contain at least one lowercase letter.'
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      Alert.alert(
        'Invalid Password',
        'Your password must contain at least one uppercase letter.'
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      Alert.alert(
        'Invalid Password',
        'Your password must contain at least one number.'
      );
      return;
    }

    // Check matching passwords
    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please make sure both passwords are the same.'
      );
      return;
    }

    setLoading(true);

    // Create Supabase account
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign Up Failed', error.message);
      return;
    }

    // Make sure we have a user ID
    if (!data.user) {
      setLoading(false);
      Alert.alert(
        'Sign Up Failed',
        'The account was created, but the user information could not be found.'
      );
      return;
    }

    // Save display name in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        display_name: displayName.trim(),
      });

    if (profileError) {
      setLoading(false);

      Alert.alert(
        'Profile Setup Failed',
        profileError.message
      );

      return;
    }

    setLoading(false);

    // If email confirmation is required
    if (data.session === null) {
      Alert.alert(
        'Account Created',
        'Your account has been created. Please check your email to confirm your account.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SignIn'),
          },
        ]
      );

      return;
    }

    // If email confirmation is not required
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
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
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
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
                AUTOCARE
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

            {/* Display Name */}
            <Text style={styles.label}>
              Name
            </Text>

            <View style={styles.inputRow}>
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

            {/* Email */}
            <Text
              style={[
                styles.label,
                { marginTop: SPACING.lg },
              ]}
            >
              Email address
            </Text>

            <View style={styles.inputRow}>
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
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <Text
              style={[
                styles.label,
                { marginTop: SPACING.lg },
              ]}
            >
              Password
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
                          : COLORS.textMuted
                      }
                    />

                    <Text
                      style={[
                        styles.requirementText,
                        requirement.valid &&
                          styles.requirementTextValid,
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

            <View style={styles.inputRow}>
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

  createButton: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxxl,
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