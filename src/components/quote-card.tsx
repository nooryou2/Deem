import Text from '@/components/app-text';
import { useLanguage } from '@/i18n/LanguageContext';
import { respondToQuote,saveQuote,watchQuote } from '@/services/quoteService';
import { colors,radius,typography } from '@/theme/theme';
import type { ServiceQuote } from '@/types';
import React,{ useEffect,useState } from 'react';
import { ActivityIndicator,View } from 'react-native';
import Button from './Button';
import InputField from './InputField';

export default function QuoteCard({
  jobId,
  jobType,
  providerId,
  customerId,
  canOffer = false,
  canRespond = false,
}: {
  jobId: string;
  jobType: 'booking' | 'request';
  providerId: string;
  customerId: string;
  canOffer?: boolean;
  canRespond?: boolean;
}) {
  const { t } = useLanguage();
  const [quote, setQuote] = useState<ServiceQuote | null>(null);
  const [inspection, setInspection] = useState('');
  const [service, setService] = useState('');
  const [scope, setScope] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError('');
    return watchQuote(
      jobType,
      jobId,
      (value) => {
        setQuote(value);
        setLoading(false);
        if (value) {
          setInspection(String(value.inspectionFee));
          setService(String(value.servicePrice));
          setScope(value.scope);
        }
      },
      () => {
        setLoading(false);
        setError(t('Could not load. Please try again.'));
      },
    );
  }, [jobType, jobId, retry]);
  async function submit(status?: 'accepted' | 'declined') {
    setBusy(true);
    setError('');
    try {
      if (status && quote) await respondToQuote(quote, status);
      else {
        if (!inspection.trim() || !service.trim()) throw new Error('INVALID_QUOTE');
        await saveQuote({
          jobId,
          jobType,
          providerId,
          customerId,
          inspectionFee: Number(inspection),
          servicePrice: Number(service),
          scope,
        });
      }
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message === 'INVALID_QUOTE'
            ? 'Enter valid amounts and describe the work.'
            : 'Could not save. Please try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        padding: 20,
        marginVertical: 16,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
      }}
    >
      <Text style={typography.h3}>{t('Price details')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : quote ? (
        <>
          <Text style={typography.body}>
            {t('Inspection fee')}: {quote.inspectionFee.toFixed(3)} {t('BHD')}
          </Text>
          <Text style={typography.body}>
            {t('Service price')}: {quote.servicePrice.toFixed(3)} {t('BHD')}
          </Text>
          <Text style={typography.h3}>
            {t('Total')}: {quote.total.toFixed(3)} {t('BHD')}
          </Text>
          <Text style={typography.body}>{quote.scope}</Text>
          <Text style={{ color: colors.primaryDark }}>
            {t(
              quote.status === 'accepted'
                ? 'Quote accepted'
                : quote.status === 'declined'
                  ? 'Quote declined'
                  : canOffer
                    ? 'Awaiting customer approval'
                    : 'Awaiting your approval',
            )}
          </Text>
          {canRespond && quote.status === 'pending' && (
            <>
              <Button label={t('Accept quote')} loading={busy} onPress={() => submit('accepted')} />
              <Button
                label={t('Decline quote')}
                disabled={busy}
                variant="secondary"
                onPress={() => submit('declined')}
              />
            </>
          )}
        </>
      ) : (
        <Text style={typography.bodySecondary}>{t('Quote pending')}</Text>
      )}
      {!quote && (
        <Text style={typography.bodySecondary}>
          {t('The provider will send a quote. Work starts only after you accept the total.')}
        </Text>
      )}
      {canOffer && !loading && quote?.status !== 'accepted' && (
        <>
          <InputField
            label={t('Inspection fee')}
            value={inspection}
            onChangeText={setInspection}
            keyboardType="decimal-pad"
          />
          <InputField
            label={t('Service price')}
            value={service}
            onChangeText={setService}
            keyboardType="decimal-pad"
          />
          <InputField label={t('Scope of work')} value={scope} onChangeText={setScope} multiline />
          <Button label={t('Send quote')} loading={busy} onPress={() => submit()} />
        </>
      )}
      {!!error && (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
          <Button label={t('Retry')} variant="secondary" onPress={() => setRetry((n) => n + 1)} />
        </>
      )}
    </View>
  );
}
