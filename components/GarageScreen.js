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
import { supabase } from '../lib/supabase';

const BACKGROUND = '#0F0E11';
// Tonal app-bar surface shared with HomeScreen/AddVehicle.
const APPBAR_SURFACE = '#1A191D';
const CARD_BG = '#1c1c1e';
const ACCENT = '#37C2DF';
const BORDER = 'rgba(255,255,255,0.15)';
const TEXT_MUTED = 'rgba(255,255,255,0.5)';

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
  const insets = useSafeAreaInsets();

  const statusBarOffset =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : insets.top;

  const [vehicles, setVehicles] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const loadVehicles = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error getting user:', userError);
        Alert.alert('Error', userError.message);
        return;
      }

      if (!user) {
        setVehicles([]);
        setActiveId(null);
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading vehicles:', error);
        Alert.alert('Vehicle Loading Failed', error.message);
        return;
      }

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
            ? `${Number(vehicle.current_mileage).toLocaleString()} km`
            : '0 km',
        // Original Supabase row, passed on when the vehicle is selected
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
            <Ionicons name="car" size={18} color={ACCENT} />
          </View>
          <View>
            <Text style={styles.brandLabel}>ArchiveAuto</Text>
            <Text style={styles.topBarTitle}>Garage</Text>
          </View>
        </View>
        <Touchable style={styles.avatarButton} borderless rippleColor="rgba(255,255,255,0.15)">
          <Ionicons name="person" size={17} color="#FFFFFF" />
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
                        color={ACCENT}
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
                    color={isSelected ? ACCENT : TEXT_MUTED}
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
                <Ionicons name="add" size={18} color={TEXT_MUTED} />
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
    backgroundColor: BACKGROUND,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: APPBAR_SURFACE,
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
    backgroundColor: 'rgba(55, 194, 223, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(55, 194, 223, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLabel: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.15,
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: undefined }),
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  countText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  selectHintText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardActive: {
    borderColor: ACCENT,
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
    gap: 8,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#2a2a2d',
    borderWidth: 1,
    borderColor: BORDER,
  },
  badgePrimary: {
    backgroundColor: 'rgba(55, 194, 223, 0.12)',
    borderColor: 'rgba(55, 194, 223, 0.35)',
  },
  badgeText: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeTextPrimary: {
    color: ACCENT,
  },
  cardSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardBrandModel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TEXT_MUTED,
  },
  cardYear: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: '#2a2a2d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '500',
  },
  addCard: {
    borderWidth: 1,
    borderColor: BORDER,
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
    backgroundColor: '#2a2a2d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addCardLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '500',
  },
});