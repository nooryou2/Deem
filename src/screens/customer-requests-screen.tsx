import Button from '@/components/Button';
import ServiceProgressTracker from '@/components/ServiceProgressTracker';
import Text from '@/components/app-text';
import AttachmentPicker from '@/components/attachment-picker';
import QuoteCard from '@/components/quote-card';
import { useCustomerJobs } from '@/hooks/useCustomerJobs';
import { useLanguage } from '@/i18n/LanguageContext';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { colors,radius,typography } from '@/theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator,ScrollView,View } from 'react-native';
export default function CustomerRequestsScreen({
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'MyRequests'>) {
  const { t } = useLanguage();
  const { jobs, loading, error, retry } = useCustomerJobs();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 24,
        gap: 20,
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
      }}
    >
      {loading && <ActivityIndicator color={colors.primary} />}
      {!!error && (
        <>
          <Text style={{ color: colors.danger }}>{t(error)}</Text>
          <Button label={t('Retry')} onPress={retry} />
        </>
      )}
      {!loading && !error && !jobs.length && (
        <>
          <Text style={typography.h3}>{t('No requests yet')}</Text>
          <Button label={t('Book a Service')} onPress={() => navigation.navigate('Booking')} />
        </>
      )}
      {jobs.map((job) => (
        <View
          key={`${job.jobType}_${job.id}`}
          style={{
            padding: 20,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={typography.h3}>{job.serviceType}</Text>
          <Text style={typography.bodySecondary}>{job.providerName}</Text>
          {!!job.preferredDate && (
            <Text style={typography.body}>
              {job.preferredDate.slice(0, 10)} · {job.timeSlot ?? ''}
            </Text>
          )}
          {!!job.location && (
            <Text style={typography.bodySecondary}>
              {job.location.label} · {job.location.address}
            </Text>
          )}
          {!!job.notes && <Text style={[typography.body, { marginTop: 12 }]}>{job.notes}</Text>}
          <ServiceProgressTracker status={job.status} providerName={job.providerName} />
          <AttachmentPicker value={job.attachments ?? []} readonly />
          {job.status !== 'declined' && (
            <QuoteCard
              jobId={job.id}
              jobType={job.jobType}
              providerId={job.providerId}
              customerId={job.homeownerId}
              canRespond={job.status === 'pending' || job.status === 'accepted'}
            />
          )}
          {job.maintenanceItemId && (
            <Button
              label={t('Device file')}
              variant="secondary"
              onPress={() =>
                navigation.navigate('MaintenanceDetail', { itemId: job.maintenanceItemId! })
              }
            />
          )}
          {job.status === 'completed' && (
            <Button
              label={t('Rate Service')}
              variant="secondary"
              onPress={() =>
                navigation.navigate('WriteReview', {
                  providerId: job.providerId,
                  providerName: job.providerName,
                  jobId: job.id,
                  jobType: job.jobType,
                  serviceName: job.serviceType,
                  servicedDate: job.preferredDate ?? undefined,
                })
              }
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
