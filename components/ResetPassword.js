import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  background: "#141316",
  surface: "#141316",
  surfaceContainerHigh: "#2b292d",
  outline: "#849495",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
  card: "#13171C",
};

function Touchable({
  onPress,
  style,
  children,
  rippleColor,
  borderless = false,
  hitSlop,
}) {
  if (Platform.OS === "android") {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        background={TouchableNativeFeedback.Ripple(
          rippleColor || "rgba(255,255,255,0.15)",
          borderless,
        )}
      >
        <View style={style} hitSlop={hitSlop}>
          {children}
        </View>
      </TouchableNativeFeedback>
    );
  }
  return (
    <TouchableOpacity
      style={style}
      activeOpacity={0.75}
      onPress={onPress}
      hitSlop={hitSlop}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function ResetPassword() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSendLink = () => {
    // TODO: hook up to your password-reset API call
    console.log("Reset link requested for:", email);
  };

  const handleReturnToLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("SignIn");
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header banner */}
      <ImageBackground
        source={require("../assets/Vector2.png")}
        resizeMode="cover"
        style={styles.headerCard}
        imageStyle={styles.headerImage}
      >
        {/* Top bar sits on top of the banner */}
        <View style={styles.topBar}>
          <Touchable
            onPress={handleReturnToLogin}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backButton}
            borderless
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={C.onSurfaceVariant}
            />
          </Touchable>
          <Text style={styles.brand}>ArchiveAuto</Text>
        </View>

        <View style={styles.headerOverlay}>
          <Text style={styles.title}>Reset Password</Text>
        </View>
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text style={styles.description}>
              Enter your email address and we'll send you a link to reset your
              password.
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={[
                  styles.input,
                  focused ? styles.inputFocused : styles.inputBlurred,
                ]}
                placeholder="driver@example.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            <Touchable
              onPress={handleSendLink}
              style={styles.submitButton}
              rippleColor="rgba(0,0,0,0.15)"
            >
              <Text style={styles.submitButtonText}>SEND RESET LINK</Text>
            </Touchable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Touchable
            onPress={handleReturnToLogin}
            style={styles.footerLinkWrap}
            borderless
          >
            <Text style={styles.footerLink}>Return to Login</Text>
          </Touchable>
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
  headerCard: {
    height: 220,
    backgroundColor: C.card,
    justifyContent: "space-between",
    overflow: "hidden",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
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
  headerOverlay: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: "rgba(19, 23, 28, 0.55)",
  },
  title: {
    color: C.onSurface,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  scrollContent: {
    paddingBottom: 24,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  description: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  fieldBlock: {
    marginBottom: 32,
  },
  fieldLabel: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    color: C.onSurface,
    fontSize: 18,
    lineHeight: 28,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputBlurred: {
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
  },
  inputFocused: {
    borderBottomWidth: 2,
    borderBottomColor: C.primaryContainer,
  },
  submitButton: {
    backgroundColor: C.primaryContainer,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: C.primaryContainer,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  submitButtonText: {
    color: "#121212",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerLinkWrap: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  footerLink: {
    color: C.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});
