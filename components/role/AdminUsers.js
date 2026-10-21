import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, RefreshControl, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ROLE_LABELS } from '../../lib/roles';
import { ScreenHeader, RolePill, PrimaryButton, EmptyState, ErrorBanner, ui } from './RoleUI';

const ROLE_ORDER = ['user', 'admin'];

// Admin: every account, with a role picker and delete.
export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [list, who] = await Promise.all([api.admin.users({ limit: 100 }), api.auth.getUser()]);
    setError(list.error ? list.error.message : '');
    if (list.data) setUsers(list.data);
    else setUsers((u) => u || []);
    if (who.data?.user) setMe(who.data.user.id);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const changeRole = async (role) => {
    if (!selected || role === selected.role) return;
    setBusy(true);
    const { data, error: err } = await api.admin.setRole(selected.id, role);
    setBusy(false);
    if (err) return Alert.alert('Could not change role', err.message);
    setUsers((list) => list.map((u) => (u.id === data.id ? data : u)));
    setSelected(null);
  };

  const confirmDelete = () => {
    const target = selected;
    Alert.alert(
      'Delete account',
      `Permanently delete ${target.email || 'this account'} and all of its vehicles and records? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error: err } = await api.admin.deleteUser(target.id);
            setBusy(false);
            if (err) return Alert.alert('Could not delete', err.message);
            setUsers((list) => list.filter((u) => u.id !== target.id));
            setSelected(null);
          },
        },
      ]
    );
  };

  const isSelf = selected && selected.id === me;

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Users" subtitle={users ? `${users.length} accounts` : 'Manage accounts and roles'} />

      {users === null ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={ui.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListHeaderComponent={<ErrorBanner message={error} onRetry={load} />}
          ListEmptyComponent={!error ? <EmptyState icon="people-outline" text="No users found." /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={ui.card} activeOpacity={0.85} onPress={() => setSelected(item)}>
              <View style={ui.rowBetween}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={ui.cardTitle} numberOfLines={1}>
                    {item.display_name || 'No name'}{item.id === me ? '  (you)' : ''}
                  </Text>
                  <Text style={ui.cardMeta} numberOfLines={1}>{item.email}</Text>
                </View>
                <RolePill role={item.role} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
            <Text style={ui.cardTitle}>{selected?.display_name || 'No name'}</Text>
            <Text style={ui.cardMeta}>{selected?.email}</Text>

            <Text style={ui.label}>Role</Text>
            <View style={ui.chipRow}>
              {ROLE_ORDER.map((r) => (
                <TouchableOpacity
                  key={r}
                  disabled={busy || isSelf}
                  onPress={() => changeRole(r)}
                  style={[ui.chip, selected?.role === r && ui.chipActive, isSelf && { opacity: 0.5 }]}>
                  <Text style={[ui.chipText, selected?.role === r && ui.chipTextActive]}>{ROLE_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {isSelf ? <Text style={ui.cardMuted}>You cannot change or delete your own account.</Text> : null}

            {!isSelf ? <PrimaryButton label="Delete account" icon="trash-outline" variant="danger" onPress={confirmDelete} disabled={busy} style={{ marginTop: 20 }} /> : null}
            <PrimaryButton label="Close" variant="outline" onPress={() => setSelected(null)} style={{ marginTop: 12 }} />
            {busy ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} /> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}