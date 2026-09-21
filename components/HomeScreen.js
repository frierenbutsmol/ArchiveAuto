import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";

const BACKGROUND = "#0F0E11";
const APPBAR_SURFACE = "#1A191D";
const CARD_BG = "#1c1c1e";
const ACCENT = "#37C2DF";
const BORDER = "rgba(255,255,255,0.15)";
const TEXT_MUTED = "rgba(255,255,255,0.5)";
const SUCCESS = "#4CD964";

const STATUS_BAR_PAD =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

const primaryVehicle = {
  label: "Daily Drive",
  brand: "Toyota",
  model: "Hiace",
  year: "2020",
};

const managementItems = [
  {
    id: "maintenance",
    icon: "time-outline",
    title: "Maintenance",
    subtitle: "12 Service Records",
  },
  {
    id: "repairLog",
    icon: "build-outline",
    title: "Repair Log",
    subtitle: "3 Repairs Logged",
  },
  {
    id: "partsReplaced",
    icon: "swap-horizontal-outline",
    title: "Parts Replaced",
    subtitle: "OEM & Aftermarket",
  },
  {
    id: "documents",
    icon: "document-text-outline",
    title: "Documents",
    subtitle: "Reg, Insurance, Title",
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
    return (
      <View style={[style, { overflow: "hidden" }]}>
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple(
            rippleColor || "rgba(255,255,255,0.08)",
            borderless,
          )}
        >
          <View style={styles.rippleFill}>{children}</View>
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

export default function HomeScreen({ navigation }) {
  const handlePlaceholder = (id) => {
    console.log("Pressed:", id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Ionicons name="construct" size={20} color={ACCENT} />
          <Text style={styles.topBarTitle}>Home</Text>
        </View>
        <Touchable
          style={styles.avatarCircle}
          borderless
          rippleColor="rgba(0,0,0,0.2)"
        >
          <Ionicons name="person" size={16} color="#0F0E11" />
        </Touchable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroLabel}>My Garage</Text>
          <Text style={styles.heroTitle}>
            {primaryVehicle.year} {primaryVehicle.brand} {primaryVehicle.model}
          </Text>
        </View>

        {/* Stat cards */}
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeaderRow}>
              <Ionicons name="speedometer-outline" size={18} color={ACCENT} />
              <Text style={styles.statLabel}>Current Mileage</Text>
            </View>
            <View>
              <Text style={styles.statValue}>
                24,500<Text style={styles.statUnit}> mi</Text>
              </Text>
              <Text style={styles.statSubAccent}>Updated 2 days ago</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeaderRowBetween}>
              <View style={styles.statHeaderRow}>
                <MaterialCommunityIcons
                  name="gas-station-outline"
                  size={18}
                  color={TEXT_MUTED}
                />
                <Text style={styles.statLabel}>Diesel</Text>
              </View>
              <Ionicons
                name="trending-down-outline"
                size={16}
                color={SUCCESS}
              />
            </View>
            <View>
              <Text style={styles.statValue}>
                ₱58<Text style={styles.statUnit}> /gal</Text>
              </Text>
              <Text style={[styles.statSubAccent, { color: SUCCESS }]}>
                −₱3 this week
              </Text>
            </View>
          </View>
        </View>

        {/* Reminder card */}
        <Touchable
          style={styles.reminderCard}
          onPress={() => handlePlaceholder("reminder")}
          rippleColor="rgba(255,255,255,0.06)"
        >
          <View style={styles.reminderInner}>
            <View style={styles.reminderLeft}>
              <View style={styles.reminderIconWrapper}>
                <Ionicons name="construct-outline" size={20} color={ACCENT} />
              </View>
              <View style={styles.reminderTextBlock}>
                <View style={styles.reminderTagRow}>
                  <Text style={styles.reminderTag}>Upcoming Reminder</Text>
                  <View style={styles.reminderPill}>
                    <Text style={styles.reminderPillText}>In 500 mi</Text>
                  </View>
                </View>
                <Text style={styles.reminderTitle}>Oil Change & Filter</Text>
                <Text style={styles.reminderSubtitle}>
                  Estimated due by Oct 28
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </View>
        </Touchable>

        {/* Quick actions */}
        <View style={styles.quickActionsRow}>
          <Touchable
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("AddRepair")}
            rippleColor="rgba(255,255,255,0.06)"
          >
            <View style={styles.quickActionInner}>
              <View style={styles.quickActionIconWrapper}>
                <Ionicons name="hammer-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Add Repair</Text>
            </View>
          </Touchable>

          <Touchable
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("AddMaintenance")}
            rippleColor="rgba(255,255,255,0.06)"
          >
            <View style={styles.quickActionInner}>
              <View style={styles.quickActionIconWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Add Maint.</Text>
            </View>
          </Touchable>
        </View>

        {/* Vehicle management */}
        <View style={styles.managementSection}>
          <Text style={styles.sectionHeading}>Vehicle Management</Text>

          <View style={styles.managementGrid}>
            {managementItems.map((item) => (
              <Touchable
                key={item.id}
                style={styles.managementCard}
                rippleColor="rgba(255,255,255,0.06)"
                onPress={() => {
                  if (item.id === "documents") {
                    navigation.navigate("Documents");
                  } else if (item.id === "maintenance") {
                    navigation.navigate("MaintenanceHistory");
                  } else if (item.id === "repairLog") {
                    navigation.navigate("RepairLog");
                  } else if (item.id === "partsReplaced") {
                    navigation.navigate("PartsReplaced");
                  } else {
                    handlePlaceholder(item.id);
                  }
                }}
              >
                <View style={styles.managementInner}>
                  <View style={styles.managementIconWrapper}>
                    <Ionicons name={item.icon} size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.managementTitle}>{item.title}</Text>
                  <Text style={styles.managementSubtitle}>{item.subtitle}</Text>
                </View>
              </Touchable>
            ))}
          </View>

          <Touchable
            style={styles.listRow}
            onPress={() => handlePlaceholder("vehicleInfo")}
            rippleColor="rgba(255,255,255,0.06)"
          >
            <View style={styles.listRowInner}>
              <View style={styles.listRowLeft}>
                <View style={styles.managementIconWrapper}>
                  <Ionicons name="car-outline" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.listRowTitle}>Vehicle Info & Specs</Text>
                  <Text style={styles.listRowSubtitle}>
                    Engine, Drivetrain, Dimensions
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
            </View>
          </Touchable>

          <Touchable
            style={styles.listRow}
            onPress={() => handlePlaceholder("historyReport")}
            rippleColor="rgba(255,255,255,0.06)"
          >
            <View style={styles.listRowInner}>
              <View style={styles.listRowLeft}>
                <View style={styles.managementIconWrapper}>
                  <Ionicons
                    name="document-attach-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                </View>
                <View>
                  <Text style={styles.listRowTitle}>
                    Vehicle History Report
                  </Text>
                  <Text style={styles.listRowSubtitle}>
                    Carfax / AutoCheck Sync
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
            </View>
          </Touchable>
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
  rippleFill: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64 + STATUS_BAR_PAD,
    paddingTop: STATUS_BAR_PAD,
    paddingHorizontal: 16,
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
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.15,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  heroBlock: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  heroLabel: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  statGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    justifyContent: "space-between",
    ...Platform.select({ android: { elevation: 1 } }),
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statHeaderRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  statUnit: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
  statSubAccent: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  reminderCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  reminderInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    padding: 14,
  },
  reminderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  reminderIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(55, 194, 223, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reminderTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  reminderTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  reminderTag: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  reminderPill: {
    backgroundColor: "rgba(55, 194, 223, 0.1)",
    borderColor: "rgba(55, 194, 223, 0.25)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reminderPillText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: "600",
  },
  reminderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  reminderSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  quickActionInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2a2a2d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  managementSection: {
    gap: 12,
  },
  sectionHeading: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  managementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  managementCard: {
    width: "48%",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  managementInner: {
    padding: 14,
  },
  managementIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2a2a2d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  managementTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  managementSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  listRow: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  listRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  listRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  listRowTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  listRowSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
});
