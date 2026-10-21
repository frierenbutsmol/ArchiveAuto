// "Service provider" dropdown for the Add Maintenance and Add Repair forms.
//
// The list is PERSONAL to the signed-in user (GET /service-providers):
//   - shops and mechanics the user typed into their own earlier records, most recent first, and
//   - mechanics the user shared a vehicle with.
// Nobody else's names, and no list of every mechanic in the app. A name typed through
// "Other shop" is saved with the record, so it appears here the next time.
//
//   <ShopPicker value={shopName} onChange={setShopName} none={diy} onNone={setDiy} />
//
// value/onChange   the shop name (text)
// none/onNone      the explicit "No shop" choice, so the form can tell
//                  "chose DIY" apart from "has not chosen yet" (leave out to hide that row: allowNone={false})
// title            heading of the sheet; placeholder: text of the closed field
// Always usable: the sheet always has "Other shop", even when nothing is saved yet or the list fails to load.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII, TYPOGRAPHY } from '../constants/theme';
import { api } from '../lib/api';
import { useBottomInset } from '../lib/useBottomInset';
import { BoxInput } from './FormKit';

const NONE_LABEL = 'No shop';

// "Mang Tom's Auto" and "mang toms auto" are the same shop.
export const providerKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const formatDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(iso).slice(0, 10);
  }
};

// The small grey line under a name.
export function captionFor(p) {
  const when = formatDay(p.last_used);
  if (p.kind === 'mechanic') return p.uses > 0 && when ? `Shared mechanic \u00b7 last used ${when}` : 'Shared mechanic';
  const count = p.uses === 1 ? '1 record' : `${p.uses} records`;
  return when ? `Last used ${when} \u00b7 ${count}` : count;
}

