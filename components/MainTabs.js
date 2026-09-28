import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import GarageScreen from './GarageScreen';
import AIChat from './AIChat';
import Notification from './Notification';
import ProfileScreen from './ProfileScreen';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

// Matches the icon assignments shown in the Garage-screen mockups' bottom
// nav: home / directions_car / auto_awesome / notifications / person_outline.
// Ionicons' closest match for "auto_awesome" (a sparkle/magic icon, fitting
// for an AI chat tab) is "sparkles".
const ICON_NAMES = {
  Garage: { active: 'car', inactive: 'car-outline' },
  Home: { active: 'home', inactive: 'home-outline' },
  Chat: { active: 'sparkles', inactive: 'sparkles-outline' },
  Alerts: { active: 'notifications', inactive: 'notifications-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
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
      <Tab.Screen name="Garage" component={GarageScreen} />
      <Tab.Screen name="Chat" component={AIChat} />
      <Tab.Screen name="Alerts" component={Notification} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 82 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
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