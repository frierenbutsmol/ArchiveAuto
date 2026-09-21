import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ACCENT = "#37C2DF";

export default function SignUp() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCreateAccount = () => {
    // hook up to sign-up API call
    console.log("Create account:", { email, password, confirmPassword });
  };

  const handleGoToLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Login");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0E11" />

      {/* Header banner */}
      <ImageBackground
        source={require("../assets/Vector2.png")}
        resizeMode="cover"
        style={styles.headerCard}
        imageStyle={styles.headerImage}
      >
        <View style={styles.headerOverlay}>
          <Text style={styles.title}>Sign up</Text>
          <View style={styles.titleUnderline} />
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
          {/* Email */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="archive_auto@email.com"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View
                style={[styles.inputUnderline, { borderTopColor: ACCENT }]}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Enter your password"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={ACCENT}
                />
              </TouchableOpacity>
            </View>
            <View
              style={[styles.inputUnderline, { borderTopColor: "#FFFFFF" }]}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Confirm your password"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={ACCENT}
                />
              </TouchableOpacity>
            </View>
            <View
              style={[styles.inputUnderline, { borderTopColor: "#FFFFFF" }]}
            />
          </View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={styles.bottomBlock}>
          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.85}
            onPress={handleCreateAccount}
          >
            <Text style={styles.createButtonText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginPrefixText}>
              Already have an Account!{" "}
            </Text>
            <TouchableOpacity onPress={handleGoToLogin}>
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0E11",
  },
  flex: {
    flex: 1,
    justifyContent: "space-between",
  },
  headerCard: {
    height: 220,
    backgroundColor: "#13171C",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  headerImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerOverlay: {
    paddingHorizontal: 38,
    paddingBottom: 24,
    backgroundColor: "rgba(19, 23, 28, 0.55)",
  },
  scrollContent: {
    paddingHorizontal: 38,
    paddingTop: 30,
    paddingBottom: 20,
  },
  title: {
    fontWeight: "500",
    fontSize: 38,
    lineHeight: 42,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  titleUnderline: {
    width: 74,
    height: 0,
    borderTopWidth: 3,
    borderTopColor: ACCENT,
  },
  fieldBlock: {
    width: "100%",
    marginBottom: 25,
  },
  fieldLabel: {
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.2,
    color: "#FFFFFF",
    marginBottom: 12,
  },
  inputWrapper: {
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingBottom: 8,
  },
  input: {
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: "#FFFFFF",
    paddingBottom: 8,
    paddingVertical: 0,
  },
  inputFlex: {
    flex: 1,
    paddingBottom: 0,
    marginRight: 8,
  },
  inputUnderline: {
    width: "100%",
    height: 0,
    borderTopWidth: 1.5,
  },
  bottomBlock: {
    paddingHorizontal: 38,
    paddingBottom: 40,
    paddingTop: 10,
    alignItems: "center",
  },
  createButton: {
    width: "100%",
    height: 50,
    backgroundColor: ACCENT,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  createButtonText: {
    fontWeight: "600",
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: 0.2,
    color: "#F8F8FF",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginPrefixText: {
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: "#FFFFFF",
  },
  loginText: {
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: ACCENT,
  },
});
