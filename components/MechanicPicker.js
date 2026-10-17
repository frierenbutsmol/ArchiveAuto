import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';
import { BoxInput } from './FormKit';

const OTHER = '__other__';

// "Repair Shop / Mechanic Name" field for the Add Repair form.
// - A dropdown of the mechanics registered in the app (no typing needed).
// - "Other (type the name)" reveals a text box for a shop that is not in the app.
// - The dropdown always has "Other", so the field stays usable even when no mechanics are
//   registered yet or the list can't load.
// - Doing the repair yourself is chosen with the DIY repair type on the form, so this picker
//   is not shown for DIY and has no "no shop" option.
//
//   <MechanicPicker value={shopName} onChange={setShopName} />
export default function MechanicPicker({ value, onChange }) {
  const [mechanics, setMechanics] = useState(null);   // null = still loading
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);        // "Other" was chosen

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await api.mechanics.list();
      if (alive) setMechanics(Array.isArray(data) ? data.filter((m) => m.display_name) : []);
    })();
    return () => { alive = false; };
  }, []);

  const names = (mechanics || []).map((m) => m.display_name);
  const isRegistered = !!value && names.includes(value);
  // A name that isn't a registered mechanic (for example one typed earlier) is shown in the text box.
  const showTextBox = !isRegistered && (typing || (mechanics !== null && !!value));

  const options = [
    ...(mechanics || []).map((m) => ({ key: m.id, label: m.display_name })),
    { key: OTHER, label: 'Other (type the name)' },
  ];

  const pick = (opt) => {
    setOpen(false);
    if (opt.key === OTHER) {
      setTyping(true);
      onChange(isRegistered ? '' : value);
    } else {
      setTyping(false);
      onChange(opt.label);
    }
  };

  const display = showTextBox ? 'Other (type the name)' : value || '';

  return (
    <View>
      <TouchableOpacity
        style={styles.select}
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose a mechanic or shop"
      >
        <Text style={[styles.selectText, !display && styles.placeholder]} numberOfLines={1}>
          {mechanics === null && !display ? 'Loading mechanics…' : display || 'Select a mechanic or shop'}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textMuted} />
      </TouchableOpacity>

      {showTextBox && (
        <BoxInput
          style={{ marginTop: SPACING.sm }}
          placeholder="Type the shop or mechanic name"
          value={value}
          onChangeText={onChange}
          autoFocus={typing}
        />
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Mechanic / shop</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.key}
              renderItem={({ item }) => {
                const selected =
                  (item.key === OTHER && showTextBox) ||
                  (item.key !== OTHER && item.label === value);
                return (
                  <TouchableOpacity style={styles.option} activeOpacity={0.7} onPress={() => pick(item)}>
                    <Text style={[styles.optionText, selected && styles.optionSelected]}>{item.label}</Text>
                    {selected && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectText: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },
  placeholder: { color: COLORS.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.xl },
  sheet: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.card,
    paddingVertical: SPACING.md,
    maxHeight: '70%',
    ...Platform.select({ android: { elevation: 6 } }),
  },
  sheetTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  optionText: { color: COLORS.textPrimary, fontSize: 16, flex: 1 },
  optionSelected: { color: COLORS.primary, fontWeight: '600' },
});