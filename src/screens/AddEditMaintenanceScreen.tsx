import AttachmentPicker from '@/components/attachment-picker';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Attachment } from '@/types';
import { isISODate } from '@/utils/bookingValidation';
// src/screens/AddEditMaintenanceScreen.tsx
import Button from '@/components/Button';
import ChipSelector from '@/components/ChipSelector';
import DatePickerField from '@/components/DatePickerField';
import InputField from '@/components/InputField';
import LocationPicker from '@/components/LocationPicker';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { createMaintenanceItem, updateMaintenanceItem } from '@/services/maintenanceService';
import { colors, spacing, typography } from '@/theme/theme';
import { MaintenanceCategory, ServiceFrequency } from '@/types';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  MAINTENANCE_TEMPLATES,
} from '@/utils/maintenanceTemplates';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

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
  const { t } = useLanguage();
  const { user } = useAuth();
  const { items } = useMaintenanceItems();
  const editingId = route.params?.itemId;
  const editingItem = items.find((i) => i.id === editingId);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('ac');
  const [frequency, setFrequency] = useState<ServiceFrequency>('monthly');
  const [customDays, setCustomDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [warrantyNotes, setWarrantyNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
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
      setBrandModel(editingItem.brandModel ?? '');
      setSerialNumber(editingItem.serialNumber ?? '');
      setWarrantyExpiry(editingItem.warrantyExpiry ?? '');
      setWarrantyNotes(editingItem.warrantyNotes ?? '');
      setAttachments(editingItem.attachments ?? []);
      setLocationId(editingItem.locationId ?? null);
      if (editingItem.lastServiceDate) {
        setLastServiceDate(new Date(editingItem.lastServiceDate));
      }
    }
  }, [editingItem]);

  function applyTemplate(templateIndex: number) {
    const template = MAINTENANCE_TEMPLATES[templateIndex];
    setName(`${t(template.itemName)} – ${t(template.taskName)}`);
    setCategory(template.category);
    setFrequency(template.frequency);
  }

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Please give this item a name.');
      return;
    }
    if (!user || uploading || submitting) return;
    if (
      frequency === 'custom' &&
      (!Number.isInteger(Number(customDays)) || Number(customDays) < 1)
    ) {
      setError(t('Enter a valid number of days.'));
      return;
    }
    if (warrantyExpiry && !isISODate(warrantyExpiry)) {
      setError(t('Use YYYY-MM-DD for the warranty date.'));
      return;
    }

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
            brandModel,
            serialNumber,
            warrantyExpiry: warrantyExpiry || null,
            warrantyNotes,
            attachments,
          },
          editingItem.notificationIds,
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
          brandModel,
          serialNumber,
          warrantyExpiry: warrantyExpiry || null,
          warrantyNotes,
          attachments,
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
            <Text style={styles.sectionLabel}>{t('Quick add from a template')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.templateRow}>
                {MAINTENANCE_TEMPLATES.map((template, index) => (
                  <Button
                    key={`${template.itemName}-${template.taskName}`}
                    label={`${CATEGORY_ICONS[template.category]} ${t(template.taskName)}`}
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
          label={t('Item Name')}
          placeholder={t('e.g. AC Unit – Filter Cleaning')}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.sectionLabel}>{t('Category')}</Text>
        <ChipSelector
          options={CATEGORY_OPTIONS}
          selectedValue={category}
          onSelect={(v) => setCategory(v as MaintenanceCategory)}
        />

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          {t('Service Frequency')}
        </Text>
        <ChipSelector
          options={FREQUENCY_OPTIONS}
          selectedValue={frequency}
          onSelect={(v) => setFrequency(v as ServiceFrequency)}
        />

        {frequency === 'custom' && (
          <InputField
            label={t('Repeat every (days)')}
            keyboardType="number-pad"
            value={customDays}
            onChangeText={setCustomDays}
            style={{ marginTop: spacing.md }}
          />
        )}

        <View style={{ marginTop: spacing.lg }}>
          <DatePickerField
            label={t('Last serviced on')}
            value={lastServiceDate}
            onChange={setLastServiceDate}
          />
          <Text style={styles.dateHint}>
            {t('The next service date is calculated from this. Defaults to today.')}
          </Text>
        </View>

        <Text style={styles.locationLabel}>{t('Service Location')}</Text>
        <Text style={styles.locationHint}>
          {t('Pick which of your saved places this appliance is at.')}
        </Text>
        <LocationPicker value={locationId} onChange={setLocationId} />

        <InputField
          label={t('Notes (optional)')}
          placeholder={t('Any extra details...')}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          style={{ minHeight: 80, textAlignVertical: 'top', marginTop: spacing.md }}
        />

        <Text style={styles.sectionLabel}>{t('Device file')}</Text>
        <InputField label={t('Brand and model')} value={brandModel} onChangeText={setBrandModel} />
        <InputField
          label={t('Serial number')}
          value={serialNumber}
          onChangeText={setSerialNumber}
        />
        <InputField
          label={t('Warranty expiry')}
          placeholder="YYYY-MM-DD"
          value={warrantyExpiry}
          onChangeText={setWarrantyExpiry}
        />
        <InputField
          label={t('Warranty notes')}
          value={warrantyNotes}
          onChangeText={setWarrantyNotes}
          multiline
        />
        <AttachmentPicker
          value={attachments}
          onChange={setAttachments}
          onBusyChange={setUploading}
        />
        {error ? <Text style={styles.error}>{t(error)}</Text> : null}

        <View style={styles.actions}>
          <Button
            label={t('Cancel')}
            variant="secondary"
            onPress={confirmDiscard}
            style={styles.actionButton}
          />
          <Button
            label={isEditing ? 'Save Changes' : 'Add Item'}
            onPress={handleSave}
            loading={submitting}
            disabled={uploading}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
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
