import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ResetPassword from './components/ResetPassword';
import MainTabs from './components/MainTabs';
import AddVehicle from './components/AddVehicle';
import AddMaintenance from './components/AddMaintenance';
import AddRepair from './components/AddRepair';
import Documents from './components/Documents';
import VehicleDetails from './components/VehicleDetails';
import MaintenanceHistory from './components/MaintenanceHistory';
import RepairLog from './components/RepairLog';
import PartsReplaced from './components/PartsReplaced';
import SettingsScreen from './components/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignIn" component={SignIn} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="AddVehicle"
          component={AddVehicle}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AddMaintenance"
          component={AddMaintenance}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AddRepair"
          component={AddRepair}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Documents"
          component={Documents}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="VehicleDetails" component={VehicleDetails} />
        <Stack.Screen name="MaintenanceHistory" component={MaintenanceHistory} />
        <Stack.Screen name="RepairLog" component={RepairLog} />
        <Stack.Screen name="PartsReplaced" component={PartsReplaced} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}