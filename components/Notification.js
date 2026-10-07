import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableNativeFeedback,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { loadSettings } from '../lib/settings';
import { fetchAlerts, dismissAlert } from '../lib/alerts';

const ICONS = {
  service: require('../assets/SpeedoMeter.png'),
  document: require('../assets/todolist.png'),
};

// Gives touchables a real Material ripple on Android; falls back to
// opacity dimming on iOS.
function Touchable({ onPress, style, children, rippleColor, borderless = false }) {
  if (Platform.OS === 'android') {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple(
            rippleColor || 'rgba(255,255,255,0.08)',
            borderless
          )}>
          <View style={styles.rippleFill}>{children}</View>
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

export default function Notification({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  // Fall back to StatusBar.currentHeight in case the safe-area inset comes
  // back as 0 (e.g. no SafeAreaProvider higher up the tree).
  const statusBarOffset =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0)
      : 0;

  const load = useCallback(async () => {
    const settings = await loadSettings();
    const { alerts, error: err } = await fetchAlerts(settings);
    setError(err ? err.message : null);
    setNotifications(alerts);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Recalculate every time the screen is shown, so new records and settings changes count.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDismiss = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await dismissAlert(id);
  };

  // Service alerts open the "add maintenance" form for that vehicle and service type;
  // document alerts open that vehicle's documents.
  const handleAction = (item) => {
    if (item.kind === 'service') {
      navigation.navigate('AddMaintenance', { vehicle: item.vehicle, serviceType: item.serviceType });
    } else {
      navigation.navigate('VehicleDocuments', { vehicle: item.vehicle });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header: Back button on left, Title in middle, Spacer on right */}
      <View style={[styles.header, { marginTop: statusBarOffset }]}>
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={COLORS.primary}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <View style={styles.list}>
            {error && (
              <View style={styles.emptyState}>
                <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Couldn't load alerts: {error}</Text>
              </View>
            )}

            {notifications.map((item) => {
              const tagColor = item.critical ? COLORS.danger : COLORS.warning;
              return (
                <Touchable
                  key={item.id}
                  style={[styles.card, item.unread && styles.cardUnread]}
                  rippleColor="rgba(255,255,255,0.06)">
                  <View style={styles.cardInner}>
                    {item.critical && <View style={[styles.criticalBar, { backgroundColor: tagColor }]} />}

                    <View style={[styles.iconWrapper, { backgroundColor: tagColor + '20' }]}>
                      <Image source={ICONS[item.kind]} style={styles.iconImage} resizeMode="contain" />
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.categoryTag, { backgroundColor: tagColor + '25' }]}>
                          <Text style={[styles.categoryTagText, { color: tagColor }]}>
                            {item.categoryLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardMessage}>{item.message}</Text>

                      <View style={styles.actionRow}>
                        <Touchable
                          style={styles.primaryButton}
                          onPress={() => handleAction(item)}
                          rippleColor="rgba(0,0,0,0.15)">
                          <View style={styles.primaryButtonInner}>
                            <Text style={styles.primaryButtonText}>
                              {item.kind === 'service' ? 'Log Service' : 'View Documents'}
                            </Text>
                          </View>
                        </Touchable>
                        <Touchable
                          style={styles.secondaryButton}
                          onPress={() => handleDismiss(item.id)}
                          rippleColor="rgba(255,255,255,0.1)">
                          <View style={styles.secondaryButtonInner}>
                            <Text style={styles.secondaryButtonText}>Dismiss</Text>
                          </View>
                        </Touchable>
                      </View>
                    </View>

                    {item.unread && !item.critical && <View style={styles.unreadDot} />}
                  </View>
                </Touchable>
              );
            })}

            {!error && notifications.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={28} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>You're all caught up.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  rippleFill: {
    flex: 1,
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
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    position: 'relative',
  },
  cardUnread: {
    borderColor: 'rgba(55, 194, 223, 0.25)',
    backgroundColor: 'rgba(21, 25, 33, 0.95)',
  },
  criticalBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  primaryButtonInner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 999,
  },
  secondaryButtonInner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});