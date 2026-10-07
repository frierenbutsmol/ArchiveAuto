import React, { useState, useCallback } from 'react';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';

import { COLORS, SPACING, RADII } from '../constants/theme';
import { api, sortDesc } from '../lib/api';

export default function VehicleDocuments({ navigation }) {
  const route = useRoute();

  const [vehicle, setVehicle] = useState(
    route?.params?.vehicle ||
      route?.params?.selectedVehicle ||
      null
  );

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);

      let selectedVehicle = vehicle;
      if (!selectedVehicle?.id) {
        const { data: first, error: vehicleError } = await api.firstVehicle();
        if (vehicleError) {
          Alert.alert('Error', vehicleError.message || 'Failed to load vehicle.');
          return;
        }
        selectedVehicle = first;
        setVehicle(first);
      }

      if (!selectedVehicle?.id) {
        setDocuments([]);
        return;
      }

      const { data, error } = await api.list('documents', { vehicle_id: selectedVehicle.id });
      if (error) {
        Alert.alert('Error', error.message || 'Failed to load vehicle documents.');
        return;
      }
      setDocuments(sortDesc(data, 'created_at'));
    } catch {
      Alert.alert('Error', 'Something went wrong while loading documents.');
    } finally {
      setLoading(false);
    }
  }, [vehicle?.id]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments])
  );

  const getDocumentStatus = (expiryDateValue) => {
    if (!expiryDateValue) {
      return {
        text: 'No Expiry',
        color: COLORS.primary,
      };
    }

    const today = new Date();
    const expiry = new Date(expiryDateValue);

    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const difference =
      expiry.getTime() - today.getTime();

    const daysRemaining = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      return {
        text: 'Expired',
        color: COLORS.danger,
      };
    }

    if (daysRemaining <= 30) {
      return {
        text: `Expiring Soon (${daysRemaining}d)`,
        color: COLORS.warning,
      };
    }

    return {
      text: 'Valid',
      color: COLORS.success,
    };
  };

  const formatExpiryDate = (date) => {
    if (!date) {
      return 'No Expiry';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  const handleViewDocument = async (filePath) => {
    if (!filePath) {
      Alert.alert('Unavailable', 'This document does not have a file attached.');
      return;
    }
    const { error } = await api.files.open(filePath);
    if (error) Alert.alert('Unable to Open', error.message || 'Could not open this document.');
  };

  const getFileName = (filePath) => {
    if (!filePath) {
      return 'No file';
    }

    const parts = filePath.split('/');

    return parts[parts.length - 1]
      .replace(/^\d+_/, '');
  };

  const getDocumentTitle = (doc) => {
    return (
      doc.notes ||
      (doc.file_name || getFileName(doc.file_path)) ||
      'Vehicle Document'
    );
  };

  const openAddDocument = () => {
    navigation.navigate('AddDocument', {
      vehicle: vehicle,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

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
          Vehicle Documents
        </Text>

        <TouchableOpacity
          style={styles.addIconBtn}
          onPress={openAddDocument}
          activeOpacity={0.8}>
          <Ionicons
            name="add"
            size={22}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}>

        <View style={styles.noticeCard}>
          <Ionicons
            name="shield-checkmark"
            size={22}
            color={COLORS.primary}
            style={{ marginRight: 12 }}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>
              Digital Glovebox Storage
            </Text>

            <Text style={styles.noticeSub}>
              Stored encrypted for quick access
              during road inspections and
              registration renewals.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-outline"
              size={42}
              color={COLORS.textMuted}
            />

            <Text style={styles.emptyTitle}>
              No Documents Yet
            </Text>

            <Text style={styles.emptyText}>
              Upload your OR/CR, insurance,
              warranty, or other vehicle
              documents.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {documents.map((doc) => {
              const status =
                getDocumentStatus(
                  doc.expiry_date
                );

              return (
                <View
                  key={doc.id}
                  style={styles.docCard}>

                  <View
                    style={styles.cardHeader}>

                    <View
                      style={
                        styles.docIconCircle
                      }>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>

                    <View
                      style={
                        styles.docTextWrap
                      }>
                      <Text
                        style={styles.docName}
                        numberOfLines={2}>
                        {getDocumentTitle(doc)}
                      </Text>

                      <Text
                        style={styles.docAgency}>
                        {doc.document_type ||
                          'Vehicle Document'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusTag,
                        {
                          backgroundColor:
                            status.color +
                            '20',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              status.color,
                          },
                        ]}>
                        {status.text}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.metaRow}>

                    <View
                      style={styles.metaItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color={
                          COLORS.textMuted
                        }
                      />

                      <Text
                        style={styles.metaText}>
                        Expires:{' '}
                        {formatExpiryDate(
                          doc.expiry_date
                        )}
                      </Text>
                    </View>

                    <View
                      style={styles.metaItem}>
                      <Ionicons
                        name="attach-outline"
                        size={13}
                        color={
                          COLORS.textMuted
                        }
                      />

                      <Text
                        style={styles.metaText}
                        numberOfLines={1}>
                        {(doc.file_name || getFileName(doc.file_path))}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.viewDocBtn}
                    onPress={() =>
                      handleViewDocument(
                        doc.file_path
                      )
                    }
                    activeOpacity={0.7}>

                    <Ionicons
                      name="eye-outline"
                      size={14}
                      color={COLORS.primary}
                    />

                    <Text
                      style={
                        styles.viewDocText
                      }>
                      View Attached Document
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={openAddDocument}
          activeOpacity={0.85}>

          <Ionicons
            name="cloud-upload-outline"
            size={20}
            color={COLORS.textInverse}
            style={{ marginRight: 6 }}
          />

          <Text style={styles.ctaText}>
            Upload Document
          </Text>
        </TouchableOpacity>
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

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(55, 194, 223, 0.25)',
    marginBottom: SPACING.lg,
  },

  noticeTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },

  noticeSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  list: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },

  docCard: {
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

  docIconCircle: {
    width: 38,
    height: 38,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  docTextWrap: {
    flex: 1,
  },

  docName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  docAgency: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.xs,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginBottom: SPACING.xs,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
  },

  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
    flexShrink: 1,
  },

  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },

  viewDocText: {
    color: COLORS.primary,
    fontSize: 12,
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

  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: SPACING.xl,
  },

  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: 6,
  },

  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});