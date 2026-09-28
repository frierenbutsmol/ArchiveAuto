import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
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

const C = {
  background: "#141316",
  surfaceContainer: "#201f22",
  surfaceContainerHigh: "#2b292d",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

// Placeholder data
const records = [
  {
    id: "1",
    task: "Oil Change & Filter",
    date: "Oct 15, 2024",
    mileage: "24,500 mi",
    performedBy: "Official Shop",
    cost: "₱1,850",
  },
  {
    id: "2",
    task: "Tire Rotation",
    date: "Aug 22, 2024",
    mileage: "22,100 mi",
    performedBy: "DIY",
    cost: "₱0",
  },
  {
    id: "3",
    task: "Brake Fluid Flush",
    date: "May 10, 2024",
    mileage: "19,800 mi",
    performedBy: "Official Shop",
    cost: "₱2,200",
  },
  {
    id: "4",
    task: "Air Filter Replacement",
    date: "Feb 03, 2024",
    mileage: "17,400 mi",
    performedBy: "Informal",
    cost: "₱450",
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

export default function MaintenanceHistory() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleAddNew = () => {
    navigation.navigate("AddMaintenance");
  };

  const handleRecordPress = (record) => {
    // open record detail screen
    console.log("Opened record:", record.task);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Top app bar */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <Touchable
          onPress={handleBack}
          style={styles.backButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
        </Touchable>
        <Text style={styles.headerTitle}>Maintenance</Text>
        <Touchable
          onPress={handleAddNew}
          style={styles.addButton}
          borderless
          rippleColor="rgba(0, 242, 255, 0.15)"
        >
          <MaterialIcons name="add" size={24} color={C.primaryContainer} />
        </Touchable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.summaryText}>
          {records.length} service {records.length === 1 ? "record" : "records"}
        </Text>

        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="build" size={40} color={C.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>No maintenance logged yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first service record.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((record) => (
              <Touchable
                key={record.id}
                style={styles.card}
                onPress={() => handleRecordPress(record)}
                rippleColor="rgba(255,255,255,0.06)"
              >
                <View style={styles.cardInner}>
                  <View style={styles.cardIconWrapper}>
                    <MaterialIcons
                      name="build"
                      size={20}
                      color={C.primaryContainer}
                    />
                  </View>

                  <View style={styles.cardTextBlock}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {record.task}
                      </Text>
                      <Text style={styles.cardCost}>{record.cost}</Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {record.date} · {record.mileage}
                    </Text>
                    <View style={styles.performedByPill}>
                      <Text style={styles.performedByText}>
                        {record.performedBy}
                      </Text>
                    </View>
                  </View>
                </View>
              </Touchable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating add button */}
      <Touchable
        style={styles.fab}
        onPress={handleAddNew}
        borderless
        rippleColor="rgba(0,0,0,0.2)"
      >
        <View style={styles.fabInner}>
          <MaterialIcons name="add" size={26} color="#0F0E11" />
        </View>
      </Touchable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 16,
  },
  summaryText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "500",
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 14,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 14,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 242, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  cardCost: {
    color: C.primaryContainer,
    fontSize: 14,
    fontWeight: "700",
  },
  cardMeta: {
    color: C.onSurfaceVariant,
    fontSize: 12,
  },
  performedByPill: {
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  performedByText: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtitle: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primaryContainer,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
