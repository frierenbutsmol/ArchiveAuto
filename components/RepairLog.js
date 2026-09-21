import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const C = {
  background: "#141316",
  surfaceContainer: "#201f22",
  surfaceContainerHigh: "#2b292d",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const REPAIR_TYPE_LABELS = {
  diy: "DIY",
  informal: "Informal",
  official: "Official Shop",
  manufacturer: "Dealership",
};

// Placeholder data
const records = [
  {
    id: "1",
    description: "Replaced front brake pads and rotors",
    date: "Sep 28, 2024",
    repairType: "official",
    cost: "₱4,200",
    hasPhoto: true,
  },
  {
    id: "2",
    description: "Fixed AC compressor belt",
    date: "Jul 14, 2024",
    repairType: "informal",
    cost: "₱950",
    hasPhoto: false,
  },
  {
    id: "3",
    description: "Replaced cracked side mirror",
    date: "Apr 02, 2024",
    repairType: "diy",
    cost: "₱600",
    hasPhoto: false,
  },
];

export default function RepairLog() {
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleAddNew = () => {
    navigation.navigate("AddRepair");
  };

  const handleRecordPress = (record) => {
    // open record detail screen
    console.log("Opened repair record:", record.description);
  };

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.headerTitle}>Repair Log</Text>
        <TouchableOpacity
          onPress={handleAddNew}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.addButton}
        >
          <MaterialIcons name="add" size={24} color={C.primaryContainer} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.summaryText}>
          {records.length} {records.length === 1 ? "repair" : "repairs"} logged
        </Text>

        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="hammer" size={40} color={C.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>No repairs logged yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first repair record.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handleRecordPress(record)}
              >
                <View style={styles.cardIconWrapper}>
                  <MaterialIcons
                    name="build"
                    size={20}
                    color={C.primaryContainer}
                  />
                </View>

                <View style={styles.cardTextBlock}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {record.description}
                    </Text>
                    <Text style={styles.cardCost}>{record.cost}</Text>
                  </View>
                  <Text style={styles.cardMeta}>{record.date}</Text>

                  <View style={styles.tagRow}>
                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>
                        {REPAIR_TYPE_LABELS[record.repairType]}
                      </Text>
                    </View>
                    {record.hasPhoto && (
                      <View style={styles.photoTag}>
                        <MaterialIcons
                          name="attachment"
                          size={12}
                          color={C.onSurfaceVariant}
                        />
                        <Text style={styles.photoTagText}>Receipt</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={handleAddNew}
      >
        <MaterialIcons name="add" size={26} color="#0F0E11" />
      </TouchableOpacity>
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
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
  },
  headerTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "700",
  },
  addButton: {
    width: 32,
    alignItems: "flex-end",
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: C.surfaceContainer,
    borderRadius: 14,
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
    alignItems: "flex-start",
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
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  typePill: {
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  typePillText: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "600",
  },
  photoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoTagText: {
    color: C.onSurfaceVariant,
    fontSize: 11,
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
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
