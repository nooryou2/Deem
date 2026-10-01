import Button from '@/components/Button';
import { useCustomerJobs } from '@/hooks/useCustomerJobs';
import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
import { formatFriendlyDate, formatTimeSlot } from '@/utils/dateCalculations';
// src/screens/DashboardScreen.tsx
import EmptyState from '@/components/EmptyState';
import MaintenanceCard from '@/components/MaintenanceCard';
import SummaryTile from '@/components/SummaryTile';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { colors } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Platform,RefreshControl,ScrollView,StyleSheet,TouchableOpacity,View } from 'react-native';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainStackParamList, 'Dashboard'>,
  NativeStackScreenProps<MainStackParamList>
>;

export default function DashboardScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { jobs, loading: jobsLoading, error: jobsError, retry } = useCustomerJobs();
  const activeJobs = jobs.filter((job) =>
    ['pending', 'accepted', 'in_progress'].includes(job.status),
  );
  const nextJob = activeJobs
    .filter(
      (job) =>
        job.status === 'accepted' &&
        job.preferredDate &&
        new Date(job.preferredDate.slice(0, 10) + 'T' + (job.timeSlot || '23:59') + ':00') >=
          new Date(),
    )
    .sort((a, b) =>
      (a.preferredDate! + (a.timeSlot ?? '')).localeCompare(b.preferredDate! + (b.timeSlot ?? '')),
    )[0];
  const { items, summary, loading, error: itemsError, refresh } = useMaintenanceItems();
  const [refreshing, setRefreshing] = React.useState(false);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [contentHeight, setContentHeight] = React.useState(0);
  // Ignore tiny layout/padding differences. The dashboard should only scroll
  // when there is genuinely more content than fits on screen.
  const canScroll =
    viewportHeight > 0 &&
    contentHeight > viewportHeight + 48;

  const priorityItems = items
    .filter(
      (i) =>
        i.bookingStatus !== 'pending' &&
        i.bookingStatus !== 'declined' &&
        (i.status === 'overdue' || i.status === 'due_soon'),
    )
    .slice(0, 5);

  const firstName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <ScrollView
      style={[
        styles.flex,
        Platform.OS === 'web' && !canScroll ? styles.noWebScroll : null,
      ]}
      contentContainerStyle={[
        styles.container,
        priorityItems.length === 0 && styles.compactContainer,
      ]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={canScroll}
      bounces={canScroll}
      alwaysBounceVertical={false}
      overScrollMode="never"
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      onContentSizeChange={(_, height) => setContentHeight(height)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#7A4100"
          onRefresh={async () => {
            setRefreshing(true);
            retry();
            await refresh();
            setRefreshing(false);
          }}
        />
      }
    >
      {/* Header Section */}
      <View style={styles.headerBlock}>
        <View style={styles.greetingWrapper}>
          <Text style={styles.greeting}>
            {t('Hi,')} {firstName}
          </Text>
        </View>
        <Text style={styles.mainTitle}>{t('Your home at a glance')}</Text>
      </View>

      {/* Primary call to action — book a service with a provider */}
      <TouchableOpacity
        style={styles.bookBtn}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Booking', undefined)}
      >
        <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
        <Text style={styles.bookBtnText}>{t('Book a Service')}</Text>
      </TouchableOpacity>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Text style={styles.sectionTitle}>{t('Next appointment')}</Text>
        <Text style={{ color: colors.textSecondary }}>
          {nextJob
            ? `${nextJob.serviceType} · ${formatFriendlyDate(nextJob.preferredDate)}${nextJob.timeSlot ? ` · ${formatTimeSlot(nextJob.timeSlot)}` : ''}`
            : t('No scheduled appointments')}
        </Text>
        <Text style={{ color: colors.textPrimary }}>
          {t('Active requests')}: {jobsLoading ? '…' : fmtNumber(activeJobs.length)}
        </Text>
        {!!jobsError && <Text style={{ color: colors.danger }}>{t(jobsError)}</Text>}
        <Button
          label={t('My Requests')}
          variant="secondary"
          onPress={() => navigation.navigate('MyRequests')}
        />
      </View>
      {/* Summary Tiles Grid */}
      <View style={styles.tilesContainer}>
        <View style={styles.tilesRow}>
          <SummaryTile
            label={t('Overdue')}
            value={summary.overdue}
            color="#D92D20"
            backgroundColor="#FEE4E2"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'overdue' })}
          />
          <SummaryTile
            label={t('Due Soon')}
            value={summary.dueSoon}
            color="#B54708"
            backgroundColor="#FEF0C7"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'due_soon' })}
          />
        </View>

        <View style={styles.tilesRow}>
          <SummaryTile
            label={t('Upcoming')}
            value={summary.upcoming}
            color="#026AA2"
            backgroundColor="#E0F2FE"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'upcoming' })}
          />
          <SummaryTile
            label={t('On Track')}
            value={summary.onTrack}
            color="#079455"
            backgroundColor="#D1FADF"
            onPress={() => navigation.navigate('Serviced')}
          />
        </View>

        <View style={styles.tilesRow}>
          <SummaryTile
            label={t('Total Items')}
            value={summary.total}
            color="#7A4100"
            backgroundColor="#FAF5EA"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'all' })}
          />
        </View>
      </View>

      {!!itemsError && (
        <Text style={{ color: colors.danger }}>{t('Could not load. Please try again.')}</Text>
      )}
      {/* Priority maintenance list */}
      <View style={styles.listContainer}>
        {!loading && priorityItems.length === 0 ? (
          <EmptyState
            variant="success"
            compact
            title={t("You're all caught up!")}
            subtitle={t('Nothing overdue or due soon right now. Enjoy your day.')}
          />
        ) : (
          priorityItems.map((item) => (
            <MaintenanceCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('MaintenanceDetail', { itemId: item.id })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  compactContainer: {
    paddingBottom: 8,
  },
  noWebScroll: {
    overflow: 'hidden',
  } as any,

  // Header
  headerBlock: {
    marginBottom: 20,
    marginTop: 10,
  },
  greetingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B6257',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: -0.5,
  },

  // Book a Service CTA
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#D9A15C',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 22,
    shadowColor: '#7A4100',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Tiles Layout
  tilesContainer: {
    marginBottom: 20,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  listContainer: {
    gap: 12,
  },
});
