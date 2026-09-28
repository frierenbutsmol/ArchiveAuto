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
  surfaceContainerHigh: "#2b292d",
  surfaceContainerLow: "#1c1b1e",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
  error: "#ffb4ab",
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

const documents = [
  {
    id: "1",
    icon: "shield",
    title: "Comprehensive Insurance",
    dateLabel: "Added: Oct 12, 2023",
    status: "Active",
    statusColor: C.primaryContainer,
    fileType: "PDF",
    fileIcon: "description",
  },
  {
    id: "2",
    icon: "directions-car",
    title: "Vehicle Registration",
    dateLabel: "Added: Jan 05, 2024",
    status: "Active",
    statusColor: C.primaryContainer,
    fileType: "JPG",
    fileIcon: "image",
  },
  {
    id: "3",
    icon: "verified",
    title: "Powertrain Warranty",
    dateLabel: "Added: Nov 20, 2022",
    status: "Expiring Soon",
    statusColor: C.error,
    fileType: "PDF",
    fileIcon: "description",
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

export default function Documents() {
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

  const handleUpload = () => {
    // wire up to expo-image-picker
    console.log("Upload document pressed");
  };

  const handleDocumentPress = (doc) => {
    // open document detail
    console.log("Opened document:", doc.title);
  };

  const handleMorePress = (doc) => {
    // show action sheet
    console.log("More options for:", doc.title);
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
        <Text style={styles.brand}>ArchiveAuto</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header section */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Documents</Text>
            <Text style={styles.subtitle}>
              Manage your vehicle records and paperwork.
            </Text>
          </View>
        </View>

        <Touchable
          style={styles.uploadButton}
          onPress={handleUpload}
          rippleColor="rgba(0,0,0,0.15)"
        >
          <View style={styles.uploadButtonInner}>
            <MaterialIcons name="upload" size={20} color="#121212" />
            <Text style={styles.uploadButtonText}>Upload Document</Text>
          </View>
        </Touchable>

        {/* Document cards */}
        <View style={styles.grid}>
          {documents.map((doc) => (
            <Touchable
              key={doc.id}
              style={styles.card}
              onPress={() => handleDocumentPress(doc)}
              rippleColor="rgba(255,255,255,0.06)"
            >
              <View style={styles.cardInner}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIconWrapper}>
                    <MaterialIcons
                      name={doc.icon}
                      size={22}
                      color={C.primaryContainer}
                    />
                  </View>
                  <Touchable
                    style={styles.moreButton}
                    borderless
                    rippleColor="rgba(255,255,255,0.15)"
                    onPress={() => handleMorePress(doc)}
                  >
                    <MaterialIcons
                      name="more-vert"
                      size={20}
                      color={C.onSurfaceVariant}
                    />
                  </Touchable>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{doc.title}</Text>
                  <Text style={styles.cardDate}>{doc.dateLabel}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: `${doc.statusColor}1A` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: doc.statusColor },
                      ]}
                    >
                      {doc.status}
                    </Text>
                  </View>
                  <View style={styles.fileTypeRow}>
                    <MaterialIcons
                      name={doc.fileIcon}
                      size={16}
                      color={C.onSurfaceVariant}
                    />
                    <Text style={styles.fileTypeText}>{doc.fileType}</Text>
                  </View>
                </View>
              </View>
            </Touchable>
          ))}

          {/* Add new document card */}
          <Touchable
            style={styles.addCard}
            onPress={handleUpload}
            rippleColor="rgba(255,255,255,0.06)"
          >
            <View style={styles.addCardInner}>
              <MaterialIcons
                name="add-circle"
                size={36}
                color={C.onSurfaceVariant}
              />
              <Text style={styles.addCardTitle}>Add New Document</Text>
              <Text style={styles.addCardHint}>Tap to browse</Text>
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
    marginRight: 8,
  },
  brand: {
    color: C.primaryContainer,
    fontSize: 22,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    marginBottom: 4,
  },
  headerTextBlock: {
    gap: 4,
  },
  title: {
    color: C.onSurface,
    fontSize: 28,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  subtitle: {
    color: C.onSurfaceVariant,
    fontSize: 15,
  },
  uploadButton: {
    borderRadius: 999,
    backgroundColor: C.primaryContainer,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: C.primaryContainer,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  uploadButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  uploadButtonText: {
    color: "#121212",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: "rgba(42,42,42,0.7)",
    borderWidth: 1,
    borderColor: "rgba(51,51,51,0.8)",
    borderRadius: 16,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  cardInner: {
    padding: 16,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardIconWrapper: {
    backgroundColor: C.surfaceContainerLow,
    padding: 12,
    borderRadius: 10,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "600",
  },
  cardDate: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(58,73,75,0.5)",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  fileTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fileTypeText: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "600",
  },
  addCard: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: C.outlineVariant,
    borderRadius: 16,
  },
  addCardInner: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addCardTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },
  addCardHint: {
    color: C.onSurfaceVariant,
    fontSize: 12,
  },
});
