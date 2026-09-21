import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BACKGROUND = "#141316";
const SURFACE_CONTAINER = "#201f22";
const SURFACE_CONTAINER_HIGH = "#2b292d";
const OUTLINE_VARIANT = "#3a494b";
const PRIMARY_CONTAINER = "#00f2ff";
const ON_SURFACE = "#e6e1e5";
const ON_SURFACE_VARIANT = "#b9cacb";
const ERROR = "#ffb4ab";

// Placeholder data
const user = {
  name: "Alex Mercer",
  email: "alex.mercer@example.com",
  isPro: true,
  avatarUrl: null,
};

const menuItems = [
  { id: "settings", icon: "settings-outline", label: "Settings" },
  { id: "help", icon: "help-circle-outline", label: "Help / Support" },
  { id: "logout", icon: "log-out-outline", label: "Logout", danger: true },
];

export default function ProfileScreen() {
  const navigation = useNavigation();

  const handleMenuPress = (id) => {
    if (id === "logout") {
      // hook up to real sign-out logic
      navigation.reset({
        index: 0,
        routes: [{ name: "SignIn" }],
      });
      return;
    }
    if (id === "settings") {
      navigation.navigate("Settings");
      return;
    }
    if (id === "help") {
      // navigate to a real Help/Support screen
      console.log("Pressed menu item:", id);
      return;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={BACKGROUND} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={PRIMARY_CONTAINER} />
        </TouchableOpacity>
        <Text style={styles.brand}>AutoCare</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile header card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarRing}>
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={34} color={PRIMARY_CONTAINER} />
              </View>
            )}
          </View>

          <View style={styles.headerText}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            {user.isPro && (
              <View style={styles.proBadge}>
                <View style={styles.proBadgeDot} />
                <Text style={styles.proBadgeText}>Pro Member</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu rows */}
        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuRow, item.danger && styles.menuRowDanger]}
              activeOpacity={0.8}
              onPress={() => handleMenuPress(item.id)}
            >
              <View style={styles.menuRowLeft}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.danger ? ERROR : ON_SURFACE_VARIANT}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    item.danger && styles.menuLabelDanger,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              {!item.danger && (
                <Ionicons
                  name="chevron-forward-outline"
                  size={18}
                  color="rgba(255,255,255,0.4)"
                />
              )}
            </TouchableOpacity>
          ))}
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
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: BACKGROUND,
  },
  backButton: {
    marginRight: 16,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: PRIMARY_CONTAINER,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE_CONTAINER_HIGH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: OUTLINE_VARIANT,
    padding: 16,
    marginBottom: 32,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: PRIMARY_CONTAINER,
    padding: 3,
    marginRight: 16,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: "rgba(0, 242, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flexShrink: 1,
  },
  userName: {
    color: ON_SURFACE,
    fontWeight: "600",
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 2,
  },
  userEmail: {
    color: ON_SURFACE_VARIANT,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: SURFACE_CONTAINER,
    borderWidth: 1,
    borderColor: OUTLINE_VARIANT,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_CONTAINER,
    marginRight: 6,
  },
  proBadgeText: {
    color: ON_SURFACE,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  menuList: {
    gap: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: SURFACE_CONTAINER_HIGH,
    borderWidth: 1,
    borderColor: OUTLINE_VARIANT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuRowDanger: {
    marginTop: 16,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuLabel: {
    color: ON_SURFACE,
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 24,
  },
  menuLabelDanger: {
    color: ERROR,
  },
});
