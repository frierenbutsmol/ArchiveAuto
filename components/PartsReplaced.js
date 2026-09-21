import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
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

const C = {
  background: "#141316",
  surfaceContainer: "#201f22",
  surfaceContainerHigh: "#2b292d",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

// Placeholder data
const partsRecords = [
  {
    id: "1",
    part: "Oil Filter",
    source: "Maintenance",
    sourceIcon: "build",
    date: "Oct 15, 2024",
    context: "Oil Change & Filter",
  },
  {
    id: "2",
    part: "Front Brake Pads & Rotors",
    source: "Repair",
    sourceIcon: "handyman",
    date: "Sep 28, 2024",
    context: "Replaced front brake pads and rotors",
  },
  {
    id: "3",
    part: "Air Filter",
    source: "Maintenance",
    sourceIcon: "build",
    date: "Feb 03, 2024",
    context: "Air Filter Replacement",
  },
  {
    id: "4",
    part: "AC Compressor Belt",
    source: "Repair",
    sourceIcon: "handyman",
    date: "Jul 14, 2024",
    context: "Fixed AC compressor belt",
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

export default function PartsReplaced() {
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handlePartPress = (item) => {
    // navigate to the Maintenance/Repair record
    console.log("Opened part record:", item.part);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APPBAR_SURFACE} />

      {/* Top app bar */}
      <View style={styles.topBar}>
        <Touchable
          onPress={handleBack}
          style={styles.backButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
        </Touchable>
        <Text style={styles.headerTitle}>Parts Replaced</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.summaryText}>
          {partsRecords.length} {partsRecords.length === 1 ? "part" : "parts"}{" "}
          tracked · OEM & Aftermarket
        </Text>

        {partsRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="swap-horiz"
              size={40}
              color={C.onSurfaceVariant}
            />
            <Text style={styles.emptyTitle}>No parts logged yet</Text>
            <Text style={styles.emptySubtitle}>
              Fill in "Parts Replaced" when adding a Maintenance or Repair
              record and it'll show up here automatically.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {partsRecords.map((item) => (
              <Touchable
                key={item.id}
                style={styles.card}
                onPress={() => handlePartPress(item)}
                rippleColor="rgba(255,255,255,0.06)"
              >
                <View style={styles.cardInner}>
                  <View style={styles.cardIconWrapper}>
                    <MaterialIcons
                      name="swap-horiz"
                      size={20}
                      color={C.primaryContainer}
                    />
                  </View>

                  <View style={styles.cardTextBlock}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.part}
                      </Text>
                      <Text style={styles.cardDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.cardContext} numberOfLines={1}>
                      {item.context}
                    </Text>
                    <View style={styles.sourceTag}>
                      <MaterialIcons
                        name={item.sourceIcon}
                        size={12}
                        color={C.onSurfaceVariant}
                      />
                      <Text style={styles.sourceTagText}>{item.source}</Text>
                    </View>
                  </View>
                </View>
              </Touchable>
            ))}
          </View>
        )}
      </ScrollView>
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
    flex: 1,
    textAlign: "center",
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
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
  cardDate: {
    color: C.onSurfaceVariant,
    fontSize: 12,
  },
  cardContext: {
    color: C.onSurfaceVariant,
    fontSize: 12,
  },
  sourceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  sourceTagText: {
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
    paddingHorizontal: 30,
  },
});
