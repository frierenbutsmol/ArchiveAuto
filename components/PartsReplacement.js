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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function PartsReplacement({ navigation }) {
  const route = useRoute();

  const [parts, setParts] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [currentMileage, setCurrentMileage] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadParts = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return;
      }

      let selectedVehicle =
        route?.params?.vehicle ||
        route?.params?.selectedVehicle ||
        null;

      // If no vehicle was passed, get the user's first vehicle.
      if (!selectedVehicle?.id) {
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (vehicleError) {
          console.error('Vehicle load error:', vehicleError);
          return;
        }

        selectedVehicle = vehicleData;
      } else {
        // Get the latest vehicle information from Supabase.
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', selectedVehicle.id)
          .eq('user_id', user.id)
          .single();

        if (!vehicleError && vehicleData) {
          selectedVehicle = vehicleData;
        }
      }

      if (!selectedVehicle) {
        setVehicle(null);
        setParts([]);
        setCurrentMileage(0);
        return;
      }

      setVehicle(selectedVehicle);
      setCurrentMileage(Number(selectedVehicle.current_mileage) || 0);

      const { data: partsData, error: partsError } = await supabase
        .from('parts_replacements')
        .select('*')
        .eq('vehicle_id', selectedVehicle.id)
        .order('replacement_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (partsError) {
        console.error('Parts load error:', partsError);
        return;
      }

      setParts(partsData || []);
    } catch (error) {
      console.error('Parts screen error:', error);
    } finally {
      setLoading(false);
    }
  }, [route?.params?.vehicle, route?.params?.selectedVehicle]);

  useFocusEffect(
    useCallback(() => {
      loadParts();
    }, [loadParts])
  );

  const totalPartsCost = parts.reduce((total, item) => {
    return total + (Number(item.cost) || 0);
  }, 0);

  const formatDate = (dateString) => {
    if (!dateString) return '—';

    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCost = (value) => {
    if (value == null || value === '') {
      return '₱0';
    }

    return `₱${Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Parts Replacement</Text>

        <TouchableOpacity
          style={styles.addIconBtn}
          onPress={() =>
            navigation.navigate('AddPart', {
              vehicle: vehicle,
            })
          }
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

        {/* Top Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{parts.length}</Text>
            <Text style={styles.summaryLabel}>Parts Replaced</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>
              {formatCost(totalPartsCost)}
            </Text>
            <Text style={styles.summaryLabel}>Total Parts Cost</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>
              {currentMileage.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Current Odometer</Text>
          </View>
        </View>

        {/* Parts List */}
        <View style={styles.list}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
              />
            </View>
          ) : parts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="cog-outline"
                size={36}
                color={COLORS.textMuted}
              />

              <Text style={styles.emptyTitle}>
                No Parts Replacements
              </Text>

              <Text style={styles.emptyText}>
                Add a part replacement record to start tracking your vehicle parts.
              </Text>
            </View>
          ) : (
            parts.map((item) => (
              <View key={item.id} style={styles.partCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="cog-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.partTextWrap}>
                    <Text style={styles.partName}>
                      {item.part_name}
                    </Text>

                    <Text style={styles.partBrand}>
                      {item.brand || 'Generic'}
                    </Text>
                  </View>

                  <Text style={styles.partCost}>
                    {formatCost(item.cost)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.metaText}>
                      {formatDate(item.replacement_date)}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="speedometer-outline"
                      size={13}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.metaText}>
                      {item.mileage != null
                        ? `${Number(item.mileage).toLocaleString()} km`
                        : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
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
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNum: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
  },
  list: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  partCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  partTextWrap: {
    flex: 1,
  },
  partName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  partBrand: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  partCost: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
});