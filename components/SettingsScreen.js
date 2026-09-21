import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BACKGROUND = "#0F0E11";
const CARD_BG = "#1c1c1e";
const ACCENT = "#37C2DF";
const BORDER = "rgba(255,255,255,0.1)";
const TEXT_MUTED = "rgba(255,255,255,0.5)";
const DANGER = "#FF6B6B";

const accountItems = [
  { id: "personal", icon: "person-outline", label: "Personal Information" },
  { id: "security", icon: "lock-closed-outline", label: "Security & Password" },
  { id: "payment", icon: "card-outline", label: "Payment Methods" },
];

const aboutItems = [
  { id: "terms", label: "Terms of Service" },
  { id: "privacy", label: "Privacy Policy" },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailSummaries, setEmailSummaries] = useState(false);

  const handlePlaceholder = (id) => {
    console.log("Pressed:", id);
  };

  const handleSignOut = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "SignIn" }],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={BACKGROUND} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>ArchiveAuto</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageHeading}>Settings</Text>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            {accountItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.row,
                  index < accountItems.length - 1 && styles.rowDivider,
                ]}
                activeOpacity={0.7}
                onPress={() => handlePlaceholder(item.id)}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name={item.icon} size={20} color={TEXT_MUTED} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <View style={[styles.toggleRow, styles.rowDivider]}>
              <View style={styles.toggleTextBlock}>
                <Text style={styles.rowLabel}>Push Notifications</Text>
                <Text style={styles.rowSubtitle}>
                  Receive alerts on your device
                </Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{
                  false: "#3a3a3d",
                  true: "rgba(55, 194, 223, 0.5)",
                }}
                thumbColor={pushNotifications ? ACCENT : "#f4f3f4"}
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextBlock}>
                <Text style={styles.rowLabel}>Email Summaries</Text>
                <Text style={styles.rowSubtitle}>
                  Weekly vehicle health reports
                </Text>
              </View>
              <Switch
                value={emailSummaries}
                onValueChange={setEmailSummaries}
                trackColor={{
                  false: "#3a3a3d",
                  true: "rgba(55, 194, 223, 0.5)",
                }}
                thumbColor={emailSummaries ? ACCENT : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowDivider]}
              activeOpacity={0.7}
              onPress={() => handlePlaceholder("units")}
            >
              <View>
                <Text style={styles.rowLabel}>Units</Text>
                <Text style={styles.rowSubtitle}>Miles / Gallons</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowDivider]}
              activeOpacity={0.7}
              onPress={() => handlePlaceholder("language")}
            >
              <View>
                <Text style={styles.rowLabel}>Language</Text>
                <Text style={styles.rowSubtitle}>English (US)</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => handlePlaceholder("dataExport")}
            >
              <View>
                <Text style={styles.rowLabel}>Data Export</Text>
                <Text style={styles.rowSubtitle}>
                  Download your vehicle history
                </Text>
              </View>
              <Ionicons name="download-outline" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.card}>
            {aboutItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, styles.rowDivider]}
                activeOpacity={0.7}
                onPress={() => handlePlaceholder(item.id)}
              >
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Ionicons name="open-outline" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            ))}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>App Version</Text>
              <Text style={styles.versionText}>v2.4.1 (Build 842)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            activeOpacity={0.8}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  topBarTitle: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  pageHeading: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rowLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  rowSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toggleTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  versionText: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  signOutButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.5)",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: {
    color: DANGER,
    fontSize: 15,
    fontWeight: "600",
  },
});
