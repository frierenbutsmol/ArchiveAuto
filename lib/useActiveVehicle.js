import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const SELECTED_VEHICLE_KEY = '@archiveauto_selected_vehicle';   // saved by the Home screen

// The vehicle a form should save to:
//   1. the one the form was opened with, if any;
//   2. otherwise the vehicle currently chosen on Home;
//   3. otherwise the user's first vehicle.
// Returns null while it is still looking (or if the user has no vehicle at all).
export function useActiveVehicle(passed) {
  const [found, setFound] = useState(null);

  useEffect(() => {
    if (passed?.id) return undefined;   // already have one, nothing to look up
    let alive = true;

    (async () => {
      let vehicle = null;
      try {
        const saved = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY);
        if (saved) vehicle = JSON.parse(saved);
      } catch (e) {
        // a damaged saved value is ignored; fall through to the first vehicle
      }
      if (!vehicle?.id) {
        const { data } = await api.firstVehicle();
        vehicle = data || null;
      }
      if (alive && vehicle?.id) setFound(vehicle);
    })();

    return () => { alive = false; };
  }, [passed?.id]);

  return passed?.id ? passed : found;
}