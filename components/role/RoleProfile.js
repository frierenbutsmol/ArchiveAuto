import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../constants/theme';
import { api } from '../../lib/api';
import Avatar from '../Avatar';

// Profile tab for admins. It uses the same design as the vehicle owner's
// Profile (components/ProfileScreen.js): header, profile card, then a menu card with
// icon rows. Only the menu items and the number under the name differ by role.
export default function RoleProfile() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api.auth.getUser().then(({ data }) => {
        setUser(data?.user || null);
      });
    }, [])
  );

  const signOut = async () => {
    const { error } = await api.auth.signOut();
    if (error) {
      Alert.alert('Sign Out Failed', error.message);
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'Do you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);

  const menuItems = [
    {
      id: 'account',
      icon: 'person-circle-outline',
      label: 'Account information',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'logout',
      icon: 'log-out-outline',
      label: 'Sign Out',
      isDanger: true,
      onPress: confirmSignOut,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Just Profile */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card: name and email */}
        <View style={styles.profileCard}>
          <Avatar value={user?.avatar_url} size={68} style={{ marginBottom: SPACING.md }} />

          <Text style={styles.userName}>{user ? user.display_name || 'User' : 'Loading...'}</Text>
          <Text style={[styles.userEmail, { marginBottom: 0 }]}>
            {user?.email || ''}
          </Text>

        </View>

        {/* Menu */}
        <View style={styles.cardGroup}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuRow,
                index !== menuItems.length - 1 && styles.menuRowDivider,
              ]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View
                style={[
                  styles.iconCircle,
                  item.isDanger && {
                    backgroundColor: COLORS.dangerMuted,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={
                    item.isDanger
                      ? COLORS.danger
                      : COLORS.primary
                  }
                />
              </View>

              <Text
                style={[
                  styles.menuLabel,
                  item.isDanger && styles.menuLabelDanger,
                ]}
              >
                {item.label}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  item.isDanger
                    ? COLORS.danger
                    : COLORS.textMuted
                }
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Same styles as the vehicle owner's Profile screen.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: 90,
  },
  header: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: 'rgba(55, 194, 223, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 4,
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  cardGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontSize: 14,
  },
  menuLabelDanger: {
    color: COLORS.danger,
  },
});