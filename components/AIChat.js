import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableNativeFeedback,
  StyleSheet,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';

const SELECTED_VEHICLE_KEY = '@archiveauto_selected_vehicle';

// Real Material ripple on Android; opacity dimming on iOS.
// Caller's style is applied directly to the touchable's child so the
// chip/button shrink-wraps its content; the outer View only clips the ripple.
function Touchable({ onPress, style, children, rippleColor, borderless = false, disabled = false }) {
  if (Platform.OS === 'android') {
    const flatStyle = StyleSheet.flatten(style) || {};
    return (
      <View style={{ borderRadius: flatStyle.borderRadius, overflow: 'hidden' }}>
        <TouchableNativeFeedback
          onPress={onPress}
          disabled={disabled}
          background={TouchableNativeFeedback.Ripple(
            rippleColor || 'rgba(255,255,255,0.08)',
            borderless
          )}
        >
          <View style={style}>{children}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity style={style} activeOpacity={0.85} onPress={onPress} disabled={disabled}>
      {children}
    </TouchableOpacity>
  );
}

export default function AIChat() {
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const [chatMode, setChatMode] = useState('vehicle'); // 'vehicle' | 'general'
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const listRef = useRef(null);

  // Slow pulse on the status dot
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const scrollToEndSoon = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // The server loads the vehicle's records itself; the app only needs to know
  // which vehicle is selected (Home/Garage choice, otherwise the oldest one).
  const getSelectedVehicle = async () => {
    const { data: vehicles, error } = await api.list('vehicles');
    if (error) throw new Error(error.message);
    if (!vehicles || vehicles.length === 0) return null;

    const sorted = [...vehicles].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    const savedVehicle = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY);
    if (savedVehicle) {
      try {
        const parsedVehicle = JSON.parse(savedVehicle);
        const match = sorted.find((v) => v.id === parsedVehicle.id);
        if (match) return match;
      } catch (error) {
        console.log('Failed to read saved vehicle:', error.message);
      }
    }

    return sorted[0];
  };

  const handleSendText = async (textToSend) => {
    const query = (textToSend || message).trim();
    if (!query || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, role: 'user', text: query, mode: chatMode },
    ]);

    if (!textToSend) setMessage('');
    setIsLoading(true);
    scrollToEndSoon();

    try {
      let vehicleId = null;

      if (chatMode === 'vehicle') {
        const vehicle = await getSelectedVehicle();

        if (!vehicle) {
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-no-vehicle`,
              role: 'assistant',
              text: 'You do not have a vehicle added yet. Add a vehicle first so I can answer questions using your vehicle information.',
            },
          ]);
          return; // finally{} resets isLoading
        }

        vehicleId = vehicle.id;
      }

      const { data, error } = await api.chat({
        message: query,
        mode: chatMode,
        vehicleId,
      });

      if (error) {
        console.error('AI chat error:', error);
        throw new Error(
          error.message || 'I could not connect to the AI right now. Please try again.'
        );
      }

      if (!data?.reply) throw new Error('The AI returned an empty response.');

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: 'assistant', text: data.reply },
      ]);
      scrollToEndSoon();
    } catch (error) {
      console.error('AI chat error:', error);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          text:
            error?.message ||
            'Something went wrong while contacting the AI. Please try again.',
        },
      ]);
      scrollToEndSoon();
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () =>
    setChatMode((m) => (m === 'vehicle' ? 'general' : 'vehicle'));

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.bubble,
        item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          item.role === 'user' && styles.bubbleTextUser,
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  const canSend = message.trim().length > 0 && !isLoading;
  const isVehicleMode = chatMode === 'vehicle';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top bar with tappable mode pill */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <Text style={styles.brand}>ArchiveAuto</Text>
        <Touchable
          style={styles.modePill}
          onPress={toggleMode}
          rippleColor="rgba(55, 194, 223, 0.12)"
        >
          <Animated.View style={[styles.statusDot, { opacity: pulse }]} />
          <Text style={styles.modeText}>
            {isVehicleMode ? 'Vehicle Aware' : 'General Q&A'}
          </Text>
          <MaterialIcons name="swap-horiz" size={16} color={COLORS.textMuted} />
        </Touchable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.avatarRing}>
              <MaterialIcons name="smart-toy" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Hi, I'm your ArchiveAuto Assistant</Text>
            <Text style={styles.emptySubtitle}>
              {isVehicleMode
                ? 'I can answer using your vehicle’s maintenance, repair, parts, and document records.'
                : 'I can help with general car care and maintenance questions.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingWrap}>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.loadingBubble]}>
              <Text style={styles.bubbleText}>Thinking...</Text>
            </View>
          </View>
        )}

        {/* Composer */}
        <View style={styles.composerWrapper}>
          <View style={[styles.composer, inputFocused && styles.composerFocused]}>
            <TextInput
              style={styles.composerInput}
              placeholder={
                isVehicleMode
                  ? 'Ask about your vehicle maintenance, parts, or repairs...'
                  : 'Ask any car care or maintenance question...'
              }
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => handleSendText()}
              multiline
              editable={!isLoading}
              underlineColorAndroid="transparent"
              selectionColor={COLORS.primary}
            />
            <View style={!canSend && styles.sendDisabled}>
              <Touchable
                style={styles.sendButton}
                onPress={() => handleSendText()}
                disabled={!canSend}
                borderless
                rippleColor="rgba(0,0,0,0.2)"
              >
                <MaterialIcons name="send" size={20} color={COLORS.textInverse} />
              </Touchable>
            </View>
          </View>
        </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surfaceElevated,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  brand: {
    color: COLORS.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  modeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  messageList: {
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: RADII.md,
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.sm + 2,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  bubbleText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  bubbleTextUser: {
    color: COLORS.textInverse,
  },
  loadingWrap: {
    paddingHorizontal: SPACING.xl,
  },
  loadingBubble: {
    marginBottom: SPACING.sm,
  },
  chipRow: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  chip: {
    borderRadius: RADII.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  composerWrapper: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  composerFocused: {
    borderBottomColor: COLORS.primary,
  },
  composerInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    maxHeight: 100,
    paddingVertical: SPACING.xs + 2,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.35,
  },
});