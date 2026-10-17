import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { api } from './lib/api';
import { COLORS } from './constants/theme';

import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ResetPassword from './components/ResetPassword';
import UpdatePassword from './components/UpdatePassword';
import MainTabs from './components/MainTabs';
import GarageScreen from './components/GarageScreen';
import AddVehicle from './components/AddVehicle';
import SettingsScreen from './components/SettingsScreen';
import InfoScreen from './components/InfoScreen';
import Notification from './components/Notification';
import MaintenanceList from './components/MaintenanceList';
import AddMaintenance from './components/AddMaintenance';
import RepairList from './components/RepairList';
import AddRepair from './components/AddRepair';
import VehicleDocuments from './components/VehicleDocuments';
import AddDocument from './components/AddDocument';
import MechanicTabs from './components/role/MechanicTabs';
import MechanicVehicleDetail from './components/role/MechanicVehicleDetail';
import MechanicAddRecord from './components/role/MechanicAddRecord';
import AdminTabs from './components/role/AdminTabs';
import ShareVehicle from './components/role/ShareVehicle';
import { routeForRole } from './lib/roles';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef(null);
  // null while we check for a saved login; then the role's start screen
  // ('MainTabs' | 'MechanicTabs' | 'AdminTabs') or 'SignIn'.
  const [initialRoute, setInitialRoute] = useState(null);

  // Reset links look like: archiveauto://reset-password?token=XXXX
  const handleDeepLink = (url) => {
    if (!url || !url.includes('reset-password')) return;

    const match = url.match(/[?&]token=([^&#]+)/);
    if (!match) return;

    navigationRef.current?.navigate('UpdatePassword', {
      token: decodeURIComponent(match[1]),
    });
  };

  useEffect(() => {
    // Skip the Sign In screen when a login token is already saved.
    // Ask the server for the current role, so a role change made by an admin
    // takes effect on the next app start. Offline: fall back to the last known role.
    (async () => {
      try {
        if (!(await api.auth.hasSession())) return setInitialRoute('SignIn');
        const { data, error } = await api.auth.getUser();
        if (data?.user) return setInitialRoute(routeForRole(data.user.role));
        if (error?.status === 401) return setInitialRoute('SignIn');
        const cached = await api.auth.cachedRole();
        setInitialRoute(routeForRole(cached));
      } catch {
        setInitialRoute('SignIn');
      }
    })();
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // If the login token expires or is rejected, send the user back to Sign In.
    const stopExpiry = api.auth.onSessionExpired(() => {
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'SignIn' }] });
    });

    return () => {
      subscription.remove();
      stopExpiry();
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => Linking.getInitialURL().then(handleDeepLink)}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>

        <Stack.Screen
          name="SignIn"
          component={SignIn}
        />

        <Stack.Screen
          name="SignUp"
          component={SignUp}
        />

        <Stack.Screen
          name="ResetPassword"
          component={ResetPassword}
        />

        <Stack.Screen
          name="UpdatePassword"
          component={UpdatePassword}
        />

        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />

        <Stack.Screen
          name="MechanicTabs"
          component={MechanicTabs}
        />

        <Stack.Screen
          name="MechanicVehicleDetail"
          component={MechanicVehicleDetail}
        />

        <Stack.Screen
          name="MechanicAddRecord"
          component={MechanicAddRecord}
          options={{ presentation: 'modal' }}
        />

        <Stack.Screen
          name="AdminTabs"
          component={AdminTabs}
        />

        <Stack.Screen
          name="ShareVehicle"
          component={ShareVehicle}
        />

        <Stack.Screen
          name="Garage"
          component={GarageScreen}
        />

        <Stack.Screen
          name="AddVehicle"
          component={AddVehicle}
          options={{ presentation: 'modal' }}
        />

        <Stack.Screen
          name="Notification"
          component={Notification}
        />

        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
        />

        <Stack.Screen
          name="Info"
          component={InfoScreen}
        />

        <Stack.Screen
          name="MaintenanceList"
          component={MaintenanceList}
        />

        <Stack.Screen
          name="AddMaintenance"
          component={AddMaintenance}
          options={{ presentation: 'modal' }}
        />

        <Stack.Screen
          name="RepairList"
          component={RepairList}
        />

        <Stack.Screen
          name="AddRepair"
          component={AddRepair}
          options={{ presentation: 'modal' }}
        />

        <Stack.Screen
          name="VehicleDocuments"
          component={VehicleDocuments}
        />

        <Stack.Screen
          name="AddDocument"
          component={AddDocument}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}