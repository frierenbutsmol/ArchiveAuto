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
import PartsReplacement from './components/PartsReplacement';
import AddPart from './components/AddPart';
import VehicleDocuments from './components/VehicleDocuments';
import AddDocument from './components/AddDocument';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef(null);
  // null while we check for a saved login; then 'MainTabs' (logged in) or 'SignIn'.
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
    api.auth
      .hasSession()
      .then((has) => setInitialRoute(has ? 'MainTabs' : 'SignIn'))
      .catch(() => setInitialRoute('SignIn'));
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
          name="PartsReplacement"
          component={PartsReplacement}
        />

        <Stack.Screen
          name="AddPart"
          component={AddPart}
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