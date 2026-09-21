import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
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
  surface: "#141316",
  surfaceContainerHigh: "#2b292d",
  surfaceContainerHighest: "#363437",
  surfaceVariant: "#363437",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onPrimaryFixed: "#002022",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const initialAlerts = [
  {
    id: "1",
    icon: "warning",
    title: "Critical Tire Pressure",
    time: "Just now",
    message:
      "Front right tire on '22 Model S is at 28 PSI. Recommended is 42 PSI. Please check immediately.",
    critical: true,
  },
  {
    id: "2",
    icon: "build",
    title: "Upcoming Maintenance",
    time: "2 hours ago",
    message: "Your '19 F-150 is due for its 50,000-mile service next week.",
  },
  {
    id: "3",
    icon: "update",
    title: "Software Update Complete",
    time: "Yesterday",
    message:
      "ArchiveAuto OS v2.4 has been successfully installed on your profile.",
    muted: true,
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

export default function Notification() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const handleDismiss = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSchedule = (id) => {
    // navigate to service-scheduling flow
    console.log("Schedule service for alert:", id);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        style={{ marginTop: statusBarOffset }}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Manage alerts and maintenance reminders for your garage.
          </Text>
        </View>

        <View style={styles.list}>
          {alerts.map((item) => (
            <Touchable
              key={item.id}
              style={[
                styles.card,
                item.critical && styles.cardCritical,
                item.muted && styles.cardMuted,
              ]}
              rippleColor="rgba(255,255,255,0.06)"
            >
              <View style={styles.cardInner}>
                {item.critical && <View style={styles.criticalBar} />}

                <View
                  style={[
                    styles.iconWrapper,
                    item.critical && styles.iconWrapperCritical,
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={20}
                    color={
                      item.critical ? C.primaryContainer : C.onSurfaceVariant
                    }
                  />
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text
                      style={[
                        styles.cardTitle,
                        item.muted && styles.cardTitleMuted,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.cardTime}>{item.time}</Text>
                  </View>

                  <Text style={styles.cardMessage}>{item.message}</Text>

                  {item.critical && (
                    <View style={styles.actionRow}>
                      <Touchable
                        style={styles.primaryButton}
                        onPress={() => handleSchedule(item.id)}
                        rippleColor="rgba(0,0,0,0.15)"
                      >
                        <View style={styles.primaryButtonInner}>
                          <Text style={styles.primaryButtonText}>
                            Schedule Service
                          </Text>
                        </View>
                      </Touchable>
                      <Touchable
                        style={styles.secondaryButton}
                        onPress={() => handleDismiss(item.id)}
                        rippleColor="rgba(255,255,255,0.1)"
                      >
                        <View style={styles.secondaryButtonInner}>
                          <Text style={styles.secondaryButtonText}>
                            Dismiss
                          </Text>
                        </View>
                      </Touchable>
                    </View>
                  )}
                </View>
              </View>
            </Touchable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  rippleFill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    color: C.onSurface,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  subtitle: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  list: {
    gap: 16,
  },
  card: {
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
    overflow: "hidden",
    ...Platform.select({ android: { elevation: 1 } }),
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 16,
  },
  cardCritical: {
    borderColor: C.outlineVariant,
  },
  cardMuted: {
    opacity: 0.75,
  },
  criticalBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: C.primaryContainer,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  iconWrapperCritical: {
    backgroundColor: "rgba(0, 242, 255, 0.1)",
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    color: C.onSurface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
    marginRight: 8,
  },
  cardTitleMuted: {
    color: C.onSurfaceVariant,
  },
  cardTime: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  cardMessage: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: C.primaryContainer,
  },
  primaryButtonInner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  primaryButtonText: {
    color: C.onPrimaryFixed,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 999,
  },
  secondaryButtonInner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  secondaryButtonText: {
    color: C.onSurface,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
