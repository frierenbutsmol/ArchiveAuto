import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const C = {
  background: "#141316",
  surface: "#141316",
  surfaceContainerHigh: "#2b292d",
  surfaceContainerHighest: "#363437",
  surfaceVariant: "#363437",
  outline: "#849495",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

const SUGGESTIONS = [
  { id: "s1", icon: "warning", label: "What does this warning light mean?" },
  { id: "s2", icon: "opacity", label: "When is my next oil change?" },
  {
    id: "s3",
    icon: "tire-repair",
    label: "Optimal tire pressure for highway?",
  },
];

function Touchable({
  onPress,
  style,
  children,
  rippleColor,
  borderless = false,
}) {
  if (Platform.OS === "android") {
    const flatStyle = StyleSheet.flatten(style) || {};
    return (
      <View
        style={{ borderRadius: flatStyle.borderRadius, overflow: "hidden" }}
      >
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple(
            rippleColor || "rgba(255,255,255,0.08)",
            borderless,
          )}
        >
          <View style={style}>{children}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity style={style} activeOpacity={0.85} onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
}

export default function AIChat() {
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputFocused, setInputFocused] = useState(false);
  const listRef = useRef(null);

  const pulse = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
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
      ]),
    ).start();
  }, [pulse]);

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text: trimmed },
    ]);
    setMessage("");

    // replace with actual AI API
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "This is a placeholder response — wire this up to your AI backend.",
        },
      ]);
    }, 600);
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.bubble,
        item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          item.role === "user" && styles.bubbleTextUser,
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Top bar with mode pill */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <Text style={styles.brand}>AutoCare</Text>
        <View style={styles.modePill}>
          <Animated.View style={[styles.statusDot, { opacity: pulse }]} />
          <Text style={styles.modeText}>General Mode</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.avatarRing}>
              <MaterialIcons
                name="smart-toy"
                size={36}
                color={C.primaryContainer}
              />
            </View>
            <Text style={styles.emptyTitle}>
              Hi, I'm your AutoCare Assistant
            </Text>
            <Text style={styles.emptySubtitle}>
              I can help you diagnose issues, remember maintenance schedules,
              and understand your vehicle better.
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

        {/* Suggestion chips — only while the conversation is empty */}
        {messages.length === 0 && (
          <View style={styles.chipRow}>
            {SUGGESTIONS.map((s) => (
              <Touchable
                key={s.id}
                style={styles.chip}
                onPress={() => sendMessage(s.label)}
                rippleColor="rgba(0, 242, 255, 0.12)"
              >
                <View style={styles.chipInner}>
                  <MaterialIcons
                    name={s.icon}
                    size={18}
                    color={C.primaryContainer}
                  />
                  <Text style={styles.chipText}>{s.label}</Text>
                </View>
              </Touchable>
            ))}
          </View>
        )}

        {/* Composer */}
        <View style={styles.composerWrapper}>
          <View
            style={[styles.composer, inputFocused && styles.composerFocused]}
          >
            <TextInput
              style={styles.composerInput}
              placeholder="Ask anything about your vehicle..."
              placeholderTextColor="rgba(185, 202, 203, 0.5)"
              value={message}
              onChangeText={setMessage}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => sendMessage(message)}
              multiline
              underlineColorAndroid="transparent"
              selectionColor={C.primaryContainer}
            />
            <Touchable
              style={styles.sendButton}
              onPress={() => sendMessage(message)}
              borderless
              rippleColor="rgba(0,0,0,0.2)"
            >
              <MaterialIcons name="send" size={20} color="#121212" />
            </Touchable>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: APPBAR_SURFACE,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: "#000",
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
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    color: C.onSurface,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  emptySubtitle: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  messageList: {
    padding: 20,
    paddingBottom: 16,
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: C.primaryContainer,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
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
    color: "#002022",
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  chip: {
    borderRadius: 999,
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    color: C.onSurface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  composerWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
});
