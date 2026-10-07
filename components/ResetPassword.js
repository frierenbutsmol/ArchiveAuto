import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  TouchableNativeFeedback,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';

// Gives touchables a real Material ripple on Android; falls back to
// opacity dimming on iOS.
function Touchable({ onPress, style, children, rippleColor, borderless = false, hitSlop, disabled }) {
  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        disabled={disabled}
        background={TouchableNativeFeedback.Ripple(
          rippleColor || 'rgba(255,255,255,0.15)',
          borderless
        )}>
        <View style={style} hitSlop={hitSlop}>
          {children}
        </View>
      </TouchableNativeFeedback>
    );
  }
  return (
    <TouchableOpacity
      style={style}
      activeOpacity={0.85}
      onPress={onPress}
      hitSlop={hitSlop}
      disabled={disabled}>
      {children}
    </TouchableOpacity>
  );
}

export default function ResetPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    setLoading(true);

    const { error } = await api.auth.forgotPassword(email.trim());

    setLoading(false);

    if (error) {
      Alert.alert('Reset Password Failed', error.message);
      return;
    }

    Alert.alert(
      'Reset Link Sent',
      'Please check your email for the password reset link.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('SignIn'),
        },
      ]
    );
  };

  const handleReturnToLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('SignIn');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          {/* Header card */}
          <View style={styles.headerCard}>
            <Image
              source={require('../assets/Vector2.png')}
              resizeMode="cover"
              style={styles.bannerImage}
            />

            <View style={styles.headerGradientOverlay} />

            <View style={styles.headerContent}>
              <Touchable
                style={styles.backButton}
                onPress={handleReturnToLogin}
                borderless
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
              </Touchable>

              <Text style={styles.brandBadge}>ARCHIVEAUTO</Text>

              <Text style={styles.title}>Forgot password</Text>

              <Text style={styles.subtitle}>
                Enter your email to receive a password reset link
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>

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
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.infoText}>
              We'll send a link to your email that will let you create a new password.
            </Text>

            <Touchable
              style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
              onPress={handleSendResetLink}
              disabled={loading}
              rippleColor="rgba(0,0,0,0.15)">
              <Text style={styles.ctaText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </Touchable>

            <View style={styles.footerRow}>
              <Touchable onPress={handleReturnToLogin} style={styles.footerLinkWrap} borderless>
                <Text style={styles.footerLink}>Return to Login</Text>
              </Touchable>
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
    backgroundColor: 'rgba(15, 14, 17, 0.45)',
  },

  headerContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.xxl,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(15, 14, 17, 0.4)',
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

  inputIcon: {
    marginRight: SPACING.sm,
  },

  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },

  infoText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.xs,
  },

  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxxl,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
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

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },

  footerLinkWrap: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  footerLink: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});