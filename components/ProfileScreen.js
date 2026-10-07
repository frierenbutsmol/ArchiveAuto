import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { api } from '../lib/api';

export default function ProfileScreen() {
  const navigation = useNavigation();

  const [user, setUser] = useState({
    name: 'Loading...',
    email: '',
    avatarUrl: null,
    vehiclesCount: 0,
    recordsCount: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: authData, error: userError } = await api.auth.getUser();
      const authUser = authData?.user;

      if (userError || !authUser) {
        console.log('Failed to get user:', userError?.message);
        return;
      }

      const { data: vehicles, error: vehiclesError } = await api.list('vehicles');

      if (vehiclesError) {
        console.log('Failed to get vehicle count:', vehiclesError.message);
      }

      setUser({
        name: authUser.display_name || 'User',
        email: authUser.email || '',
        avatarUrl: authUser.avatar_url || null,
        vehiclesCount: vehicles?.length || 0,
        recordsCount: 0,
      });
    } catch (error) {
      console.log('Failed to load profile:', error.message);
    }
  };

  const handleSignOut = async () => {
    const { error } = await api.auth.signOut();

    if (error) {
      Alert.alert('Sign Out Failed', error.message);
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'SignIn' }],
    });
  };

  const menuItems = [
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Settings',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'faq',
      icon: 'help-circle-outline',
      label: 'Help & ArchiveAuto FAQ',
      onPress: () => navigation.navigate('Info', { page: 'faq' }),
    },
    {
      id: 'logout',
      icon: 'log-out-outline',
      label: 'Sign Out',
      isDanger: true,
      onPress: handleSignOut,
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

        {/* Profile Card: Name and email only, 2 stats (Vehicles & Records) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={32} color={COLORS.primary} />
            )}
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          {/* 2 Stats: Vehicles and Records */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.vehiclesCount}</Text>
              <Text style={styles.statLabel}>Vehicles</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.recordsCount}</Text>
              <Text style={styles.statLabel}>Records</Text>
            </View>
          </View>
        </View>

        {/* Menu: Settings, Help & FAQ, Sign Out */}
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
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
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