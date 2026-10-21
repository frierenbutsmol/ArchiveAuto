import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import { api } from '../../lib/api';
import { ScreenHeader, RolePill, PrimaryButton, ui } from './RoleUI';

// Profile tab for mechanics and admins: who is signed in, their role, and Sign Out.
export default function RoleProfile() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api.auth.getUser().then(({ data }) => setUser(data?.user || null));
    }, [])
  );

  const signOut = async () => {
    await api.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'Do you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={ui.content}>
        <View style={ui.card}>
          <Text style={ui.cardTitle}>{user?.display_name || 'Loading...'}</Text>
          <Text style={ui.cardMeta}>{user?.email || ''}</Text>
          <View style={{ marginTop: 12 }}>
            {user ? <RolePill role={user.role} /> : null}
          </View>
        </View>
        <PrimaryButton label="Sign Out" icon="log-out-outline" variant="danger" onPress={confirmSignOut} />
      </ScrollView>
    </SafeAreaView>
  );
}