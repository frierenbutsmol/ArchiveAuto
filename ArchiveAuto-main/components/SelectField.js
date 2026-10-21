import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { useBottomInset } from '../lib/useBottomInset';
import { OTHER } from '../constants/vehicleCatalog';

// A dropdown: tap the field, pick from the list. Nothing to type.
//   <SelectField value={brand} options={[...]} onSelect={setBrand} placeholder="Select a brand" />
// Optional: searchable (a search box when the list has more than 8 items) and
//           details={{ Vios: '2003-2025' }} (small text on the right of a row).
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export default function SelectField({
  value,
  options = [],
  onSelect,
  placeholder = 'Select',
  title = 'Select',
  disabled = false,
  searchable = false,
  details = {},
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const bottomInset = useBottomInset();   // keep the list clear of the phone's Back/Home buttons

  const showSearch = searchable && options.length > 8;
  const q = norm(query);
  // "Other" stays in the list while searching, so there is always a way out.
  const visible = showSearch && q ? options.filter((o) => o === OTHER || norm(o).includes(q)) : options;

  const openSheet = () => { setQuery(''); setOpen(true); };
  const choose = (option) => {
    setOpen(false);
    setQuery('');
    onSelect(option);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${value || placeholder}`}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.avoider}
            pointerEvents="box-none"
          >
          <Pressable style={[styles.sheet, { paddingBottom: SPACING.lg + bottomInset }]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {showSearch ? (
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search"
                  placeholderTextColor={COLORS.textMuted}
                  autoCorrect={false}
                  autoCapitalize="none"
                  selectionColor={COLORS.primary}
                />
                {query ? (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <FlatList
              data={visible}
              keyExtractor={(item) => item}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={[styles.row, selected && styles.rowSelected]}
                    activeOpacity={0.7}
                    onPress={() => choose(item)}
                  >
                    <Text style={[styles.rowText, selected && styles.rowTextSelected, { flex: 1 }]}>{item}</Text>
                    {details[item] ? <Text style={styles.detailText}>{details[item]}</Text> : null}
                    {selected && <Ionicons name="checkmark" size={18} color={COLORS.primary} style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Same look as the other text fields on the Add Vehicle form
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 50,
  },
  fieldDisabled: { opacity: 0.5 },
  valueText: { flex: 1, color: COLORS.textPrimary, fontSize: 15, marginRight: SPACING.sm },
  placeholderText: { color: COLORS.textMuted },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 42,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15, marginLeft: SPACING.sm, paddingVertical: 0 },
  detailText: { color: COLORS.textMuted, fontSize: 12, marginLeft: SPACING.sm },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: SPACING.lg,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  sheetTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  rowSelected: { backgroundColor: COLORS.primaryMuted },
  rowText: { color: COLORS.textPrimary, fontSize: 15 },
  rowTextSelected: { color: COLORS.primary, fontWeight: '700' },
});