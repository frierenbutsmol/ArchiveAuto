import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TouchableNativeFeedback,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { supabase } from '../lib/supabase';

const SELECTED_VEHICLE_KEY = '@archiveauto_selected_vehicle';

const Touchable = ({
  children,
  onPress,
  style,
  disabled = false,
}) => {
  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        disabled={disabled}
        background={TouchableNativeFeedback.Ripple(
          'rgba(255,255,255,0.10)',
          false
        )}
      >
        <View style={style}>{children}</View>
      </TouchableNativeFeedback>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={style}
      activeOpacity={0.8}
    >
      {children}
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation, route }) {
  const selected = route?.params?.selectedVehicle;

  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [recordCounts, setRecordCounts] = useState({
    maintenance: 0,
    repairs: 0,
    parts: 0,
    documents: 0,
  });

  const [reminder, setReminder] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [selected?.id])
  );

  const saveSelectedVehicle = async (vehicle) => {
    if (!vehicle?.id) return;

    try {
      await AsyncStorage.setItem(
        SELECTED_VEHICLE_KEY,
        JSON.stringify(vehicle)
      );
    } catch (error) {
      console.log(
        'Failed to save selected vehicle:',
        error.message
      );
    }
  };

  const loadHomeData = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log(
          'Failed to get current user:',
          userError?.message
        );
        setLoading(false);
        return;
      }

      let vehicle = selected;

      // If Home was opened without a selected vehicle,
      // try the previously selected vehicle first.
      if (!vehicle?.id) {
        try {
          const savedVehicle =
            await AsyncStorage.getItem(
              SELECTED_VEHICLE_KEY
            );

          if (savedVehicle) {
            const parsedVehicle =
              JSON.parse(savedVehicle);

            if (parsedVehicle?.id) {
              vehicle = parsedVehicle;
            }
          }
        } catch (error) {
          console.log(
            'Failed to load saved vehicle:',
            error.message
          );
        }
      }

      // If there is still no selected vehicle,
      // get the user's first vehicle from the database.
      if (!vehicle?.id) {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: true,
          })
          .limit(1)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.log(
              'Failed to load vehicle:',
              error.message
            );
          }

          setCurrentVehicle(null);
          setLoading(false);
          return;
        }

        vehicle = data;
      } else {
        // Make sure the selected vehicle is the current
        // database version.
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', vehicle.id)
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          vehicle = data;
        } else if (error) {
          // The previously selected vehicle may have
          // been deleted. Fall back to the first vehicle.
          console.log(
            'Selected vehicle could not be loaded:',
            error.message
          );

          const { data: fallbackVehicle } =
            await supabase
              .from('vehicles')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', {
                ascending: true,
              })
              .limit(1)
              .single();

          if (fallbackVehicle) {
            vehicle = fallbackVehicle;
          } else {
            setCurrentVehicle(null);
            setLoading(false);
            return;
          }
        }
      }

      setCurrentVehicle(vehicle);

      // Save the latest database version so AIChat
      // can use the same selected vehicle.
      await saveSelectedVehicle(vehicle);

      if (vehicle?.id) {
        await loadRecordCounts(vehicle.id);
      }
    } catch (error) {
      console.log(
        'Home loading error:',
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRecordCounts = async (vehicleId) => {
    try {
      const [
        maintenanceResult,
        repairsResult,
        partsResult,
        documentsResult,
      ] = await Promise.all([
        supabase
          .from('maintenance_records')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('vehicle_id', vehicleId),

        supabase
          .from('repairs')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('vehicle_id', vehicleId),

        supabase
          .from('parts_replacements')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('vehicle_id', vehicleId),

        supabase
          .from('documents')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('vehicle_id', vehicleId),
      ]);

      setRecordCounts({
        maintenance:
          maintenanceResult.count || 0,
        repairs:
          repairsResult.count || 0,
        parts:
          partsResult.count || 0,
        documents:
          documentsResult.count || 0,
      });
    } catch (error) {
      console.log(
        'Failed to load record counts:',
        error.message
      );
    }
  };

  const getVehicleTypeLabel = (type) => {
    if (!type) return 'Vehicle';

    return (
      type.charAt(0).toUpperCase() +
      type.slice(1)
    );
  };

  const hubItems = [
    {
      id: 'maintenance',
      icon: 'build-outline',
      title: 'Maintenance History',
      desc: 'Regular services, oil & filter checks',
      count: `${recordCounts.maintenance} records`,
      badgeColor: COLORS.primary,
      screen: 'MaintenanceList',
    },
    {
      id: 'repairs',
      icon: 'construct-outline',
      title: 'Repair Log',
      desc: 'Shop & dealer repairs with photo proof',
      count: `${recordCounts.repairs} records`,
      badgeColor: COLORS.success,
      screen: 'RepairList',
    },
    {
      id: 'parts',
      icon: 'cog-outline',
      title: 'Parts Replacement',
      desc: 'Brake pads, battery, belt replacements',
      count: `${recordCounts.parts} ${
        recordCounts.parts === 1
          ? 'item'
          : 'items'
      }`,
      badgeColor: COLORS.warning,
      screen: 'PartsReplacement',
    },
    {
      id: 'documents',
      icon: 'document-text-outline',
      title: 'Vehicle Documents',
      desc: 'OR/CR, Insurance policy, Warranties',
      count:
        recordCounts.documents > 0
          ? `${recordCounts.documents} files`
          : 'None',
      badgeColor: COLORS.primary,
      screen: 'VehicleDocuments',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentVehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />

        <View style={styles.emptyContainer}>
          <Ionicons
            name="car-outline"
            size={48}
            color={COLORS.textMuted}
          />

          <Text style={styles.emptyTitle}>
            No Vehicle Added
          </Text>

          <Text style={styles.emptyText}>
            Add a vehicle to start tracking its
            maintenance and records.
          </Text>

          <TouchableOpacity
            style={styles.addVehicleButton}
            onPress={() =>
              navigation.navigate('AddVehicle')
            }
            activeOpacity={0.85}
          >
            <Text
              style={
                styles.addVehicleButtonText
              }
            >
              Add Vehicle
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const vehicleNickname =
    currentVehicle.nickname ||
    `${currentVehicle.make} ${currentVehicle.series}`;

  const makeModel =
    `${currentVehicle.make || ''} ${
      currentVehicle.series || ''
    } ${currentVehicle.year || ''}`.trim();

  const plateNumber =
    currentVehicle.plate_number ||
    'No Plate';

  const mileage =
    `${Number(
      currentVehicle.current_mileage || 0
    ).toLocaleString()} km`;

  const fuelType =
    currentVehicle.fuel_type || 'Unknown';

  const vehicleType =
    getVehicleTypeLabel(
      currentVehicle.vehicle_type
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              navigation.navigate('Garage')
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="swap-horizontal"
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              Home
            </Text>
          </View>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() =>
                navigation.navigate(
                  'Notification'
                )
              }
              activeOpacity={0.8}
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={COLORS.textPrimary}
              />

              <View
                style={
                  styles.notifBadgeDot
                }
              />
            </TouchableOpacity>

            <View style={styles.avatar}>
              <MaterialCommunityIcons
                name="account-outline"
                size={21}
                color={COLORS.textPrimary}
              />
            </View>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.vehicleCard}>
          <Image
            source={require('../assets/bg_topo.png')}
            resizeMode="cover"
            style={styles.vehicleImage}
          />

          <View
            style={
              styles.vehicleCardOverlay
            }
          />

          <View
            style={styles.vehicleContent}
          >
            <View
              style={styles.vehicleTopRow}
            >
              <View
                style={styles.plateBadge}
              >
                <Text
                  style={styles.plateText}
                >
                  {plateNumber}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.editVehicleBtn
                }
                onPress={() =>
                  navigation.navigate(
                    'AddVehicle',
                    {
                      vehicleToEdit:
                        currentVehicle,
                      isEdit: true,
                    }
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="pencil"
                  size={13}
                  color={COLORS.primary}
                />

                <Text
                  style={
                    styles.editVehicleText
                  }
                >
                  Edit Info
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text
                style={styles.vehicleLabel}
              >
                My Garage
              </Text>

              <Text
                style={styles.vehicleNickname}
              >
                {vehicleNickname}
              </Text>

              <Text
                style={styles.vehicleName}
              >
                {makeModel}
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.vehicleInfoRow}>
          <View style={styles.infoPill}>
            <Ionicons
              name="car-outline"
              size={15}
              color={COLORS.primary}
            />

            <Text
              style={styles.infoPillText}
            >
              {vehicleType}
            </Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons
              name="speedometer-outline"
              size={15}
              color={COLORS.primary}
            />

            <Text
              style={styles.infoPillText}
            >
              {mileage}
            </Text>
          </View>
        </View>

        {/* Quick Snapshot */}
        <View style={styles.snapshotGrid}>
          <View
            style={styles.snapshotCard}
          >
            <View
              style={
                styles.snapshotHeader
              }
            >
              <Image
                source={require('../assets/ic_odometer.png')}
                resizeMode="contain"
                style={styles.snapshotIcon}
              />

              <Text
                style={styles.snapshotTitle}
              >
                Odometer
              </Text>
            </View>

            <Text
              style={styles.snapshotValue}
            >
              {mileage}
            </Text>
          </View>

          <View
            style={styles.snapshotCard}
          >
            <View
              style={
                styles.snapshotHeader
              }
            >
              <Image
                source={require('../assets/ic_fuel.png')}
                resizeMode="contain"
                style={styles.snapshotIcon}
              />

              <Text
                style={styles.snapshotTitle}
              >
                Fuel Type
              </Text>

              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.primary}
                style={
                  styles.verifiedIcon
                }
              />
            </View>

            <Text
              style={styles.snapshotValue}
            >
              {fuelType}
            </Text>
          </View>
        </View>

        {/* Maintenance Reminder */}
        <View
          style={styles.reminderBanner}
        >
          <View
            style={
              styles.reminderIconWrap
            }
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={COLORS.success}
            />
          </View>

          <View
            style={styles.reminderTextWrap}
          >
            <Text
              style={styles.reminderLabel}
            >
              Next Reminder
            </Text>

            <Text
              style={styles.reminderValue}
            >
              No upcoming reminders
            </Text>

            <Text
              style={styles.reminderSub}
            >
              All maintenance schedules are
              up to date
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View
          style={
            styles.quickActionsSection
          }
        >
          <Text
            style={styles.sectionHeader}
          >
            Quick Actions
          </Text>

          <View
            style={styles.actionBoxesRow}
          >
            <TouchableOpacity
              style={styles.actionBox}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate(
                  'AddMaintenance'
                )
              }
            >
              <View
                style={
                  styles.actionBoxIconWrap
                }
              >
                <Ionicons
                  name="build"
                  size={22}
                  color={COLORS.primary}
                />
              </View>

              <Text
                style={styles.actionBoxTitle}
              >
                Log Maintenance
              </Text>

              <Text
                style={styles.actionBoxSub}
              >
                Add service or oil change
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBox}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate(
                  'AddRepair'
                )
              }
            >
              <View
                style={
                  styles.actionBoxIconWrap
                }
              >
                <Ionicons
                  name="construct"
                  size={22}
                  color={COLORS.primary}
                />
              </View>

              <Text
                style={styles.actionBoxTitle}
              >
                Log Repair
              </Text>

              <Text
                style={styles.actionBoxSub}
              >
                Record repair & photo proof
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Records */}
        <View style={styles.hubSection}>
          <Text
            style={styles.sectionHeader}
          >
            Vehicle Records
          </Text>

          {hubItems.map((item) => (
            <Touchable
              key={item.id}
              style={styles.hubCard}
              onPress={() =>
                navigation.navigate(
                  item.screen
                )
              }
            >
              <View
                style={styles.hubIconWrap}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={COLORS.primary}
                />
              </View>

              <View
                style={
                  styles.hubCardContent
                }
              >
                <View
                  style={
                    styles.hubTitleRow
                  }
                >
                  <Text
                    style={
                      styles.hubTitle
                    }
                  >
                    {item.title}
                  </Text>

                  <View
                    style={[
                      styles.statusTag,
                      {
                        backgroundColor:
                          item.badgeColor +
                          '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        {
                          color:
                            item.badgeColor,
                        },
                      ]}
                    >
                      {item.count}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.hubDesc}
                >
                  {item.desc}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textMuted}
              />
            </Touchable>
          ))}
        </View>

        {/* Vehicle Info & Specs */}
        <View style={styles.extraSection}>
          <Text
            style={styles.sectionHeader}
          >
            Vehicle Info & Specs
          </Text>

          <View
            style={styles.specCard}
          >
            <View style={styles.specRow}>
              <Text
                style={styles.specLabel}
              >
                Vehicle Type
              </Text>

              <Text
                style={styles.specValue}
              >
                {vehicleType}
              </Text>
            </View>

            <View
              style={styles.specDivider}
            />

            <View style={styles.specRow}>
              <Text
                style={styles.specLabel}
              >
                Fuel Type
              </Text>

              <Text
                style={styles.specValue}
              >
                {fuelType}
              </Text>
            </View>

            <View
              style={styles.specDivider}
            />

            <View style={styles.specRow}>
              <Text
                style={styles.specLabel}
              >
                Plate Number
              </Text>

              <Text
                style={styles.specValue}
              >
                {plateNumber}
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle History */}
        <View style={styles.extraSection}>
          <Text
            style={styles.sectionHeader}
          >
            Vehicle History Report
          </Text>

          <View
            style={styles.historyCard}
          >
            <View
              style={styles.historyIconWrap}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View
              style={styles.historyContent}
            >
              <Text
                style={styles.historyTitle}
              >
                Complete Vehicle History
              </Text>

              <Text
                style={styles.historyText}
              >
                Review maintenance, repairs,
                parts, and documents recorded
                for this vehicle.
              </Text>
            </View>
          </View>
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

  scrollContent: {
    paddingHorizontal:
      SPACING.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: 90,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  notifBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 9,
    right: 9,
  },

  vehicleCard: {
    borderRadius: RADII.card,
    overflow: 'hidden',
    height: 175,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },

  vehicleImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  vehicleCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'rgba(15, 14, 17, 0.55)',
  },

  vehicleContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },

  vehicleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  plateBadge: {
    backgroundColor:
      'rgba(255, 255, 255, 0.15)',
    paddingHorizontal:
      SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  plateText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  editVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(55, 194, 223, 0.2)',
    paddingHorizontal:
      SPACING.sm + 4,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor:
      'rgba(55, 194, 223, 0.4)',
  },

  editVehicleText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },

  vehicleLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 3,
  },

  vehicleNickname: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },

  vehicleName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },

  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADII.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  infoPillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },

  snapshotGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },

  snapshotCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md + 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  snapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  snapshotIcon: {
    width: 16,
    height: 16,
    marginRight: SPACING.xs + 2,
  },

  snapshotTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  verifiedIcon: {
    marginLeft: 2,
  },

  snapshotValue: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor:
      'rgba(55, 194, 223, 0.25)',
  },

  reminderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor:
      'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  reminderTextWrap: {
    flex: 1,
  },

  reminderLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  reminderValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  reminderSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },

  quickActionsSection: {
    marginBottom: SPACING.xl,
  },

  sectionHeader: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  actionBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },

  actionBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  actionBoxIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADII.md,
    backgroundColor:
      COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  actionBoxTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },

  actionBoxSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },

  hubSection: {
    marginBottom: SPACING.xl,
  },

  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md + 2,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  hubIconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADII.md,
    backgroundColor:
      COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  hubCardContent: {
    flex: 1,
  },

  hubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },

  hubTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },

  statusTag: {
    paddingHorizontal:
      SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADII.xs,
  },

  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },

  hubDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
  },

  extraSection: {
    marginBottom: SPACING.xl,
  },

  specCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },

  specLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },

  specValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  specDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  historyIconWrap: {
    width: 46,
    height: 46,
    borderRadius: RADII.md,
    backgroundColor:
      COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  historyContent: {
    flex: 1,
  },

  historyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },

  historyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },

  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },

  addVehicleButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
  },

  addVehicleButtonText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});