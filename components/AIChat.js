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
import { supabase } from '../lib/supabase';

const SELECTED_VEHICLE_KEY = '@archiveauto_selected_vehicle';

// Palette from the AutoCare design tokens
const C = {
  background: '#141316',
  surface: '#141316',
  surfaceContainerHigh: '#2b292d',
  surfaceContainerHighest: '#363437',
  surfaceVariant: '#363437',
  outline: '#849495',
  outlineVariant: '#3a494b',
  primaryContainer: '#00f2ff',
  onSurface: '#e6e1e5',
  onSurfaceVariant: '#b9cacb',
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

const EMPTY_VEHICLE_DATA = {
  vehicle: null,
  maintenance: [],
  repairs: [],
  parts: [],
  documents: [],
};

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

  const getVehicleData = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('You are not signed in.');

      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (vehicleError) throw vehicleError;
      if (!vehicles || vehicles.length === 0) return EMPTY_VEHICLE_DATA;

      // Vehicle selected on Home/Garage
      const savedVehicle = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY);
      let selectedVehicle = null;

      if (savedVehicle) {
        try {
          const parsedVehicle = JSON.parse(savedVehicle);
          selectedVehicle = vehicles.find((v) => v.id === parsedVehicle.id);
        } catch (error) {
          console.log('Failed to read saved vehicle:', error.message);
        }
      }

      if (!selectedVehicle) selectedVehicle = vehicles[0];

      const vehicleId = selectedVehicle.id;

      const { data: maintenance, error: maintenanceError } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('service_date', { ascending: false });
      if (maintenanceError) throw maintenanceError;

      const { data: repairs, error: repairsError } = await supabase
        .from('repairs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('repair_date', { ascending: false });
      if (repairsError) throw repairsError;

      const { data: parts, error: partsError } = await supabase
        .from('parts_replacements')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('replacement_date', { ascending: false });
      if (partsError) throw partsError;

      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });
      if (documentsError) throw documentsError;

      return {
        vehicle: selectedVehicle,
        maintenance: maintenance || [],
        repairs: repairs || [],
        parts: parts || [],
        documents: documents || [],
      };
    } catch (error) {
      console.error('Error loading vehicle data:', error);
      throw error;
    }
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
      let vehicleData = EMPTY_VEHICLE_DATA;

      if (chatMode === 'vehicle') {
        vehicleData = await getVehicleData();

        if (!vehicleData.vehicle) {
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
      }

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: query,
          mode: chatMode,
          vehicle: vehicleData.vehicle,
          maintenance: vehicleData.maintenance,
          repairs: vehicleData.repairs,
          parts: vehicleData.parts,
          documents: vehicleData.documents,
        },
      });

      if (error) {
        console.error('AI Function Error:', error);

        let errorMessage =
          'I could not connect to the AI right now. Please try again.';

        try {
          if (error.context) {
            const errorBody = await error.context.json();
            if (errorBody?.error) errorMessage = errorBody.error;
          }
        } catch (parseError) {
          console.log('Could not read function error:', parseError);
        }

        throw new Error(errorMessage);
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
          rippleColor="rgba(0, 242, 255, 0.12)"
        >
          <Animated.View style={[styles.statusDot, { opacity: pulse }]} />
          <Text style={styles.modeText}>
            {isVehicleMode ? 'Vehicle Aware' : 'General Q&A'}
          </Text>
          <MaterialIcons name="swap-horiz" size={16} color={C.onSurfaceVariant} />
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
              <MaterialIcons name="smart-toy" size={36} color={C.primaryContainer} />
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
              placeholderTextColor="rgba(185, 202, 203, 0.5)"
              value={message}
              onChangeText={setMessage}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => handleSendText()}
              multiline
              editable={!isLoading}
              underlineColorAndroid="transparent"
              selectionColor={C.primaryContainer}
            />
            <View style={!canSend && styles.sendDisabled}>
              <Touchable
                style={styles.sendButton}
                onPress={() => handleSendText()}
                disabled={!canSend}
                borderless
                rippleColor="rgba(0,0,0,0.2)"
              >
                <MaterialIcons name="send" size={20} color="#121212" />
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
    backgroundColor: C.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: APPBAR_SURFACE,
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
    color: C.primaryContainer,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: C.surfaceVariant,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primaryContainer,
  },
  modeText: {
    color: C.onSurface,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: C.onSurface,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  emptySubtitle: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  messageList: {
    padding: 20,
    paddingBottom: 16,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: C.primaryContainer,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  bubbleText: {
    color: C.onSurface,
    fontSize: 16,
    lineHeight: 24,
  },
  bubbleTextUser: {
    color: '#002022',
  },
  loadingWrap: {
    paddingHorizontal: 20,
  },
  loadingBubble: {
    marginBottom: 8,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  chip: {
    borderRadius: 999,
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    color: C.onSurface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  composerWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerHigh,
    borderBottomWidth: 2,
    borderBottomColor: C.outline,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 56,
  },
  composerFocused: {
    borderBottomColor: C.primaryContainer,
  },
  composerInput: {
    flex: 1,
    color: C.onSurface,
    fontSize: 16,
    lineHeight: 24,
    maxHeight: 100,
    paddingVertical: 6,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.35,
  },
});