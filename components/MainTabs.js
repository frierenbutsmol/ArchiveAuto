import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import AIChat from './AIChat';
import ProfileScreen from './ProfileScreen';
import { COLORS } from '../constants/theme';
import { useBottomInset } from '../lib/useBottomInset';

const Tab = createBottomTabNavigator();

// The three main tabs: Home, AI Chat and Profile.
// Garage opens from the swap icon on Home (or "My Garage" in Profile), and
// Notifications opens from the bell on Home (or "Notifications" in Profile).
const ICON_NAMES = {
  Home: { active: 'home', inactive: 'home-outline' },
  Chat: { active: 'sparkles', inactive: 'sparkles-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export default function MainTabs() {
  // Lift the bar above the phone's Back/Home buttons (or gesture bar)
  const bottomInset = useBottomInset();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [styles.tabBar, { height: 68 + bottomInset, paddingBottom: 8 + bottomInset }],
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ color, focused }) => (
          // The Figma specs for both the Chat and Notifications screens show
          // the active tab's icon sitting inside an accent-tinted circle, so
          // that highlight is applied to whichever tab is focused.
          <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
            <Ionicons
              name={focused ? ICON_NAMES[route.name].active : ICON_NAMES[route.name].inactive}
              size={24}
              color={color}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={AIChat} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(55, 194, 223, 0.3)',
  },
});