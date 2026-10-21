import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';

// Shows the mechanics registered in the app as tappable chips under a shop / mechanic field.
// Typing narrows the list; tapping a name fills the field. The field itself stays free text,
// so shops that are not in the app can still be typed in.
export default function MechanicSuggestions({ value, onSelect }) {
  const [mechanics, setMechanics] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await api.mechanics.list();
      if (alive && Array.isArray(data)) setMechanics(data);
    })();
    return () => { alive = false; };
  }, []);

  const typed = (value || '').trim().toLowerCase();
  const matches = useMemo(
    () =>
      mechanics
        .filter((m) => m.display_name)
        .filter((m) => !typed || m.display_name.toLowerCase().includes(typed))
        .filter((m) => m.display_name.toLowerCase() !== typed)   // already filled in
        .slice(0, 12),
    [mechanics, typed]
  );

  if (matches.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Registered mechanics (tap to fill)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
      >
        {matches.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.chip}
            activeOpacity={0.8}
            onPress={() => onSelect(m.display_name)}
          >
            <Text style={styles.chipText}>{m.display_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: SPACING.sm },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  row: { gap: SPACING.sm, paddingRight: SPACING.sm },
  chip: {
    borderRadius: RADII.full,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});