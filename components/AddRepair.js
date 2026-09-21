import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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

const C = {
  background: "#141316",
  surfaceContainerHigh: "#2b292d",
  outline: "#849495",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

const REPAIR_TYPES = [
  { key: "diy", label: "DIY (Do It Yourself)" },
  { key: "informal", label: "Informal (Friend/Independent)" },
  { key: "official", label: "Official Shop" },
  { key: "manufacturer", label: "Manufacturer Dealership" },
];

// Photo documentation
const PHOTO_REQUIRED_TYPES = ["official", "manufacturer"];

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

export default function AddRepair() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [repairType, setRepairType] = useState("diy");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const photoRequired = PHOTO_REQUIRED_TYPES.includes(repairType);
  const selectedTypeLabel = REPAIR_TYPES.find(
    (t) => t.key === repairType,
  )?.label;

  const handleSave = () => {
    // hook up to repair-log database
    console.log("New repair entry:", { repairType, description, cost, date });
  };

  const handleBack = () => {
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

      {/* Top app bar */}
      <View
        style={[
          styles.topBar,
          { height: 64 + insets.top, paddingTop: insets.top },
        ]}
      >
        <Touchable
          onPress={handleBack}
          style={styles.backButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
        </Touchable>
        <Text style={styles.brand}>ArchiveAuto</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingBlock}>
            <Text style={styles.title}>Add Repair Entry</Text>
            <Text style={styles.subtitle}>
              Document a new maintenance or repair event.
            </Text>
          </View>

          {/* Repair Type */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>REPAIR TYPE</Text>
            <Touchable
              style={styles.selectInput}
              onPress={() => setShowTypeMenu((v) => !v)}
              rippleColor="rgba(255,255,255,0.08)"
            >
              <View style={styles.selectInputInner}>
                <Text style={styles.selectInputText}>{selectedTypeLabel}</Text>
                <MaterialIcons
                  name={showTypeMenu ? "expand-less" : "expand-more"}
                  size={22}
                  color={C.onSurfaceVariant}
                />
              </View>
            </Touchable>

            {showTypeMenu && (
              <View style={styles.dropdown}>
                {REPAIR_TYPES.map((type) => (
                  <Touchable
                    key={type.key}
                    style={styles.dropdownItem}
                    rippleColor="rgba(255,255,255,0.08)"
                    onPress={() => {
                      setRepairType(type.key);
                      setShowTypeMenu(false);
                    }}
                  >
                    <View style={styles.dropdownItemInner}>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          type.key === repairType &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                      {type.key === repairType && (
                        <MaterialIcons
                          name="check"
                          size={18}
                          color={C.primaryContainer}
                        />
                      )}
                    </View>
                  </Touchable>
                ))}
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              style={[
                styles.textarea,
                focusedField === "description" && styles.inputFocused,
              ]}
              placeholder="Describe the work done..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={description}
              onChangeText={setDescription}
              onFocus={() => setFocusedField("description")}
              onBlur={() => setFocusedField(null)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              selectionColor={C.primaryContainer}
            />
          </View>

          {/* Cost & Date row */}
          <View style={styles.row}>
            <View style={[styles.fieldBlock, styles.rowField]}>
              <Text style={styles.fieldLabel}>COST</Text>
              <View
                style={[
                  styles.costInputWrapper,
                  focusedField === "cost" && styles.inputFocused,
                ]}
              >
                <Text style={styles.costPrefix}>₱</Text>
                <TextInput
                  style={styles.costInput}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={cost}
                  onChangeText={setCost}
                  onFocus={() => setFocusedField("cost")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="numeric"
                  underlineColorAndroid="transparent"
                  selectionColor={C.primaryContainer}
                />
              </View>
            </View>

            <View style={[styles.fieldBlock, styles.rowField]}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "date" && styles.inputFocused,
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={date}
                onChangeText={setDate}
                onFocus={() => setFocusedField("date")}
                onBlur={() => setFocusedField(null)}
                keyboardType="numbers-and-punctuation"
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>
          </View>

          {/* Photo upload */}
          <View style={styles.fieldBlock}>
            <View style={styles.photoLabelRow}>
              <Text style={styles.fieldLabel}>DOCUMENTATION</Text>
              {photoRequired && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Required</Text>
                </View>
              )}
            </View>
            <Touchable
              style={styles.uploadBox}
              rippleColor="rgba(255,255,255,0.06)"
            >
              <View style={styles.uploadBoxInner}>
                <MaterialIcons name="add-a-photo" size={36} color={C.outline} />
                <Text style={styles.uploadTitle}>
                  Upload receipt or invoice
                </Text>
                <Text style={styles.uploadHint}>JPG, PNG up to 5MB</Text>
              </View>
            </Touchable>
          </View>

          {/* Save button */}
          <Touchable
            style={styles.saveButton}
            onPress={handleSave}
            rippleColor="rgba(0,0,0,0.15)"
          >
            <View style={styles.saveButtonInner}>
              <MaterialIcons name="save" size={20} color="#0F0E11" />
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </View>
          </Touchable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  flex: {
    flex: 1,
  },
  rippleFill: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
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
  brand: {
    flex: 1,
    textAlign: "center",
    color: C.primaryContainer,
    fontSize: 22,
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  headingBlock: {
    marginBottom: 4,
  },
  title: {
    color: C.onSurface,
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  subtitle: {
    color: C.onSurfaceVariant,
    fontSize: 15,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    color: C.onSurface,
    fontSize: 16,
    backgroundColor: C.surfaceContainerHigh,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  inputFocused: {
    borderBottomWidth: 2,
    borderBottomColor: C.primaryContainer,
  },
  selectInput: {
    backgroundColor: C.surfaceContainerHigh,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: "hidden",
  },
  selectInputInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectInputText: {
    color: C.onSurface,
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 8,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  dropdownItemInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    color: C.onSurfaceVariant,
    fontSize: 15,
  },
  dropdownItemTextActive: {
    color: C.primaryContainer,
    fontWeight: "600",
  },
  textarea: {
    color: C.onSurface,
    fontSize: 16,
    backgroundColor: C.surfaceContainerHigh,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 80,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  rowField: {
    flex: 1,
  },
  costInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceContainerHigh,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
    paddingHorizontal: 14,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  costPrefix: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    marginRight: 4,
  },
  costInput: {
    flex: 1,
    color: C.onSurface,
    fontSize: 16,
    paddingVertical: 12,
  },
  photoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requiredBadge: {
    backgroundColor: "rgba(0, 242, 255, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  requiredBadgeText: {
    color: C.primaryContainer,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: C.outlineVariant,
    borderRadius: 12,
  },
  uploadBoxInner: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    color: C.onSurface,
    fontSize: 15,
    marginTop: 8,
  },
  uploadHint: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 999,
    backgroundColor: C.primaryContainer,
    marginTop: 8,
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
  saveButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    color: "#0F0E11",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
});
