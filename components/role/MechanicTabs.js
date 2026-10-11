import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MechanicVehicles from './MechanicVehicles';
import RoleProfile from './RoleProfile';
import { roleTabOptions } from './RoleUI';

const Tab = createBottomTabNavigator();

const ICONS = {
  Vehicles: { active: 'car', inactive: 'car-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

// Mechanic dashboard: only the vehicles owners have shared with this mechanic.
export default function MechanicTabs() {
  return (
    <Tab.Navigator initialRouteName="Vehicles" screenOptions={roleTabOptions(ICONS)}>
      <Tab.Screen name="Vehicles" component={MechanicVehicles} />
      <Tab.Screen name="Profile" component={RoleProfile} />
    </Tab.Navigator>
  );
}