import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableNativeFeedback,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { useSettings } from '../lib/settings';
import { formatDistance, displayToKm, kmToDisplay, distanceUnit } from '../lib/units';
import { api } from '../lib/api';

// Same type -> icon mapping as AddVehicle.js (MaterialCommunityIcons, since
// Ionicons has no motorcycle/van/truck icons).
const TYPE_ICONS = {
  car: 'car',
  motorcycle: 'motorbike',
  van: 'van-passenger',
  truck: 'truck',
};

// Real Material ripple on Android; opacity dimming on iOS.
// The caller's style goes on the touchable's child so it shrink-wraps its
// content; the outer View only clips the ripple to the border radius.
function Touchable({ onPress, style, children, rippleColor, borderless = false }) {
  if (Platform.OS === 'android') {
    const flatStyle = StyleSheet.flatten(style) || {};
    return (
      <View style={{ borderRadius: flatStyle.borderRadius, overflow: 'hidden' }}>
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple(
            rippleColor || 'rgba(255,255,255,0.08)',
            borderless
          )}
        >
          <View style={style}>{children}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity style={style} activeOpacity={0.85} onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
}

export default function GarageScreen({ navigation }) {
  const { useMetric } = useSettings();
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const [vehicles, setVehicles] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const loadVehicles = async () => {
    try {
      // The server already knows who is logged in from the saved token.
      const { data: vehicleRows, error } = await api.list('vehicles');

      if (error) {
        console.error('Error loading vehicles:', error);
        Alert.alert('Vehicle Loading Failed', error.message);
        return;
      }

      // Oldest vehicle first, same order the Garage used before.
      const data = [...(vehicleRows || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      const formattedVehicles = (data || []).map((vehicle) => ({
        id: vehicle.id,
        type: vehicle.vehicle_type?.toLowerCase(),
        name: vehicle.nickname || `${vehicle.make} ${vehicle.series}`,
        brand: vehicle.make,
        model: vehicle.series,
        year: vehicle.year,
        plate: vehicle.plate_number || 'No plate',
        fuel: vehicle.fuel_type || 'Not specified',
        mileage:
          vehicle.current_mileage != null
            ? formatDistance(vehicle.current_mileage, useMetric)
            : formatDistance(0, useMetric),
        // Original database row, passed on when the vehicle is selected
        databaseVehicle: vehicle,
      }));

      setVehicles(formattedVehicles);

      // Keep the current selection if it still exists, else use the first vehicle.
      setActiveId((currentActiveId) => {
        if (formattedVehicles.length === 0) return null;
        const stillExists = formattedVehicles.some((v) => v.id === currentActiveId);
        return stillExists ? currentActiveId : formattedVehicles[0].id;
      });
    } catch (error) {
      console.error('Unexpected error loading vehicles:', error);
      Alert.alert('Error', 'Something went wrong while loading your vehicles.');
    }
  };

  // Reload every time Garage becomes visible
  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [])
  );

  const handleSelectVehicle = (vehicle) => {
    setActiveId(vehicle.id);

    navigation.navigate('MainTabs', {
      screen: 'Home',
      params: {
        selectedVehicle: vehicle.databaseVehicle,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top bar */}
      <View style={[styles.topBar, { marginTop: statusBarOffset }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.brandIcon}>
            <Ionicons name="car" size={18} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.brandLabel}>ArchiveAuto</Text>
            <Text style={styles.topBarTitle}>Garage</Text>
          </View>
        </View>
        <Touchable style={styles.avatarButton} borderless rippleColor="rgba(255,255,255,0.15)">
          <Ionicons name="person" size={17} color={COLORS.textPrimary} />
        </Touchable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Count row */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>Vehicles ({vehicles.length})</Text>
          {vehicles.length > 1 && (
            <Text style={styles.selectHintText}>Tap a vehicle to select it</Text>
          )}
        </View>

        <View style={styles.list}>
          {vehicles.map((vehicle) => {
            const isSelected = vehicle.id === activeId;

            return (
              <Touchable
                key={vehicle.id}
                style={[styles.card, isSelected && styles.cardActive]}
                onPress={() => handleSelectVehicle(vehicle)}
                rippleColor="rgba(255,255,255,0.06)"
              >
                <View style={styles.cardInner}>
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.cardIconWrapper,
                        isSelected && styles.cardIconWrapperActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={TYPE_ICONS[vehicle.type] || TYPE_ICONS.car}
                        size={22}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.cardTextBlock}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {vehicle.name}
                        </Text>
                        {isSelected && (
                          <View style={[styles.badge, styles.badgePrimary]}>
                            <Text style={[styles.badgeText, styles.badgeTextPrimary]}>
                              Active
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.cardSubtitleRow}>
                        <Text style={styles.cardBrandModel} numberOfLines={1}>
                          {vehicle.brand} · {vehicle.model}
                        </Text>
                        <View style={styles.dot} />
                        <Text style={styles.cardYear}>{vehicle.year}</Text>
                      </View>

                      <View style={styles.tagsRow}>
                        <View style={styles.tagPill}>
                          <Text style={styles.tagText}>{vehicle.plate}</Text>
                        </View>
                        <View style={styles.tagPill}>
                          <Text style={styles.tagText}>{vehicle.fuel}</Text>
                        </View>
                        <View style={styles.tagPill}>
                          <Text style={styles.tagText}>{vehicle.mileage}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isSelected ? COLORS.primary : COLORS.textMuted}
                  />
                </View>
              </Touchable>
            );
          })}

          {/* Add vehicle */}
          <Touchable
            style={styles.addCard}
            onPress={() => navigation.navigate('AddVehicle')}
            rippleColor="rgba(255,255,255,0.06)"
          >
            <View style={styles.addCardInner}>
              <View style={styles.addIconWrapper}>
                <Ionicons name="add" size={18} color={COLORS.textMuted} />
              </View>
              <Text style={styles.addCardLabel}>Add New Vehicle</Text>
            </View>
          </Touchable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceElevated,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(55, 194, 223, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.15,
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 100,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: 2,
  },
  countText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  selectHintText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  list: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardActive: {
    borderColor: COLORS.primary,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 194, 223, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(55, 194, 223, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIconWrapperActive: {
    backgroundColor: 'rgba(55, 194, 223, 0.14)',
    borderColor: 'rgba(55, 194, 223, 0.35)',
  },
  cardTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: SPACING.sm,
  },
  cardName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  badge: {
    borderRadius: RADII.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgePrimary: {
    backgroundColor: 'rgba(55, 194, 223, 0.12)',
    borderColor: 'rgba(55, 194, 223, 0.35)',
  },
  badgeText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeTextPrimary: {
    color: COLORS.primary,
  },
  cardSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardBrandModel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
  },
  cardYear: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADII.sm,
  },
  tagText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  addCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 14,
  },
  addCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  addIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm + 2,
  },
  addCardLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});