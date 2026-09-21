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
  surfaceContainerLow: "#1c1b1e",
  surfaceContainerHighest: "#363437",
  outline: "#849495",
  outlineVariant: "#3a494b",
  primaryContainer: "#00f2ff",
  onSurface: "#e6e1e5",
  onSurfaceVariant: "#b9cacb",
};

const APPBAR_SURFACE = C.surfaceContainerHigh;

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

export default function AddMaintenance() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [taskName, setTaskName] = useState("");
  const [date, setDate] = useState("");
  const [mileage, setMileage] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [notes, setNotes] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const handleAddRecord = () => {
    // hook up to maintenance-log database
    console.log("New maintenance record:", {
      taskName,
      date,
      mileage,
      partsReplaced,
      notes,
    });
  };

  const handleCancel = () => {
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
          onPress={handleCancel}
          style={styles.backButton}
          borderless
          rippleColor="rgba(255,255,255,0.15)"
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={C.onSurfaceVariant}
          />
        </Touchable>
        <Text style={styles.headerTitle}>Add Record</Text>
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
          {/* Icon + subtitle */}
          <View style={styles.introBlock}>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name="build"
                size={32}
                color={C.primaryContainer}
              />
            </View>
            <Text style={styles.introText}>
              Log maintenance details for your vehicle.
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {/* Task Name */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>TASK NAME</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "taskName" && styles.inputFocused,
                ]}
                placeholder="e.g., Oil Change, Tire Rotation"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={taskName}
                onChangeText={setTaskName}
                onFocus={() => setFocusedField("taskName")}
                onBlur={() => setFocusedField(null)}
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Date */}
            <View style={styles.fieldBlock}>
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

            {/* Mileage */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>MILEAGE</Text>
              <View style={styles.mileageRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.mileageInput,
                    focusedField === "mileage" && styles.inputFocused,
                  ]}
                  placeholder="45,000"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={mileage}
                  onChangeText={setMileage}
                  onFocus={() => setFocusedField("mileage")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="numeric"
                  underlineColorAndroid="transparent"
                  selectionColor={C.primaryContainer}
                />
                <Text style={styles.mileageUnit}>mi</Text>
              </View>
            </View>

            {/* Parts Replaced */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>PARTS REPLACED (OPTIONAL)</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "partsReplaced" && styles.inputFocused,
                ]}
                placeholder="e.g., Oil filter, Brake pads"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={partsReplaced}
                onChangeText={setPartsReplaced}
                onFocus={() => setFocusedField("partsReplaced")}
                onBlur={() => setFocusedField(null)}
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Notes */}
            <View style={[styles.fieldBlock, { marginTop: 4 }]}>
              <Text style={styles.fieldLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Additional details or parts used..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                underlineColorAndroid="transparent"
                selectionColor={C.primaryContainer}
              />
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <MaterialIcons name="info" size={20} color={C.primaryContainer} />
              <Text style={styles.infoText}>
                This record will be added to your vehicle's history log.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionArea}>
          <Touchable
            style={styles.submitButton}
            onPress={handleAddRecord}
            rippleColor="rgba(0,0,0,0.15)"
          >
            <View style={styles.submitButtonInner}>
              <MaterialIcons name="add-circle" size={20} color="#121212" />
              <Text style={styles.submitButtonText}>Add Record</Text>
            </View>
          </Touchable>

          <Touchable
            style={styles.cancelButton}
            onPress={handleCancel}
            rippleColor="rgba(255,255,255,0.08)"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Touchable>
        </View>
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
    paddingTop: 32,
    paddingBottom: 24,
  },
  introBlock: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surfaceContainerHigh,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(58,73,75,0.3)",
  },
  introText: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    ...Platform.select({ android: { elevation: 1 } }),
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
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
  },
  inputFocused: {
    borderBottomWidth: 2,
    borderBottomColor: C.primaryContainer,
  },
  mileageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mileageInput: {
    flex: 1,
  },
  mileageUnit: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    marginLeft: 8,
  },
  textarea: {
    backgroundColor: C.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    color: C.onSurface,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: "rgba(58,73,75,0.5)",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: C.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
  },
  actionArea: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    paddingTop: 8,
  },
  submitButton: {
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
  submitButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.select({
      android: "sans-serif-medium",
      default: undefined,
    }),
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: C.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "500",
  },
});
