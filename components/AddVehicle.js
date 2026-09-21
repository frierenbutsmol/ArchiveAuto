import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
const CARD_BG = "#2E333D";
const ACCENT = "#37C2DF";
const BORDER = "rgba(255,255,255,0.15)";
const TEXT_MUTED = "rgba(255,255,255,0.5)";

const TOP_BAR_HEIGHT = 64;

const VEHICLE_TYPES = [
  { id: "car", label: "Car", icon: "car" },
  { id: "motorcycle", label: "Motorcycle", icon: "motorbike" },
  { id: "van", label: "Van", icon: "van-passenger" },
  { id: "truck", label: "Truck", icon: "truck" },
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

export default function AddVehicle() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === "android"
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const [vehicleType, setVehicleType] = useState("motorcycle");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const handleSave = () => {
    // hook up to local storage
    console.log("Save vehicle:", { vehicleType, make, model, year });
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Top bar */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <Touchable
          style={styles.iconButton}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Touchable>
        <Text style={styles.topBarTitle}>Add Record</Text>
        <Touchable
          style={styles.avatarCircle}
          borderless
          rippleColor="rgba(0,0,0,0.2)"
        >
          <Ionicons name="person" size={16} color="#0F0E11" />
        </Touchable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header illustration */}
          <View style={styles.heroBlock}>
            <View style={styles.heroCircle}>
              <MaterialCommunityIcons name="car" size={44} color={ACCENT} />
            </View>
            <Text style={styles.heroTitle}>Add New Vehicle</Text>
            <Text style={styles.heroSubtitle}>
              Enter your vehicle details below to begin tracking performance.
            </Text>
          </View>

          {/* Vehicle Type */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>VEHICLE TYPE</Text>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPES.map((type) => {
                const selected = vehicleType === type.id;
                return (
                  <Touchable
                    key={type.id}
                    style={[
                      styles.typeChip,
                      selected && styles.typeChipSelected,
                    ]}
                    onPress={() => setVehicleType(type.id)}
                    rippleColor="rgba(55, 194, 223, 0.15)"
                  >
                    <View style={styles.typeChipInner}>
                      <MaterialCommunityIcons
                        name={type.icon}
                        size={20}
                        color={selected ? ACCENT : TEXT_MUTED}
                        style={styles.typeChipIcon}
                      />
                      <Text
                        style={[
                          styles.typeChipLabel,
                          selected && styles.typeChipLabelSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </View>
                  </Touchable>
                );
              })}
            </View>
          </View>

          {/* Make */}
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Make</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Porsche"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={make}
              onChangeText={setMake}
              underlineColorAndroid="transparent"
              selectionColor={ACCENT}
            />
            <View style={styles.inputUnderline} />
          </View>

          {/* Model */}
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Model</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 911 GT3"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={model}
              onChangeText={setModel}
              underlineColorAndroid="transparent"
              selectionColor={ACCENT}
            />
            <View style={styles.inputUnderline} />
          </View>

          {/* Year */}
          <View style={[styles.inputBlock, styles.yearBlock]}>
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
              underlineColorAndroid="transparent"
              selectionColor={ACCENT}
            />
            <View style={styles.inputUnderline} />
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={styles.bottomBlock}>
          <Touchable
            style={styles.saveButton}
            onPress={handleSave}
            rippleColor="rgba(0,0,0,0.15)"
          >
            <View style={styles.saveButtonInner}>
              <Ionicons
                name="save"
                size={18}
                color="#0F0E11"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.saveButtonText}>Save Vehicle</Text>
            </View>
          </Touchable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  flex: {
    flex: 1,
    justifyContent: "space-between",
  },
  rippleFill: {
    flex: 1,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroBlock: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
  },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: CARD_BG,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  heroSubtitle: {
    color: TEXT_MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  fieldBlock: {
    marginTop: 16,
    marginBottom: 24,
  },
  fieldLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  typeChip: {
    width: "48%",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    overflow: "hidden",
  },
  typeChipSelected: {
    borderColor: ACCENT,
    backgroundColor: "rgba(55, 194, 223, 0.08)",
  },
  typeChipInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  typeChipIcon: {
    marginRight: 10,
  },
  typeChipLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  typeChipLabelSelected: {
    color: ACCENT,
  },
  inputBlock: {
    marginBottom: 24,
  },
  yearBlock: {
    width: "50%",
  },
  inputLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 17,
    paddingBottom: 8,
  },
  inputUnderline: {
    height: 0,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  bottomBlock: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  saveButton: {
    width: "100%",
    height: 52,
    backgroundColor: ACCENT,
    borderRadius: 26,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: ACCENT,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  saveButtonInner: {
    flexDirection: "row",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#0F0E11",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
});
