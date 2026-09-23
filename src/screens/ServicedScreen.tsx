import { useLanguage } from '@/i18n/LanguageContext';
import { useItemName } from '@/hooks/useItemName';
// src/screens/ServicedScreen.tsx
//
// A log of every completed service visit. A recurring task appears once per
// visit, so a monthly job shows a separate, individually reviewable entry for
// each month it was serviced.

import SearchBar from '@/components/SearchBar';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { ServiceLogEntry,fetchServiceLog } from '@/services/maintenanceService';
import { fetchReviewedJobIds } from '@/services/reviewService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { formatFriendlyDate } from '@/utils/dateCalculations';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useCallback,useMemo,useState } from 'react';
import { ActivityIndicator,FlatList,StyleSheet,TouchableOpacity,View } from 'react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'Serviced'>;

export default function ServicedScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const itemName = useItemName();
  const { user } = useAuth();
  const [entries, setEntries] = useState<ServiceLogEntry[]>([]);
  const [reviewedJobs, setReviewedJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetchServiceLog(user.uid)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchReviewedJobIds(user.uid)
      .then(setReviewedJobs)
      .catch(() => {});
  }, [user]);

  useFocusEffect(load);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.maintenanceItemName.toLowerCase().includes(q) ||
        (e.providerName ?? '').toLowerCase().includes(q),
    );
  }, [entries, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('Search serviced history…')}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const reviewed = reviewedJobs.includes(item.jobId ?? item.id);
          // Only provider-performed visits can be rated — a self-logged
          // service has nobody to review.
          const canReview = Boolean(item.providerId) && !reviewed;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Ionicons name="checkmark-done" size={20} color={colors.completed} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{itemName(item.maintenanceItemName)}</Text>
                  <Text style={styles.date}>
                    {t('Serviced')} {formatFriendlyDate(item.completedDate)}
                  </Text>
                  {item.providerName ? (
                    <Text style={styles.provider}>
                      {t('by')} {item.providerName}
                    </Text>
                  ) : (
                    <Text style={styles.selfLogged}>{t('Logged by you')}</Text>
                  )}
                </View>
              </View>

              {canReview && (
                <TouchableOpacity
                  style={styles.rateBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('WriteReview', {
                      providerId: item.providerId!,
                      providerName: item.providerName ?? 'Provider',
                      jobId: item.jobId ?? item.id,
                      jobType: item.jobType ?? 'request',
                      serviceName: item.maintenanceItemName,
                      servicedDate: item.completedDate,
                    })
                  }
                >
                  <Ionicons name="star-outline" size={15} color={colors.white} />
                  <Text style={styles.rateBtnText}>{t('Rate this service')}</Text>
                </TouchableOpacity>
              )}

              {reviewed && (
                <View style={styles.ratedRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.completed} />
                  <Text style={styles.ratedText}>{t('You rated this service')}</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {search ? t('No matches') : t('No services logged yet')}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? t('Nothing matches "{query}".', { query: search })
                : t('When you mark a task complete, each visit appears here.')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  searchRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.completedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  name: { ...typography.body, fontWeight: '700' },
  date: { ...typography.caption, marginTop: 2 },
  provider: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: 1 },
  selfLogged: { ...typography.caption, marginTop: 1, fontStyle: 'italic' },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    marginTop: spacing.md,
  },
  rateBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  ratedText: { ...typography.caption, color: colors.completed, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
  emptySub: {
    ...typography.bodySecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
