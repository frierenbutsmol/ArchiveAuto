import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminUsers from './AdminUsers';
import AdminStats from './AdminStats';
import AdminAudit from './AdminAudit';
import RoleProfile from './RoleProfile';
import { roleTabOptions } from './RoleUI';

const Tab = createBottomTabNavigator();

const ICONS = {
  Users: { active: 'people', inactive: 'people-outline' },
  Stats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Audit: { active: 'document-text', inactive: 'document-text-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

// Admin dashboard: accounts and roles, system statistics, and the audit log.
// Admins never see owners' vehicles or records (the server does not allow it).
export default function AdminTabs() {
  return (
    <Tab.Navigator initialRouteName="Users" screenOptions={roleTabOptions(ICONS)}>
      <Tab.Screen name="Users" component={AdminUsers} />
      <Tab.Screen name="Stats" component={AdminStats} />
      <Tab.Screen name="Audit" component={AdminAudit} />
      <Tab.Screen name="Profile" component={RoleProfile} />
    </Tab.Navigator>
  );
}