import React, { useState } from 'react';
import { TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { api } from '../lib/api';

// A small trash button: asks "are you sure?", deletes on the server, then calls onDeleted(id).
//   <DeleteButton resource="repairs" id={item.id} name={item.title} onDeleted={...} />
// resource: 'vehicles' | 'maintenance_records' | 'repairs' | 'parts_replacements' | 'documents'
export default function DeleteButton({
  resource,
  id,
  name = 'This item',
  message = 'This cannot be undone.',
  onDeleted,
  size = 20,
  style,
}) {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    const { error } = await api.remove(resource, id);
    setBusy(false);
    if (error) {
      Alert.alert('Delete failed', error.message || 'Please try again.');
      return;
    }
    onDeleted?.(id);
  };

  const confirm = () =>
    Alert.alert(`Delete "${name}"?`, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);

  return (
    <TouchableOpacity
      onPress={confirm}
      disabled={busy}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={`Delete ${name}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={COLORS.danger} />
      ) : (
        <Ionicons name="trash-outline" size={size} color={COLORS.danger} />
      )}
    </TouchableOpacity>
  );
}