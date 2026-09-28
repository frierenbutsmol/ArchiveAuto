import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';

const NOTIFICATIONS = [
  {
    id: '1',
    categoryLabel: 'Mileage Due',
    tagColor: COLORS.danger,
    icon: require('../assets/SpeedoMeter.png'),
    title: 'Maintenance Due Soon',
    message: 'Daily Drive is due for an engine oil & filter change in 300 km.',
    time: '2h ago',
    unread: true,
  },
  {
    id: '2',
    categoryLabel: 'Document Expiry',
    tagColor: COLORS.warning,
    icon: require('../assets/todolist.png'),
    title: 'OR/CR Renewal Approaching',
    message: "Dad's Truck registration renewal window opens next month.",
    time: '1d ago',
    unread: true,
  },
  {
    id: '3',
    categoryLabel: 'Weekly Fuel Ref',
    tagColor: COLORS.primary,
    icon: require('../assets/Gas.png'),
    title: 'Weekly Diesel Price Drop',
    message: 'Diesel fuel price in your region dropped by ₱0.60/L to ₱58.40/L.',
    time: '2d ago',
    unread: false,
  },
  {
    id: '4',
    categoryLabel: 'Repair Record',
    tagColor: COLORS.success,
    icon: require('../assets/support.png'),
    title: 'Photo Proof Verified',
    message: 'Official shop repair invoice uploaded & verified for Work Motor tune-up.',
    time: '4d ago',
    unread: false,
  },
];

export default function Notification({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header: Back button on left, Title in middle, Spacer on right */}
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notification Cards */}
        <View style={styles.list}>
          {NOTIFICATIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, item.unread && styles.cardUnread]}
              activeOpacity={0.8}>
              <View style={[styles.iconWrapper, { backgroundColor: item.tagColor + '20' }]}>
                <Image source={item.icon} style={styles.iconImage} resizeMode="contain" />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.categoryTag, { backgroundColor: item.tagColor + '25' }]}>
                    <Text style={[styles.categoryTagText, { color: item.tagColor }]}>
                      {item.categoryLabel}
                    </Text>
                  </View>
                  <Text style={styles.cardTime}>{item.time}</Text>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMessage} numberOfLines={2}>
                  {item.message}
                </Text>
              </View>

              {item.unread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
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
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: 90,
  },
  list: {
    gap: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    position: 'relative',
  },
  cardUnread: {
    borderColor: 'rgba(55, 194, 223, 0.25)',
    backgroundColor: 'rgba(21, 25, 33, 0.95)',
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginTop: 2,
  },
  iconImage: {
    width: 22,
    height: 22,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTime: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  cardMessage: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
});