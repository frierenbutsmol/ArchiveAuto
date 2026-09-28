import React, { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { supabase } from './lib/supabase';

import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ResetPassword from './components/ResetPassword';
import UpdatePassword from './components/UpdatePassword';
import MainTabs from './components/MainTabs';
import GarageScreen from './components/GarageScreen';
import AddVehicle from './components/AddVehicle';
import SettingsScreen from './components/SettingsScreen';
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

  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;

      console.log('Deep link received:', url);

      const hash = url.split('#')[1];

      if (!hash) {
        return;
      }

      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (type !== 'recovery') {
        return;
      }

      if (!accessToken || !refreshToken) {
        console.log('Reset link is missing session information.');
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.log(
          'Failed to create recovery session:',
          error.message
        );
        return;
      }

      navigationRef.current?.navigate('UpdatePassword');
    };

    Linking.getInitialURL().then(handleDeepLink);

    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        handleDeepLink(url);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

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