export default function ShopPicker({
  value,
  onChange,
  none,
  onNone,
  allowNone = true,
  title = 'Service provider',
  placeholder = 'Select a provider',
}) {
  const [providers, setProviders] = useState(null);   // null = still loading
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);        // "Other shop" was chosen
  const [query, setQuery] = useState('');
  const bottomInset = useBottomInset();
  const alive = useRef(true);

  const load = useCallback(async () => {
    setFailed(false);
    setProviders(null);                              // shows "Loading..." (also when retrying)
    const { data, error } = await api.providers.list();
    if (!alive.current) return;
    if (error || !Array.isArray(data)) {
      setFailed(true);
      setProviders([]);
    } else {
      setProviders(data.filter((p) => p && typeof p.name === 'string' && p.name));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = providers || [];
  const loaded = providers !== null;
  const match = value ? list.find((p) => providerKey(p.name) === providerKey(value)) : null;
  // The text box shows while typing, or when the form already holds a name that isn't one of the saved ones.
  const showTextBox = !none && (typing || (loaded && !!value && !match));
  const display = none ? NONE_LABEL : showTextBox ? 'Other shop' : value || '';
  const hasChoice = !!display;

  const showSearch = list.length > 6;
  const q = providerKey(query);
  const visible = q ? list.filter((p) => providerKey(p.name).includes(q)) : list;
  const isSelected = (p) => !typing && !none && !!value && providerKey(p.name) === providerKey(value);

  const close = () => { setOpen(false); setQuery(''); };
  const pickProvider = (p) => { close(); setTyping(false); onChange(p.name); onNone?.(false); };
  const pickNone = () => { close(); setTyping(false); onChange(''); onNone?.(true); };
  const pickOther = () => { close(); setTyping(true); onChange(match ? '' : value); onNone?.(false); };

  // ---------- pieces of the sheet ----------
  // (a plain function, not a component, so the rows are not re-created on every render)
  const actionRow = ({ testID, icon, label, caption, selected, onPress, accent }) => (
    <TouchableOpacity
      key={testID}
      testID={testID}
      style={[styles.row, selected && styles.rowSelected]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      <View style={[styles.avatar, accent && styles.avatarAccent, selected && styles.avatarSelected]}>
        <Ionicons name={icon} size={20} color={accent || selected ? COLORS.primary : COLORS.textSecondary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, (selected || accent) && styles.rowTitleOn]} numberOfLines={1}>{label}</Text>
        {caption ? <Text style={styles.rowCaption} numberOfLines={1}>{caption}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : null}
    </TouchableOpacity>
  );

  const renderProvider = ({ item, index }) => {
    const selected = isSelected(item);
    return (
      <TouchableOpacity
        testID={`provider-row-${index}`}
        style={[styles.row, selected && styles.rowSelected]}
        activeOpacity={0.7}
        onPress={() => pickProvider(item)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <View style={[styles.avatar, selected && styles.avatarSelected]}>
          <Ionicons
            name={item.kind === 'mechanic' ? 'construct-outline' : 'storefront-outline'}
            size={20}
            color={selected ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, selected && styles.rowTitleOn]} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowCaption} numberOfLines={1}>{captionFor(item)}</Text>
        </View>
        {item.kind === 'mechanic' ? (
          <View style={styles.pill}><Text style={styles.pillText}>Mechanic</Text></View>
        ) : null}
        {selected ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : null}
      </TouchableOpacity>
    );
  };

  const header = (
    <View>
      {allowNone && !q
        ? actionRow({
            testID: 'provider-none',
            icon: 'build-outline',
            label: NONE_LABEL,
            caption: 'Nothing to attach',
            selected: !!none,
            onPress: pickNone,
          })
        : null}
      {visible.length > 0 ? (
        <Text style={styles.section}>{q ? 'Matches' : 'Your shops & mechanics'}</Text>
      ) : null}
    </View>
  );

  const empty = !loaded ? (
    <View testID="provider-loading" style={styles.note}>
      <ActivityIndicator color={COLORS.primary} />
      <Text style={styles.noteText}>Loading your saved shops…</Text>
    </View>
  ) : failed ? (
    <View testID="provider-error" style={styles.note}>
      <Ionicons name="cloud-offline-outline" size={26} color={COLORS.warning} />
      <Text style={styles.noteTitle}>Couldn't load your saved shops</Text>
      <Text style={styles.noteText}>You can still type a shop name below.</Text>
      <TouchableOpacity testID="provider-retry" style={styles.retry} activeOpacity={0.8} onPress={load}>
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  ) : q ? (
    <View testID="provider-nomatch" style={styles.note}>
      <Text style={styles.noteText}>No saved shop matches "{query.trim()}".</Text>
    </View>
  ) : (
    <View testID="provider-empty" style={styles.note}>
      <Ionicons name="storefront-outline" size={26} color={COLORS.textMuted} />
      <Text style={styles.noteTitle}>No saved shops yet</Text>
      <Text style={styles.noteText}>Choose "Other shop", type a name and save the record. It will be listed here next time.</Text>
    </View>
  );

  const footer = actionRow({
    testID: 'provider-other',
    icon: 'add-circle-outline',
    label: 'Other shop (type the name)',
    caption: 'Saved with the record for next time',
    selected: showTextBox,
    accent: true,
    onPress: pickOther,
  });

  return (
    <View>
      <TouchableOpacity
        testID="provider-trigger"
        style={[styles.select, open && styles.selectOpen]}
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${display || 'none selected'}`}
      >
        <View style={[styles.selectIcon, hasChoice && styles.selectIconOn]}>
          <Ionicons
            name={none ? 'build-outline' : 'storefront-outline'}
            size={18}
            color={hasChoice ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <Text testID="provider-display" style={[styles.selectText, !hasChoice && styles.placeholder]} numberOfLines={1}>
          {display || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      {showTextBox ? (
        <BoxInput
          testID="provider-textbox"
          style={{ marginTop: SPACING.sm }}
          placeholder="Type the shop or mechanic name"
          value={value}
          onChangeText={onChange}
          maxLength={100}
          autoFocus={typing}
        />
      ) : null}

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <Pressable testID="provider-backdrop" style={styles.backdrop} onPress={close}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.avoider}
            pointerEvents="box-none"
          >
            <Pressable
              testID="provider-sheet"
              style={[styles.sheet, { paddingBottom: SPACING.lg + bottomInset }]}
              onPress={() => {}}
            >
              <View style={styles.grabber} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderText}>
                  <Text testID="provider-title" style={styles.sheetTitle}>{title}</Text>
                  <Text style={styles.sheetSubtitle}>Your own shops and mechanics</Text>
                </View>
                <TouchableOpacity
                  testID="provider-close"
                  style={styles.closeBtn}
                  onPress={close}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {showSearch ? (
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={16} color={COLORS.textMuted} />
                  <TextInput
                    testID="provider-search"
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search your shops"
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
                style={styles.list}
                data={visible}
                keyExtractor={(p) => `${p.kind}:${providerKey(p.name)}`}
                renderItem={renderProvider}
                ListHeaderComponent={header}
                ListEmptyComponent={empty}
                ListFooterComponent={footer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ----- the closed field -----
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.md,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectOpen: { borderColor: COLORS.borderFocus },
  selectIcon: {
    width: 32,
    height: 32,
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: SPACING.md,
  },
  selectIconOn: { backgroundColor: COLORS.primaryMuted },
  selectText: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },
  placeholder: { color: COLORS.textMuted },

  // ----- the sheet -----
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: SPACING.sm,
    maxHeight: '78%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  sheetHeaderText: { flex: 1 },
  sheetTitle: { ...TYPOGRAPHY.subtitle },
  sheetSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
  },
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
  list: { flexGrow: 0 },
  section: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },

  // ----- rows -----
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  rowSelected: { backgroundColor: COLORS.primaryMuted },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
    marginRight: SPACING.md,
  },
  avatarAccent: { backgroundColor: COLORS.primaryMuted },
  avatarSelected: { backgroundColor: COLORS.surface },
  rowBody: { flex: 1 },
  rowTitle: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary },
  rowTitleOn: { color: COLORS.primary, fontWeight: '700' },
  rowCaption: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 2 },
  pill: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADII.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginLeft: SPACING.sm,
    marginRight: SPACING.xs,
  },
  pillText: { ...TYPOGRAPHY.captionBold, color: COLORS.primary },

  // ----- empty / loading / error -----
  note: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  noteTitle: { ...TYPOGRAPHY.bodyBold, marginTop: SPACING.sm },
  noteText: { ...TYPOGRAPHY.bodySm, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
  retry: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  retryText: { ...TYPOGRAPHY.bodyBold, color: COLORS.primary },
});