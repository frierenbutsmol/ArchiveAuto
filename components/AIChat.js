import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableNativeFeedback,
  StyleSheet,
  StatusBar,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';

const SELECTED_VEHICLE_KEY = '@archiveauto_selected_vehicle';

// How many earlier messages are sent along so follow-up questions make sense.
const HISTORY_TURNS = 10;

// Example questions on the empty screen (tap to send).
const STARTERS = {
  vehicle: [
    'What maintenance is due?',
    'When was my last oil change?',
    'How much have I spent on repairs?',
    'Do any of my documents expire soon?',
  ],
  general: [
    'How often should I change engine oil?',
    'How can I improve my fuel economy?',
    'What does a check engine light mean?',
    'How do I check my tire pressure?',
  ],
};

// The earlier turns of THIS conversation: same mode and, in vehicle mode, the same vehicle.
// Error and "no vehicle" notices are not part of the conversation.
const buildHistory = (list, mode, vehicleId) =>
  list
    .filter((m) => !m.isError && m.mode === mode && (m.vehicleId ?? null) === (vehicleId ?? null))
    .slice(-HISTORY_TURNS)
    .map((m) => ({ role: m.role, text: m.text }));

const vehicleName = (v) =>
  [v.year, v.make, v.series].filter(Boolean).join(' ') || v.nickname || 'your vehicle';

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
  const [activeVehicle, setActiveVehicle] = useState(undefined); // undefined = loading, null = none added
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

  // Show which vehicle the assistant is answering about, and refresh it when the user comes back
  // to this tab (the vehicle can be changed from Home or Garage).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getSelectedVehicle()
        .then((v) => { if (alive) setActiveVehicle(v); })
        .catch(() => {});
      return () => { alive = false; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleSendText = async (textToSend) => {
    const query = (textToSend || message).trim();
    if (!query || isLoading) return;

    const prior = messages;   // everything said before this question
    const userMsgId = `${Date.now()}-user`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text: query, mode: chatMode },
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
              isError: true,
              text: 'You do not have a vehicle added yet. Add a vehicle first so I can answer questions using your vehicle information.',
            },
          ]);
          return; // finally{} resets isLoading
        }

        vehicleId = vehicle.id;
        setActiveVehicle(vehicle);
        // remember which vehicle this question was about
        setMessages((prev) => prev.map((m) => (m.id === userMsgId ? { ...m, vehicleId } : m)));
      }

      const { data, error } = await api.chat({
        message: query,
        mode: chatMode,
        vehicleId,
        history: buildHistory(prior, chatMode, vehicleId),
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
        { id: `${Date.now()}-assistant`, role: 'assistant', text: data.reply, mode: chatMode, vehicleId },
      ]);
      scrollToEndSoon();
    } catch (error) {
      console.error('AI chat error:', error);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          isError: true,
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

  // "Answering about: 2018 Toyota Vios" so the user knows which vehicle the answers are for.
  const vehicleLabel =
    activeVehicle === undefined
      ? ''
      : activeVehicle
        ? `Answering about: ${vehicleName(activeVehicle)}${activeVehicle.nickname ? ` (\u201c${activeVehicle.nickname}\u201d)` : ''}`
        : 'No vehicle added yet';

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

      {isVehicleMode && vehicleLabel ? (
        <Text style={styles.vehicleLine} numberOfLines={1}>
          {vehicleLabel}
        </Text>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.emptyState}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarRing}>
              <MaterialIcons name="smart-toy" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Hi, I'm your ArchiveAuto Assistant</Text>
            <Text style={styles.emptySubtitle}>
              {isVehicleMode
                ? 'I can answer using your vehicle’s maintenance, repair, and document records.'
                : 'I can help with general car care and maintenance questions.'}
            </Text>
            <View style={styles.starterWrap}>
              {(isVehicleMode ? STARTERS.vehicle : STARTERS.general).map((q) => (
                <Touchable
                  key={q}
                  style={styles.chip}
                  onPress={() => handleSendText(q)}
                  rippleColor="rgba(55, 194, 223, 0.12)"
                >
                  <View style={styles.chipInner}>
                    <Text style={styles.chipText}>{q}</Text>
                  </View>
                </Touchable>
              ))}
            </View>
          </ScrollView>
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
                  ? 'Ask about your vehicle maintenance, repairs, or documents...'
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
  // Content is centered when there is room and scrolls when there is not (small phones,
  // large font sizes, keyboard open), instead of overflowing onto the header and composer.
  emptyState: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.xl,
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
  vehicleLine: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  starterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
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