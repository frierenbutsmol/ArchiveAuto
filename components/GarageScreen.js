import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const BACKGROUND = "#0F0E11";
const APPBAR_SURFACE = "#1A191D";
const CARD_BG = "#1c1c1e";
const ACCENT = "#37C2DF";
const BORDER = "rgba(255,255,255,0.15)";
const TEXT_MUTED = "rgba(255,255,255,0.5)";

const vehicles = [
  {
    id: "1",
    type: "car",
    name: "Daily Drive",
    brand: "Toyota",
    model: "Vios",
    year: "2022",
    status: "Primary",
  },
  {
    id: "2",
    type: "motorcycle",
    name: "Work Motor",
    brand: "Yamaha",
    model: "Mio Sporty",
    year: "2018",
    status: "Active",
  },
  {
    id: "3",
    type: "van",
    name: "Family Van",
    brand: "Toyota",
    model: "Hiace",
    year: "2020",
    status: "Active",
  },
  {
    id: "4",
    type: "truck",
    name: "Dad's Truck",
    brand: "Ford",
    model: "Ranger",
    year: "2017",
    status: "Active",
  },
];

const TYPE_ICONS = {
  car: "car",
  motorcycle: "motorbike",
  van: "van-passenger",
  truck: "truck",
};

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

export default function GarageScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Top bar */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.brandIcon}>
            <Ionicons name="car" size={18} color={ACCENT} />
          </View>
          <View>
            <Text style={styles.brandLabel}>ArchiveAuto</Text>
            <Text style={styles.topBarTitle}>Garage</Text>
          </View>
        </View>
        <Touchable
          style={styles.avatarButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <Ionicons name="person" size={17} color="#FFFFFF" />
        </Touchable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Count row */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>Vehicles ({vehicles.length})</Text>
          <Text style={styles.statusAllText}>All Active</Text>
        </View>

        {/* Vehicle list */}
        {vehicles.map((vehicle) => (
          <Touchable
            key={vehicle.id}
            style={styles.card}
            onPress={() => navigation.navigate("VehicleDetails", { vehicle })}
            rippleColor="rgba(255,255,255,0.06)"
          >
            <View style={styles.cardInner}>
              <View style={styles.cardLeft}>
                <View style={styles.cardIconWrapper}>
                  <MaterialCommunityIcons
                    name={TYPE_ICONS[vehicle.type]}
                    size={22}
                    color={ACCENT}
                  />
                </View>
                <View style={styles.cardTextBlock}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {vehicle.name}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        vehicle.status === "Primary" && styles.badgePrimary,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          vehicle.status === "Primary" &&
                            styles.badgeTextPrimary,
                        ]}
                      >
                        {vehicle.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardSubtitleRow}>
                    <Text style={styles.cardBrandModel} numberOfLines={1}>
                      {vehicle.brand} · {vehicle.model}
                    </Text>
                    <View style={styles.dot} />
                    <Text style={styles.cardYear}>{vehicle.year}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </View>
          </Touchable>
        ))}

        {/* Add vehicle */}
        <Touchable
          style={styles.addCard}
          onPress={() => navigation.navigate("AddVehicle")}
          rippleColor="rgba(255,255,255,0.06)"
        >
          <View style={styles.addCardInner}>
            <View style={styles.addIconWrapper}>
              <Ionicons name="add" size={18} color={TEXT_MUTED} />
            </View>
            <Text style={styles.addCardLabel}>Add New Vehicle</Text>
          </View>
        </Touchable>
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
    height: 64,
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
    gap: 10,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(55, 194, 223, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(55, 194, 223, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandLabel: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.15,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  countText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  statusAllText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(55, 194, 223, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(55, 194, 223, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 8,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#2a2a2d",
    borderWidth: 1,
    borderColor: BORDER,
  },
  badgePrimary: {
    backgroundColor: "rgba(55, 194, 223, 0.12)",
    borderColor: "rgba(55, 194, 223, 0.35)",
  },
  badgeText: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  badgeTextPrimary: {
    color: ACCENT,
  },
  cardSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardBrandModel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TEXT_MUTED,
  },
  cardYear: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  addCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "dashed",
    borderRadius: 14,
    marginTop: 4,
  },
  addCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  addIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#2a2a2d",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  addCardLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: "500",
  },
});
