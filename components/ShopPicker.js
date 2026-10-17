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
const NONE = '__none__';

// Dropdown of the mechanics registered in the app.
// - "No shop / did it myself" clears the field.
// - "Other shop (type name)" reveals a text box for shops that aren't in the app.
// - If no mechanics are registered (or the list can't load) it falls back to a plain text box,
//   so the field never becomes unusable.
export default function ShopPicker({ value, onChange }) {
  const [mechanics, setMechanics] = useState(null);   // null = still loading
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);        // "Other" chosen

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

  // No registered mechanics: plain text box.
  if (mechanics && mechanics.length === 0) {
    return (
      <BoxInput
        placeholder="Shop name (optional)"
        value={value}
        onChangeText={onChange}
      />
    );
  }

  const options = [
    { key: NONE, label: 'No shop / did it myself' },
    ...(mechanics || []).map((m) => ({ key: m.id, label: m.display_name })),
    { key: OTHER, label: 'Other shop (type the name)' },
  ];

  const pick = (opt) => {
    setOpen(false);
    if (opt.key === NONE) { setTyping(false); onChange(''); }
    else if (opt.key === OTHER) { setTyping(true); onChange(isRegistered ? '' : value); }
    else { setTyping(false); onChange(opt.label); }
  };

  const showTextBox = typing && !isRegistered;
  const display = showTextBox ? 'Other shop' : value || '';

  return (
    <View>
      <TouchableOpacity style={styles.select} activeOpacity={0.8} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !display && styles.placeholder]} numberOfLines={1}>
          {mechanics === null ? 'Loading mechanics…' : display || 'Select a mechanic'}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={26} color={COLORS.textMuted} />
      </TouchableOpacity>

      {showTextBox && (
        <BoxInput
          style={{ marginTop: SPACING.sm }}
          placeholder="Type the shop name"
          value={value}
          onChangeText={onChange}
          autoFocus
        />
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Service provider</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.key}
              renderItem={({ item }) => {
                const selected =
                  (item.key === NONE && !value && !typing) ||
                  (item.key === OTHER && showTextBox) ||
                  (item.key !== NONE && item.key !== OTHER && item.label === value);
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