import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { api } from '../lib/api';

// users.avatar_url is one of:
//   'file:<id>'  a photo the user uploaded (stored by the server, see api.files)
//   'https://…'  an old link from before the server move
//   empty        no photo
export const FILE_PREFIX = 'file:';

export const fileIdOf = (value) =>
  typeof value === 'string' && value.startsWith(FILE_PREFIX) && /^[a-f0-9]{24}$/.test(value.slice(FILE_PREFIX.length))
    ? value.slice(FILE_PREFIX.length)
    : null;

// Stored photos are private, so the server hands out a short-lived link for each one.
function useAvatarUri(value) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let alive = true;
    setUri(null);
    if (!value) return undefined;

    if (/^https?:\/\//i.test(value)) {
      setUri(value);
      return undefined;
    }
    const id = fileIdOf(value);
    if (id) {
      api.files.link(id).then(({ data }) => {
        if (alive && data?.url) setUri(data.url);
      });
    }
    return () => { alive = false; };
  }, [value]);

  return uri;
}

// A round profile picture. Pass `value` (the saved avatar_url), or `localUri` to preview a
// photo that was just picked and is not saved yet. Falls back to a person icon.
export default function Avatar({ value, localUri, size = 68, style }) {
  const remote = useAvatarUri(localUri ? null : value);
  const [failed, setFailed] = useState(false);
  const shown = localUri || remote;

  useEffect(() => { setFailed(false); }, [shown]);

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {shown && !failed ? (
        <Image source={{ uri: shown }} style={styles.image} onError={() => setFailed(true)} />
      ) : (
        <Ionicons name="person" size={Math.round(size * 0.47)} color={COLORS.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: 'rgba(55, 194, 223, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});