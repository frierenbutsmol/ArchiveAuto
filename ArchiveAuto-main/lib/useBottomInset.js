import { useContext } from 'react';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';

// Height of the phone's bottom system area (Android's Back/Home/Recents buttons or
// gesture bar, iPhone's home indicator). The app draws edge-to-edge, so anything
// pinned to the bottom of the screen must add this to stay clear of those buttons.
// Returns 0 if the phone has no such area. Safe to call anywhere (never throws).
export function useBottomInset() {
  const insets = useContext(SafeAreaInsetsContext) || initialWindowMetrics?.insets;
  return insets?.bottom || 0;
}