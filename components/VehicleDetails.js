import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADII } from '../constants/theme';

// Same type -> icon mapping used in GarageScreen.js / AddVehicle.js.
const TYPE_ICONS = {
  car: 'car',
  motorcycle: 'motorbike',
  van: 'van-passenger',
  truck: 'truck',
};

// Fallback stats/history shown when a vehicle doesn't have its own data yet
// (e.g. one just added via AddVehicle.js). Replace with real per-vehicle
// data once your history/records are wired up.
const FALLBACK_STATS = {
  verifiedRepairs: '0',
  lastService: '—',
  mileage: '—',
  plate: '—',
};

const FALLBACK_HISTORY = [];

export default function VehicleDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const vehicle = route.params?.vehicle;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleExportPDF = () => {
    // TODO: wire up PDF export
    console.log('Export PDF pressed for:', vehicle?.name);
  };

  const handleShareImage = () => {
    // TODO: wire up share-as-image
    console.log('Share as Image pressed for:', vehicle?.name);
  };

  const handleHistoryItemPress = (item) => {
    // TODO: open history item detail
    console.log('Opened history item:', item.title);
  };

  const stats = vehicle?.stats || FALLBACK_STATS;
  const history = vehicle?.history || FALLBACK_HISTORY;
  const iconName = TYPE_ICONS[vehicle?.type] || 'car';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Top app bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <View style={styles.avatarCircle}>
          <MaterialIcons name="person" size={18} color={COLORS.textInverse} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Vehicle summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrapper}>
            <MaterialCommunityIcons name={iconName} size={32} color={COLORS.textSecondary} />
          </View>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.vehicleName} numberOfLines={1}>
              {vehicle?.name || 'Unknown Vehicle'}
            </Text>
            <Text style={styles.vehicleMeta}>
              {vehicle?.year} | {vehicle?.brand} {vehicle?.model}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons name="build" size={16} color={COLORS.textMuted} />
              <Text style={styles.statLabel}>Verified Repairs</Text>
            </View>
            <Text style={styles.statValue}>{stats.verifiedRepairs}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons name="calendar-today" size={16} color={COLORS.textMuted} />
              <Text style={styles.statLabel}>Last Service</Text>
            </View>
            <Text style={styles.statValue}>{stats.lastService}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons name="speed" size={16} color={COLORS.textMuted} />
              <Text style={styles.statLabel}>Mileage</Text>
            </View>
            <Text style={styles.statValue}>{stats.mileage}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons name="directions-car" size={16} color={COLORS.textMuted} />
              <Text style={styles.statLabel}>Plate</Text>
            </View>
            <Text style={styles.statValue}>{stats.plate}</Text>
          </View>
        </View>

        {/* Recent history */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>Recent History</Text>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No history recorded yet.</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyCard}
                  activeOpacity={0.85}
                  onPress={() => handleHistoryItemPress(item)}>
                  <View
                    style={[
                      styles.historyIconWrapper,
                      item.iconHighlighted
                        ? styles.historyIconWrapperHighlighted
                        : styles.historyIconWrapperMuted,
                    ]}>
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={item.iconHighlighted ? COLORS.primary : COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.historyTextBlock}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.historyLocation} numberOfLines={1}>
                      {item.location}
                    </Text>
                    <View style={styles.historyTagRow}>
                      <View
                        style={[
                          styles.historyDot,
                          { backgroundColor: item.tagHighlighted ? COLORS.primary : COLORS.textMuted },
                        ]}
                      />
                      <Text style={styles.historyTagText}>{item.tag}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.exportButton} activeOpacity={0.9} onPress={handleExportPDF}>
            <MaterialIcons name="picture-as-pdf" size={20} color={COLORS.textInverse} />
            <Text style={styles.exportButtonText}>Export PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} activeOpacity={0.85} onPress={handleShareImage}>
            <MaterialIcons name="share" size={20} color={COLORS.primary} />
            <Text style={styles.shareButtonText}>Share as Image</Text>
          </TouchableOpacity>
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
    height: 64,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.xxl,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  summaryIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  vehicleName: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  vehicleMeta: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 4,
  },
  historySection: {
    gap: SPACING.lg,
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '600',
  },
  emptyHistory: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptyHistoryText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  historyList: {
    gap: SPACING.sm,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  historyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIconWrapperHighlighted: {
    backgroundColor: COLORS.primaryMuted,
  },
  historyIconWrapperMuted: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  historyTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  historyTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  historyDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  historyLocation: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  historyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADII.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyTagText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  actionSection: {
    gap: SPACING.md,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.full,
    height: 48,
  },
  exportButtonText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.full,
    height: 48,
  },
  shareButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});