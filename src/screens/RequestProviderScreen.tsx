// src/screens/RequestProviderScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import { useAreaFilteredProviders } from '@/hooks/useAreaFilteredProviders';
import { createServiceRequest } from '@/services/requestService';
import Button from '@/components/Button';
import { CATEGORY_ICONS } from '@/utils/maintenanceTemplates';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { ProviderProfile } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'RequestProvider'>;

export default function RequestProviderScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { items } = useMaintenanceItems();
  const item = items.find((i) => i.id === route.params.itemId);

  // Only providers covering the homeowner's area.
  const { providers, loading } = useAreaFilteredProviders();
  const [selected, setSelected] = useState<ProviderProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Service Request', msg);
  }

  async function handleSend() {
    if (!user || !item || !selected) return;
    setSubmitting(true);
    try {
      await createServiceRequest({
        homeownerId: user.uid,
        homeownerName: user.displayName ?? 'Homeowner',
        providerId: selected.uid,
        providerName: selected.name,
        maintenanceItemId: item.id,
        serviceType: item.name,
        category: item.category,
      });
      notify(`Request sent to ${selected.name}. You'll see the status on your task.`);
      navigation.goBack();
    } catch (e) {
      console.log('createServiceRequest failed:', e);
      notify('Could not send the request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>Task not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.taskCard}>
          <Text style={styles.taskIcon}>{CATEGORY_ICONS[item.category] ?? '🛠️'}</Text>
          <View>
            <Text style={styles.taskLabel}>Requesting service for</Text>
            <Text style={styles.taskName}>{item.name}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose a service provider</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : providers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛠️</Text>
            <Text style={styles.emptyTitle}>No providers available yet</Text>
            <Text style={styles.emptySub}>
              No providers cover your area yet. You can add another area from your profile.
            </Text>
          </View>
        ) : (
          providers.map((p) => {
            const isSelected = selected?.uid === p.uid;
            return (
              <TouchableOpacity
                key={p.uid}
                activeOpacity={0.8}
                onPress={() => setSelected(p)}
                style={[styles.providerCard, isSelected && styles.providerCardSelected]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <Text style={styles.providerSub}>
                    {p.category || 'General home services'}
                  </Text>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={selected ? `Send Request to ${selected.name.split(' ')[0]}` : 'Select a provider'}
          onPress={handleSend}
          loading={submitting}
          disabled={!selected}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.lg, paddingBottom: 120 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  taskIcon: { fontSize: 28, marginRight: spacing.md },
  taskLabel: { ...typography.caption },
  taskName: { ...typography.h3 },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  providerCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  providerName: { ...typography.body, fontWeight: '700' },
  providerSub: { ...typography.caption, marginTop: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: colors.primary },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptySub: { ...typography.bodySecondary, textAlign: 'center', marginTop: spacing.xs },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
