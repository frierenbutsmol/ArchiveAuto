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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function RepairList({ navigation }) {
  const route = useRoute();

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(
    route?.params?.selectedVehicle || route?.params?.vehicle || null
  );

  const loadRepairs = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setRepairs([]);
        setLoading(false);
        return;
      }

      let vehicle = selectedVehicle;

      // If no vehicle was passed, get the user's first vehicle.
      if (!vehicle?.id) {
        const { data: vehicleData, error: vehicleError } =
          await supabase
            .from('vehicles')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (vehicleError) {
          console.error('Vehicle load error:', vehicleError);
          Alert.alert(
            'Error',
            'Could not load your vehicle.'
          );
          setRepairs([]);
          setLoading(false);
          return;
        }

        vehicle = vehicleData;
        setSelectedVehicle(vehicleData);
      }

      if (!vehicle?.id) {
        setRepairs([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('repairs')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .order('repair_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Repair load error:', error);

        Alert.alert(
          'Error',
          error.message || 'Could not load repair records.'
        );

        setRepairs([]);
        setLoading(false);
        return;
      }

      const formattedRepairs = (data || []).map((repair) => {
        const hasPhotoProof = !!repair.proof_file_path;

        let proofStatus;

        if (repair.repair_type === 'DIY') {
          proofStatus = 'DIY Log';
        } else if (hasPhotoProof) {
          proofStatus = 'Official Proof Attached';
        } else {
          proofStatus = 'Proof Not Attached';
        }

        return {
          id: repair.id,
          title:
            repair.description ||
            repair.repair_type ||
            'Repair Record',
          date: repair.repair_date
            ? new Date(
                `${repair.repair_date}T00:00:00`
              ).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
              })
            : 'No date',
          odometer:
            repair.mileage != null
              ? `${Number(repair.mileage).toLocaleString()} km`
              : 'No mileage',
          repairType: repair.repair_type,
          shop: repair.shop_name || 'No shop specified',
          cost:
            repair.cost != null
              ? `₱${Number(repair.cost).toLocaleString()}`
              : 'No cost',
          hasPhotoProof,
          proofStatus,
          description:
            repair.notes ||
            'No additional notes for this repair.',
        };
      });

      setRepairs(formattedRepairs);
    } catch (error) {
      console.error('Unexpected repair load error:', error);

      Alert.alert(
        'Error',
        'Something went wrong while loading repairs.'
      );

      setRepairs([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRepairs();
    }, [selectedVehicle?.id])
  );

  const handleAddRepair = () => {
    if (!selectedVehicle?.id) {
      Alert.alert(
        'No Vehicle',
        'Please add a vehicle before logging a repair.'
      );
      return;
    }

    navigation.navigate('AddRepair', {
      vehicle: selectedVehicle,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Repair Log
        </Text>

        <TouchableOpacity
          style={styles.addIconBtn}
          onPress={handleAddRepair}
          activeOpacity={0.8}>
          <Ionicons
            name="add"
            size={22}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Verification Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryTitle}>
              Trustworthy Repair Records
            </Text>

            <Text style={styles.summarySubtitle}>
              Official shop & dealer repairs require attached photo proof for resale value.
            </Text>
          </View>
        </View>

        {/* Loading */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />
          </View>
        ) : repairs.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Ionicons
              name="construct-outline"
              size={42}
              color={COLORS.textMuted}
            />

            <Text style={styles.emptyTitle}>
              No repair records yet
            </Text>

            <Text style={styles.emptyText}>
              Add your first repair record to keep track of your vehicle's repair history.
            </Text>
          </View>
        ) : (
          /* List of repairs */
          <View style={styles.list}>
            {repairs.map((item) => (
              <View
                key={item.id}
                style={styles.repairCard}>

                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      getTypeBadgeStyle(
                        item.repairType
                      ),
                    ]}>
                    <Text
                      style={[
                        styles.typeBadgeText,
                        getTypeTextStyle(
                          item.repairType
                        ),
                      ]}>
                      {item.repairType}
                    </Text>
                  </View>

                  <Text style={styles.costText}>
                    {item.cost}
                  </Text>
                </View>

                <Text style={styles.repairTitle}>
                  {item.title}
                </Text>

                <Text style={styles.shopName}>
                  {item.shop}
                </Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.metaText}>
                      {item.date}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="speedometer-outline"
                      size={13}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.metaText}>
                      {item.odometer}
                    </Text>
                  </View>
                </View>

                <Text style={styles.descText}>
                  {item.description}
                </Text>

                {/* Photo proof indicator */}
                <View
                  style={[
                    styles.proofRow,
                    item.hasPhotoProof
                      ? styles.proofRowVerified
                      : styles.proofRowDiy,
                  ]}>

                  <Ionicons
                    name={
                      item.hasPhotoProof
                        ? 'image-outline'
                        : 'person-outline'
                    }
                    size={14}
                    color={
                      item.hasPhotoProof
                        ? COLORS.success
                        : COLORS.textMuted
                    }
                  />

                  <Text
                    style={[
                      styles.proofText,
                      item.hasPhotoProof && {
                        color: COLORS.success,
                      },
                    ]}>
                    {item.proofStatus}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getTypeBadgeStyle(type) {
  switch (type) {
    case 'Manufacturer/Dealer':
      return {
        backgroundColor: 'rgba(55, 194, 223, 0.15)',
        borderColor: 'rgba(55, 194, 223, 0.3)',
      };

    case 'Official Shop':
      return {
        backgroundColor: 'rgba(46, 213, 115, 0.15)',
        borderColor: 'rgba(46, 213, 115, 0.3)',
      };

    case 'Informal Mechanic':
      return {
        backgroundColor: 'rgba(255, 165, 2, 0.15)',
        borderColor: 'rgba(255, 165, 2, 0.3)',
      };

    default:
      return {
        backgroundColor: COLORS.surfaceElevated,
        borderColor: COLORS.border,
      };
  }
}

function getTypeTextStyle(type) {
  switch (type) {
    case 'Manufacturer/Dealer':
      return { color: COLORS.primary };

    case 'Official Shop':
      return { color: COLORS.success };

    case 'Informal Mechanic':
      return { color: COLORS.warning };

    default:
      return { color: COLORS.textSecondary };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  addIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(55, 194, 223, 0.25)',
    marginBottom: SPACING.lg,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  summarySubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  list: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  repairCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  costText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  repairTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  shopName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginBottom: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  descText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: SPACING.sm,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceElevated,
    alignSelf: 'flex-start',
  },
  proofRowVerified: {
    backgroundColor: 'rgba(46, 213, 115, 0.12)',
  },
  proofRowDiy: {
    backgroundColor: COLORS.surfaceElevated,
  },
  proofText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  ctaButton: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
});