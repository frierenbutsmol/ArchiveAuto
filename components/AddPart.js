import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { COLORS, SPACING, RADII } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function AddPart({ navigation }) {
  const route = useRoute();

  const [vehicle, setVehicle] = useState(
    route?.params?.vehicle || null
  );

  const [partName, setPartName] = useState('');
  const [brand, setBrand] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');

  const [currentMileage, setCurrentMileage] = useState(0);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadVehicle = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      if (!vehicle?.id) {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Vehicle load error:', error);
          Alert.alert('Error', 'Failed to load vehicle.');
          return;
        }

        setVehicle(data);
        setCurrentMileage(Number(data?.current_mileage) || 0);
      } else {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', vehicle.id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Vehicle load error:', error);
          Alert.alert('Error', 'Failed to load vehicle.');
          return;
        }

        setVehicle(data);
        setCurrentMileage(Number(data?.current_mileage) || 0);
      }
    } catch (error) {
      console.error('Load vehicle error:', error);
      Alert.alert(
        'Error',
        'Something went wrong while loading the vehicle.'
      );
    } finally {
      setLoadingVehicle(false);
    }
  }, [vehicle?.id]);

  React.useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  const handleSave = async () => {
    if (!vehicle?.id) {
      Alert.alert(
        'No Vehicle',
        'Please select a vehicle first.'
      );
      return;
    }

    if (!partName.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter the part name.'
      );
      return;
    }

    if (!odometer.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter the odometer reading.'
      );
      return;
    }

    const mileageValue = parseInt(
      odometer.replace(/[^0-9]/g, ''),
      10
    );

    if (Number.isNaN(mileageValue)) {
      Alert.alert(
        'Invalid Odometer',
        'Please enter a valid mileage.'
      );
      return;
    }

    // Prevent the official meter from going backwards.
    if (mileageValue < currentMileage) {
      Alert.alert(
        'Invalid Odometer',
        `The odometer cannot be lower than the current mileage of ${currentMileage.toLocaleString()} km.`
      );
      return;
    }

    const costValue = parseFloat(
      cost.replace(/[^0-9.]/g, '')
    );

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'You are not logged in.');
        return;
      }

      const { error: insertError } = await supabase
        .from('parts_replacements')
        .insert({
          vehicle_id: vehicle.id,
          part_name: partName.trim(),
          brand: brand.trim() || null,
          replacement_date: new Date()
            .toISOString()
            .split('T')[0],
          mileage: mileageValue,
          cost: Number.isNaN(costValue)
            ? null
            : costValue,
          notes: null,
        });

      if (insertError) {
        console.error('Part save error:', insertError);
        Alert.alert(
          'Save Failed',
          insertError.message
        );
        return;
      }

      // Update the official vehicle mileage if the new reading is higher.
      if (mileageValue > currentMileage) {
        const { error: mileageError } = await supabase
          .from('vehicles')
          .update({
            current_mileage: mileageValue,
          })
          .eq('id', vehicle.id)
          .eq('user_id', user.id);

        if (mileageError) {
          console.error(
            'Mileage update error:',
            mileageError
          );

          Alert.alert(
            'Saved with Warning',
            'The part was saved, but the vehicle mileage could not be updated.'
          );

          navigation.goBack();
          return;
        }
      }

      Alert.alert(
        'Saved',
        'Part replacement record saved successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Save part error:', error);
      Alert.alert(
        'Save Failed',
        'Something went wrong while saving the part.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingVehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />

        <View style={styles.loadingScreen}>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
          />
        </View>
      </SafeAreaView>
    );
  }

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
          Add Part Replacement
        </Text>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>
            Part Name *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Alternator, Brake Pads, Battery"
            placeholderTextColor={COLORS.textMuted}
            value={partName}
            onChangeText={setPartName}
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>
            Brand / Manufacturer
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Bosch, Denso, OEM"
            placeholderTextColor={COLORS.textMuted}
            value={brand}
            onChangeText={setBrand}
            editable={!saving}
          />

          <Text style={styles.fieldLabel}>
            Odometer (km) *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter current odometer"
            placeholderTextColor={COLORS.textMuted}
            value={odometer}
            onChangeText={(text) => {
              const numericValue = text.replace(
                /[^0-9]/g,
                ''
              );

              setOdometer(numericValue);
            }}
            keyboardType="numeric"
            editable={!saving}
          />

          <View style={styles.currentMileageBox}>
            <Ionicons
              name="speedometer-outline"
              size={16}
              color={COLORS.primary}
            />

            <Text style={styles.currentMileageText}>
              Current official mileage:{' '}
              <Text style={styles.currentMileageValue}>
                {currentMileage.toLocaleString()} km
              </Text>
            </Text>
          </View>

          <Text style={styles.fieldLabel}>
            Cost (₱)
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 4,500"
            placeholderTextColor={COLORS.textMuted}
            value={cost}
            onChangeText={(text) => {
              const numericValue = text.replace(
                /[^0-9.]/g,
                ''
              );

              setCost(numericValue);
            }}
            keyboardType="decimal-pad"
            editable={!saving}
          />

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!partName.trim() ||
                !odometer.trim() ||
                saving) && {
                opacity: 0.4,
              },
            ]}
            onPress={handleSave}
            disabled={
              !partName.trim() ||
              !odometer.trim() ||
              saving
            }
            activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator
                size="small"
                color={COLORS.textInverse}
              />
            ) : (
              <Text style={styles.saveButtonText}>
                Save Part Record
              </Text>
            )}
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
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  form: {
    gap: 0,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  currentMileageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADII.input,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  currentMileageText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  currentMileageValue: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  saveButton: {
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveButtonText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});