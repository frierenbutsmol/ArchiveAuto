import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  background: "#0F0E11",
  card: "#13171C",
  accent: "#37C2DF",
  textPrimary: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.4)",
  inputBorder: "rgba(255,255,255,0.15)",
  inputBackground: "#1A1E24",
};

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSignIn = () => {
    // wire up to auth logic
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header banner */}
      <ImageBackground
        source={require("../assets/Vector2.png")}
        resizeMode="cover"
        style={styles.headerCard}
        imageStyle={styles.headerImage}
      >
        <View style={styles.headerOverlay}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>
      </ImageBackground>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Email address</Text>
        <View style={styles.inputRow}>
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

        <Text style={[styles.label, { marginTop: 20 }]}>Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberMeWrap}
            onPress={() => setRememberMe((v) => !v)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={13} color="#0F0E11" />
              )}
            </View>
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("ResetPassword")}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleSignIn}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an Account ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Home indicator */}
      <View style={styles.homeIndicator} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    height: 220,
    backgroundColor: COLORS.card,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  headerImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerOverlay: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: "rgba(19, 23, 28, 0.55)",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  rememberMeWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  rememberMeText: {
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  forgotText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  ctaText: {
    color: "#0F0E11",
    fontSize: 16,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  footerLink: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  homeIndicator: {
    alignSelf: "center",
    width: 134,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.textPrimary,
    marginBottom: 8,
  },
});
