import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  background: "#141316",
  surfaceContainer: "#201f22",
  surfaceVariant: "#363437",
  secondaryContainer: "#444954",
  onSecondaryContainer: "#b4b8c5",
  outlineVariant: "#3a494b",
  primary: "#e1fdff",
  onPrimary: "#00363a",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const TYPE_ICONS = {
  car: "car",
  motorcycle: "motorbike",
  van: "van-passenger",
  truck: "truck",
};

const FALLBACK_STATS = {
  verifiedRepairs: "0",
  lastService: "—",
  mileage: "—",
  plate: "—",
};

const FALLBACK_HISTORY = [];

export default function VehicleDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const vehicle = route.params?.vehicle;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleExportPDF = () => {
    // wire up PDF export
    console.log("Export PDF pressed for:", vehicle?.name);
  };

  const handleShareImage = () => {
    // wire up share-as-image
    console.log("Share as Image pressed for:", vehicle?.name);
  };

  const handleHistoryItemPress = (item) => {
    // open history item detail
    console.log("Opened history item:", item.title);
  };

  const stats = vehicle?.stats || FALLBACK_STATS;
  const history = vehicle?.history || FALLBACK_HISTORY;
  const iconName = TYPE_ICONS[vehicle?.type] || "car";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />

      {/* Top app bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <View style={styles.avatarCircle}>
          <MaterialIcons name="person" size={18} color={C.onPrimary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Vehicle summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrapper}>
            <MaterialCommunityIcons
              name={iconName}
              size={32}
              color={C.onSecondaryContainer}
            />
          </View>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.vehicleName} numberOfLines={1}>
              {vehicle?.name || "Unknown Vehicle"}
            </Text>
            <Text style={styles.vehicleMeta}>
              {vehicle?.year} | {vehicle?.brand} {vehicle?.model}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="build"
                size={16}
                color={C.onSurfaceVariant}
              />
              <Text style={styles.statLabel}>Verified Repairs</Text>
            </View>
            <Text style={styles.statValue}>{stats.verifiedRepairs}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="calendar-today"
                size={16}
                color={C.onSurfaceVariant}
              />
              <Text style={styles.statLabel}>Last Service</Text>
            </View>
            <Text style={styles.statValue}>{stats.lastService}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="speed"
                size={16}
                color={C.onSurfaceVariant}
              />
              <Text style={styles.statLabel}>Mileage</Text>
            </View>
            <Text style={styles.statValue}>{stats.mileage}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="directions-car"
                size={16}
                color={C.onSurfaceVariant}
              />
              <Text style={styles.statLabel}>Plate</Text>
            </View>
            <Text style={styles.statValue}>{stats.plate}</Text>
          </View>
        </View>

        {/* Recent history */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>Recent History</Text>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>
                No history recorded yet.
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyCard}
                  activeOpacity={0.85}
                  onPress={() => handleHistoryItemPress(item)}
                >
                  <View
                    style={[
                      styles.historyIconWrapper,
                      item.iconHighlighted
                        ? styles.historyIconWrapperHighlighted
                        : styles.historyIconWrapperMuted,
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={
                        item.iconHighlighted ? C.primary : C.onSurfaceVariant
                      }
                    />
                  </View>

                  <View style={styles.historyTextBlock}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.historyLocation} numberOfLines={1}>
                      {item.location}
                    </Text>
                    <View style={styles.historyTagRow}>
                      <View
                        style={[
                          styles.historyDot,
                          {
                            backgroundColor: item.tagHighlighted
                              ? C.primary
                              : C.onSurfaceVariant,
                          },
                        ]}
                      />
                      <Text style={styles.historyTagText}>{item.tag}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.exportButton}
            activeOpacity={0.9}
            onPress={handleExportPDF}
          >
            <MaterialIcons
              name="picture-as-pdf"
              size={20}
              color={C.onPrimary}
            />
            <Text style={styles.exportButtonText}>Export PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            activeOpacity={0.85}
            onPress={handleShareImage}
          >
            <MaterialIcons name="share" size={20} color={C.primary} />
            <Text style={styles.shareButtonText}>Share as Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 64,
    paddingHorizontal: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "600",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 24,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: C.surfaceContainer,
    borderRadius: 16,
    padding: 16,
  },
  summaryIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.secondaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  vehicleName: {
    color: C.onSurface,
    fontSize: 24,
    fontWeight: "700",
  },
  vehicleMeta: {
    color: C.onSurfaceVariant,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: C.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    color: C.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "500",
  },
  statValue: {
    color: C.onSurface,
    fontSize: 24,
    fontWeight: "600",
    marginTop: 4,
  },
  historySection: {
    gap: 16,
  },
  sectionHeading: {
    color: C.onSurface,
    fontSize: 24,
    fontWeight: "600",
  },
  emptyHistory: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyHistoryText: {
    color: C.onSurfaceVariant,
    fontSize: 14,
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    backgroundColor: C.surfaceContainer,
    borderRadius: 16,
    padding: 16,
  },
  historyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  historyIconWrapperHighlighted: {
    backgroundColor: "rgba(225, 253, 255, 0.1)",
  },
  historyIconWrapperMuted: {
    backgroundColor: C.surfaceVariant,
  },
  historyTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  historyTitle: {
    flex: 1,
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "600",
  },
  historyDate: {
    color: C.onSurfaceVariant,
    fontSize: 12,
  },
  historyLocation: {
    color: C.onSurfaceVariant,
    fontSize: 14,
  },
  historyTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyTagText: {
    color: C.onSurfaceVariant,
    fontSize: 12,
  },
  actionSection: {
    gap: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 999,
    height: 48,
  },
  exportButtonText: {
    color: C.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 999,
    height: 48,
  },
  shareButtonText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
