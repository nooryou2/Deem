// src/screens/AddEditMaintenanceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import ChipSelector from '@/components/ChipSelector';
import DatePickerField from '@/components/DatePickerField';
import LocationPicker from '@/components/LocationPicker';
import { colors, spacing, typography } from '@/theme/theme';
import { useAuth } from '@/context/AuthContext';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import {
  createMaintenanceItem,
  updateMaintenanceItem,
} from '@/services/maintenanceService';
import {
  MAINTENANCE_TEMPLATES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  FREQUENCY_LABELS,
} from '@/utils/maintenanceTemplates';
import { MaintenanceCategory, ServiceFrequency } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'AddEditMaintenance'>;

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
  icon: CATEGORY_ICONS[value],
}));

const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function AddEditMaintenanceScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { items } = useMaintenanceItems();
  const editingId = route.params?.itemId;
  const editingItem = items.find((i) => i.id === editingId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('ac');
  const [frequency, setFrequency] = useState<ServiceFrequency>('monthly');
  const [customDays, setCustomDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  // Date of the last service. Defaults to today; next-due is calculated from it.
  const [lastServiceDate, setLastServiceDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(editingItem);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setCategory(editingItem.category);
      setFrequency(editingItem.frequency);
      setCustomDays(String(editingItem.customFrequencyDays ?? 30));
      setNotes(editingItem.notes ?? '');
      setLocationId(editingItem.locationId ?? null);
      if (editingItem.lastServiceDate) {
        setLastServiceDate(new Date(editingItem.lastServiceDate));
      }
    }
  }, [editingItem]);

  function applyTemplate(templateIndex: number) {
    const template = MAINTENANCE_TEMPLATES[templateIndex];
    setName(`${template.itemName} – ${template.taskName}`);
    setCategory(template.category);
    setFrequency(template.frequency);
  }

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Please give this item a name.');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      if (isEditing && editingItem) {
        await updateMaintenanceItem(
          editingItem.id,
          {
            name: name.trim(),
            category,
            frequency,
            customFrequencyDays: frequency === 'custom' ? Number(customDays) || 30 : null,
            notes: notes.trim(),
            lastServiceDate,
            locationId,
          },
          editingItem.notificationIds
        );
      } else {
        await createMaintenanceItem({
          userId: user.uid,
          name: name.trim(),
          category,
          frequency,
          customFrequencyDays: frequency === 'custom' ? Number(customDays) || 30 : null,
          notes: notes.trim(),
          lastServiceDate,
          locationId,
        });
      }
      navigation.goBack();
    } catch (e) {
      // Surface the real reason so configuration issues (e.g. Firestore rules,
      // missing database) are visible instead of a generic message.
      const code = (e as { code?: string })?.code ?? '';
      const message = (e as { message?: string })?.message ?? '';
      console.log('Save maintenance item failed:', code, message, e);

      if (code === 'permission-denied') {
        setError('Permission denied. Your database security rules need to be published.');
      } else if (code === 'unavailable' || code === 'failed-precondition') {
        setError('Cannot reach the database. Check your connection or that Firestore is set up.');
      } else if (message) {
        setError(`Could not save: ${message}`);
      } else {
        setError('Could not save this item. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDiscard() {
    if (name.trim() && !isEditing) {
      Alert.alert('Discard changes?', 'Your unsaved item will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {!isEditing && (
          <View style={styles.templatesSection}>
            <Text style={styles.sectionLabel}>Quick add from a template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.templateRow}>
                {MAINTENANCE_TEMPLATES.map((template, index) => (
                  <Button
                    key={`${template.itemName}-${template.taskName}`}
                    label={`${CATEGORY_ICONS[template.category]} ${template.taskName}`}
                    variant="secondary"
                    onPress={() => applyTemplate(index)}
                    style={styles.templateButton}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <InputField
          label="Item Name"
          placeholder="e.g. AC Unit – Filter Cleaning"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.sectionLabel}>Category</Text>
        <ChipSelector
          options={CATEGORY_OPTIONS}
          selectedValue={category}
          onSelect={(v) => setCategory(v as MaintenanceCategory)}
        />

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Service Frequency</Text>
        <ChipSelector
          options={FREQUENCY_OPTIONS}
          selectedValue={frequency}
          onSelect={(v) => setFrequency(v as ServiceFrequency)}
        />

        {frequency === 'custom' && (
          <InputField
            label="Repeat every (days)"
            keyboardType="number-pad"
            value={customDays}
            onChangeText={setCustomDays}
            style={{ marginTop: spacing.md }}
          />
        )}

        <View style={{ marginTop: spacing.lg }}>
          <DatePickerField
            label="Last serviced on"
            value={lastServiceDate}
            onChange={setLastServiceDate}
          />
          <Text style={styles.dateHint}>
            The next service date is calculated from this. Defaults to today.
          </Text>
        </View>

        <Text style={styles.locationLabel}>Where is it?</Text>
        <Text style={styles.locationHint}>
          Pick which of your saved places this appliance is at.
        </Text>
        <LocationPicker value={locationId} onChange={setLocationId} />

        <InputField
          label="Notes (optional)"
          placeholder="Any extra details..."
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          style={{ minHeight: 80, textAlignVertical: 'top', marginTop: spacing.md }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={confirmDiscard} style={styles.actionButton} />
          <Button
            label={isEditing ? 'Save Changes' : 'Add Item'}
            onPress={handleSave}
            loading={submitting}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.bodySecondary, fontWeight: '600', marginBottom: spacing.sm },
  locationLabel: {
    ...typography.bodySecondary,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  locationHint: { ...typography.caption, marginBottom: spacing.sm },
  dateHint: { ...typography.caption, marginTop: -spacing.xs, marginBottom: spacing.sm },
  templatesSection: { marginBottom: spacing.lg },
  templateRow: { flexDirection: 'row', gap: spacing.sm },
  templateButton: { paddingHorizontal: spacing.md },
  error: { color: colors.danger, marginTop: spacing.sm, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  actionButton: { flex: 1 },
});
