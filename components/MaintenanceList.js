import React, { useState, useCallback } from 'react';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';

import {
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';

import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { COLORS, SPACING, RADII } from '../constants/theme';
import { useSettings } from '../lib/settings';
import { formatDistance, displayToKm, kmToDisplay, distanceUnit } from '../lib/units';
import { api, sortDesc } from '../lib/api';


export default function MaintenanceList({ navigation }) {
  const { useMetric } = useSettings();
  const route = useRoute();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState(
    route?.params?.selectedVehicle || null
  );


  // --------------------------------------------------
  // Ripple / Touchable helper
  // --------------------------------------------------

  const Touchable = ({
    children,
    onPress,
    style,
    disabled = false,
  }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
        android_ripple={{
          color:
            Platform.OS === 'android'
              ? 'rgba(255,255,255,0.08)'
              : undefined,
        }}
        style={style}
      >
        {children}
      </TouchableOpacity>
    );
  };


  // --------------------------------------------------
  // Load maintenance records
  // --------------------------------------------------

  const loadMaintenanceRecords = useCallback(async () => {
    setLoading(true);

    try {
      if (!(await api.auth.hasSession())) {
        setRecords([]);
        return;
      }


      // Get vehicle passed from previous screen
      let vehicle =
        route?.params?.selectedVehicle || null;


      // If no vehicle was passed,
      // get the user's first vehicle
      if (!vehicle) {
        const { data: vehicleData, error: vehicleError } = await api.firstVehicle();

        if (vehicleError) {
          console.error(
            'Vehicle error:',
            vehicleError
          );

          Alert.alert(
            'Error',
            'Could not load your vehicle.'
          );

          return;
        }

        vehicle = vehicleData;
      }


      // No vehicle
      if (!vehicle) {
        setSelectedVehicle(null);
        setRecords([]);
        return;
      }


      setSelectedVehicle(vehicle);


      // Get maintenance records
      const { data: rawData, error } = await api.list('maintenance_records', {
        vehicle_id: vehicle.id,
      });
      const data = sortDesc(rawData, 'service_date', 'created_at');


      if (error) {
        console.error(
          'Maintenance error:',
          error
        );

        Alert.alert(
          'Error',
          'Could not load your maintenance records.'
        );

        return;
      }


      // Format database records
      const formattedRecords = (data || []).map(
        (item) => ({
          id: item.id,

          title:
            item.description ||
            item.maintenance_type ||
            'Maintenance Service',

          date: item.service_date
            ? new Date(
                `${item.service_date}T00:00:00`
              ).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                }
              )
            : 'No date',

          odometer:
            item.mileage !== null &&
            item.mileage !== undefined
              ? formatDistance(item.mileage, useMetric)
              : 'No mileage',

          serviceType:
            item.maintenance_type ||
            'Maintenance',

          cost:
            item.cost !== null &&
            item.cost !== undefined
              ? `₱${Number(
                  item.cost
                ).toLocaleString()}`
              : '₱0',

          notes:
            item.notes || '',

          rawCost:
            item.cost !== null &&
            item.cost !== undefined
              ? Number(item.cost)
              : 0,
        })
      );


      setRecords(formattedRecords);

    } catch (error) {
      console.error(
        'Unexpected maintenance error:',
        error
      );

      Alert.alert(
        'Error',
        'Something went wrong while loading maintenance.'
      );

    } finally {
      setLoading(false);
    }
  }, [
    route?.params?.selectedVehicle,
  ]);


  // --------------------------------------------------
  // Refresh whenever screen gets focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      loadMaintenanceRecords();
    }, [loadMaintenanceRecords])
  );


  // --------------------------------------------------
  // Total spent
  // --------------------------------------------------

  const totalSpent = records.reduce(
    (total, item) =>
      total + item.rawCost,
    0
  );


  // --------------------------------------------------
  // Add maintenance
  // --------------------------------------------------

  const handleAddMaintenance = () => {
    if (!selectedVehicle) {
      Alert.alert(
        'No Vehicle',
        'Please add a vehicle first before adding maintenance records.'
      );

      return;
    }

    navigation.navigate(
      'AddMaintenance',
      {
        vehicle: selectedVehicle,
      }
    );
  };


  // --------------------------------------------------
  // Go back
  // --------------------------------------------------

  const handleGoBack = () => {
    navigation.goBack();
  };


  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>

      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />


      {/* =========================================
          APP BAR
      ========================================= */}

      <View style={styles.appBar}>

        <Touchable
          onPress={handleGoBack}
          style={styles.iconButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={COLORS.textPrimary}
          />
        </Touchable>


        <View style={styles.titleContainer}>

          <Text style={styles.appBarTitle}>
            Maintenance History
          </Text>

          {selectedVehicle && (
            <Text
              style={styles.vehicleSubtitle}
              numberOfLines={1}
            >
              {selectedVehicle.year
                ? `${selectedVehicle.year} `
                : ''}
              {selectedVehicle.make || ''}
              {selectedVehicle.model || ''}
            </Text>
          )}

        </View>


        <Touchable
          onPress={handleAddMaintenance}
          style={styles.iconButton}
        >
          <MaterialIcons
            name="add"
            size={24}
            color={COLORS.primary}
          />
        </Touchable>

      </View>


      {/* =========================================
          CONTENT
      ========================================= */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >


        {/* =====================================
            SUMMARY
        ===================================== */}

        <View style={styles.summaryCard}>

          {/* Services */}

          <View style={styles.summaryItem}>

            <View style={styles.summaryIcon}>
              <MaterialIcons
                name="build"
                size={18}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.summaryNumber}>
              {records.length}
            </Text>

            <Text style={styles.summaryLabel}>
              Total Services
            </Text>

          </View>


          <View style={styles.summaryDivider} />


          {/* Spent */}

          <View style={styles.summaryItem}>

            <View style={styles.summaryIcon}>
              <MaterialIcons
                name="payments"
                size={18}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={styles.summaryNumber}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ₱{totalSpent.toLocaleString()}
            </Text>

            <Text style={styles.summaryLabel}>
              Total Spent
            </Text>

          </View>


          <View style={styles.summaryDivider} />


          {/* Next Due */}

          <View style={styles.summaryItem}>

            <View style={styles.summaryIcon}>
              <MaterialIcons
                name="event"
                size={18}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.summaryNumber}>
              —
            </Text>

            <Text style={styles.summaryLabel}>
              Next Due
            </Text>

          </View>

        </View>


        {/* =====================================
            SECTION TITLE
        ===================================== */}

        <View style={styles.sectionHeader}>

          <View>
            <Text style={styles.sectionTitle}>
              Service Records
            </Text>

            <Text style={styles.sectionSubtitle}>
              Your vehicle maintenance history
            </Text>
          </View>


          <Text style={styles.recordCount}>
            {records.length}
          </Text>

        </View>


        {/* =====================================
            LOADING
        ===================================== */}

        {loading ? (

          <View style={styles.loadingContainer}>

            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.loadingText}>
              Loading maintenance records...
            </Text>

          </View>

        ) : records.length === 0 ? (

          /* ===================================
             EMPTY STATE
          =================================== */

          <View style={styles.emptyCard}>

            <View style={styles.emptyIcon}>

              <MaterialIcons
                name="build-circle"
                size={42}
                color={COLORS.primary}
              />

            </View>


            <Text style={styles.emptyTitle}>
              No maintenance records yet
            </Text>


            <Text style={styles.emptyText}>
              Add your first maintenance record
              to start tracking this vehicle.
            </Text>


            <Touchable
              onPress={handleAddMaintenance}
              style={styles.emptyButton}
            >

              <MaterialIcons
                name="add"
                size={20}
                color={COLORS.textInverse}
              />

              <Text style={styles.emptyButtonText}>
                Add Maintenance
              </Text>

            </Touchable>

          </View>

        ) : (

          /* ===================================
             RECORD LIST
          =================================== */

          <View style={styles.recordList}>

            {records.map((item) => (

              <View
                key={item.id}
                style={styles.recordCard}
              >


                {/* CARD HEADER */}

                <View style={styles.cardHeader}>

                  <View style={styles.serviceIconWrap}>

                    <MaterialIcons
                      name="build"
                      size={20}
                      color={COLORS.primary}
                    />

                  </View>


                  <View
                    style={styles.headerTextWrap}
                  >

                    <Text
                      style={styles.recordTitle}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>


                    <Text
                      style={styles.recordSub}
                      numberOfLines={1}
                    >
                      {item.serviceType}
                    </Text>

                  </View>


                  <Text
                    style={styles.recordCost}
                    numberOfLines={1}
                  >
                    {item.cost}
                  </Text>

                </View>


                {/* CARD META */}

                <View style={styles.metaContainer}>

                  <View style={styles.metaItem}>

                    <MaterialIcons
                      name="calendar-today"
                      size={15}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.metaText}>
                      {item.date}
                    </Text>

                  </View>


                  <View style={styles.metaItem}>

                    <MaterialIcons
                      name="speed"
                      size={16}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.metaText}>
                      {item.odometer}
                    </Text>

                  </View>

                </View>


                {/* NOTES */}

                {item.notes ? (

                  <View style={styles.notesContainer}>

                    <MaterialIcons
                      name="notes"
                      size={15}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.notesText}>
                      {item.notes}
                    </Text>

                  </View>

                ) : null}

              </View>

            ))}

          </View>

        )}

      </ScrollView>


      {/* =========================================
          FLOATING ACTION BUTTON
      ========================================= */}

      {!loading && records.length > 0 && (
        <Touchable
          onPress={handleAddMaintenance}
          style={styles.fab}
        >

          <MaterialIcons
            name="add"
            size={24}
            color={COLORS.textInverse}
          />

          <Text style={styles.fabText}>
            Add Maintenance
          </Text>

        </Touchable>
      )}

    </SafeAreaView>
  );
}


// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },


  // -----------------------------------------------
  // App Bar
  // -----------------------------------------------

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal:
      SPACING.screenPadding,

    paddingVertical:
      SPACING.md,

    backgroundColor:
      COLORS.background,

    borderBottomWidth: 1,

    borderBottomColor:
      COLORS.borderLight,
  },


  iconButton: {
    width: 40,
    height: 40,

    borderRadius: 20,

    backgroundColor:
      COLORS.surfaceElevated,

    justifyContent: 'center',
    alignItems: 'center',
  },


  titleContainer: {
    flex: 1,

    alignItems: 'center',

    paddingHorizontal:
      SPACING.sm,
  },


  appBarTitle: {
    color:
      COLORS.textPrimary,

    fontSize: 17,

    fontWeight: '700',
  },


  vehicleSubtitle: {
    color:
      COLORS.textMuted,

    fontSize: 11,

    marginTop: 2,
  },


  // -----------------------------------------------
  // Scroll
  // -----------------------------------------------

  scrollContent: {
    paddingHorizontal:
      SPACING.screenPadding,

    paddingTop:
      SPACING.lg,

    paddingBottom:
      110,
  },


  // -----------------------------------------------
  // Summary
  // -----------------------------------------------

  summaryCard: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      COLORS.surface,

    borderRadius:
      RADII.card,

    paddingVertical:
      SPACING.md,

    paddingHorizontal:
      SPACING.sm,

    borderWidth: 1,

    borderColor:
      COLORS.borderLight,

    marginBottom:
      SPACING.xl,
  },


  summaryItem: {
    flex: 1,

    alignItems: 'center',

    minWidth: 0,
  },


  summaryIcon: {
    width: 32,
    height: 32,

    borderRadius: 16,

    backgroundColor:
      COLORS.primaryMuted,

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 5,
  },


  summaryNumber: {
    color:
      COLORS.primary,

    fontSize: 15,

    fontWeight: '700',

    maxWidth: '100%',
  },


  summaryLabel: {
    color:
      COLORS.textMuted,

    fontSize: 10,

    marginTop: 2,

    textAlign: 'center',
  },


  summaryDivider: {
    width: 1,

    height: 42,

    backgroundColor:
      COLORS.borderLight,
  },


  // -----------------------------------------------
  // Section
  // -----------------------------------------------

  sectionHeader: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',

    marginBottom:
      SPACING.md,
  },


  sectionTitle: {
    color:
      COLORS.textPrimary,

    fontSize: 16,

    fontWeight: '700',
  },


  sectionSubtitle: {
    color:
      COLORS.textMuted,

    fontSize: 11,

    marginTop: 2,
  },


  recordCount: {
    color:
      COLORS.primary,

    backgroundColor:
      COLORS.primaryMuted,

    minWidth: 28,

    height: 28,

    borderRadius: 14,

    textAlign: 'center',

    textAlignVertical: 'center',

    paddingTop:
      Platform.OS === 'ios' ? 6 : 0,

    fontSize: 12,

    fontWeight: '700',
  },


  // -----------------------------------------------
  // Loading
  // -----------------------------------------------

  loadingContainer: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 60,
  },


  loadingText: {
    color:
      COLORS.textMuted,

    fontSize: 13,

    marginTop:
      SPACING.md,
  },


  // -----------------------------------------------
  // Empty State
  // -----------------------------------------------

  emptyCard: {
    backgroundColor:
      COLORS.surface,

    borderRadius:
      RADII.card,

    borderWidth: 1,

    borderColor:
      COLORS.borderLight,

    padding:
      SPACING.xl,

    alignItems: 'center',
  },


  emptyIcon: {
    width: 76,
    height: 76,

    borderRadius: 38,

    backgroundColor:
      COLORS.primaryMuted,

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom:
      SPACING.md,
  },


  emptyTitle: {
    color:
      COLORS.textPrimary,

    fontSize: 16,

    fontWeight: '700',

    textAlign: 'center',

    marginBottom:
      SPACING.xs,
  },


  emptyText: {
    color:
      COLORS.textMuted,

    fontSize: 13,

    lineHeight: 19,

    textAlign: 'center',

    maxWidth: 280,

    marginBottom:
      SPACING.lg,
  },


  emptyButton: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor:
      COLORS.primary,

    borderRadius:
      RADII.button,

    paddingHorizontal:
      SPACING.lg,

    height: 46,
  },


  emptyButtonText: {
    color:
      COLORS.textInverse,

    fontSize: 13,

    fontWeight: '700',

    marginLeft: 7,
  },


  // -----------------------------------------------
  // Record List
  // -----------------------------------------------

  recordList: {
    gap: SPACING.md,
  },


  recordCard: {
    backgroundColor:
      COLORS.surface,

    borderRadius:
      RADII.card,

    borderWidth: 1,

    borderColor:
      COLORS.borderLight,

    padding:
      SPACING.md,
  },


  // -----------------------------------------------
  // Record Header
  // -----------------------------------------------

  cardHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom:
      SPACING.md,
  },


  serviceIconWrap: {
    width: 42,
    height: 42,

    borderRadius:
      RADII.sm,

    backgroundColor:
      COLORS.primaryMuted,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight:
      SPACING.md,
  },


  headerTextWrap: {
    flex: 1,

    paddingRight:
      SPACING.sm,
  },


  recordTitle: {
    color:
      COLORS.textPrimary,

    fontSize: 14,

    fontWeight: '700',

    lineHeight: 19,
  },


  recordSub: {
    color:
      COLORS.textMuted,

    fontSize: 11,

    marginTop: 2,
  },


  recordCost: {
    color:
      COLORS.primary,

    fontSize: 14,

    fontWeight: '700',

    maxWidth: 85,

    textAlign: 'right',
  },


  // -----------------------------------------------
  // Meta
  // -----------------------------------------------

  metaContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: SPACING.lg,

    borderTopWidth: 1,

    borderTopColor:
      COLORS.borderLight,

    paddingTop:
      SPACING.sm,
  },


  metaItem: {
    flexDirection: 'row',

    alignItems: 'center',

    flexShrink: 1,
  },


  metaText: {
    color:
      COLORS.textSecondary,

    fontSize: 11,

    marginLeft: 5,
  },


  // -----------------------------------------------
  // Notes
  // -----------------------------------------------

  notesContainer: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    marginTop:
      SPACING.sm,

    paddingTop:
      SPACING.sm,

    borderTopWidth: 1,

    borderTopColor:
      COLORS.borderLight,
  },


  notesText: {
    flex: 1,

    color:
      COLORS.textMuted,

    fontSize: 11,

    lineHeight: 17,

    marginLeft: 5,

    fontStyle: 'italic',
  },


  // -----------------------------------------------
  // Floating Action Button
  // -----------------------------------------------

  fab: {
    position: 'absolute',

    right:
      SPACING.screenPadding,

    bottom: 24,

    height: 52,

    borderRadius: 26,

    backgroundColor:
      COLORS.primary,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal:
      SPACING.lg,

    elevation: 6,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.3,

    shadowRadius: 5,
  },


  fabText: {
    color:
      COLORS.textInverse,

    fontSize: 13,

    fontWeight: '700',

    marginLeft: 7,
  },

});