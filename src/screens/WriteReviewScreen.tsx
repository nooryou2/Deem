import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/WriteReviewScreen.tsx
//
// Shown after a job is marked completed. The homeowner rates the service with
// stars and an optional comment. The out-of-10 score is derived from the stars.

import Button from '@/components/Button';
import InputField from '@/components/InputField';
import StarRating from '@/components/StarRating';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { submitReview } from '@/services/reviewService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useState } from 'react';
import { Alert,Platform,ScrollView,StyleSheet,View } from 'react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'WriteReview'>;

// Plain wording for each star value. The out-of-10 figure is simply the star
// rating doubled, so the user only has to make one judgement.
function scoreLabel(stars: number): string {
  switch (stars) {
    case 1:
      return 'Very poor';
    case 2:
      return 'Poor';
    case 3:
      return 'Okay';
    case 4:
      return 'Good';
    default:
      return 'Excellent';
  }
}

export default function WriteReviewScreen({ navigation, route }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { providerId, providerName, jobId, jobType, serviceName } = route.params;

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Review', msg);
  }

  async function handleSubmit() {
    setError('');
    if (stars === 0) {
      setError('Please choose a star rating.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await submitReview({
        providerId,
        providerName,
        homeownerId: user.uid,
        homeownerName: user.displayName ?? 'Customer',
        jobId,
        jobType,
        serviceName,
        stars,
        comment: comment.trim(),
        servicedDate: route.params.servicedDate,
      });
      notify('Thanks for your review!');
      navigation.goBack();
    } catch (e) {
      console.log('submitReview failed:', e);
      setError(
        e instanceof Error && e.message === 'ALREADY_REVIEWED'
          ? t('You rated this service')
          : t('Could not submit your review. Please try again.'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(providerName || serviceName).charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.provider}>{providerName || serviceName}</Text>
        <Text style={styles.service}>{providerName ? serviceName : t('Serviced by you')}</Text>
      </View>

      {/* Stars */}
      <View style={styles.card}>
        <Text style={styles.question}>
          {providerName ? t('How was the service?') : t('How did this service go?')}
        </Text>
        <View style={styles.starsWrap}>
          <StarRating value={stars} onChange={setStars} size={36} />
        </View>
        {stars > 0 && (
          <Text style={styles.starsLabel}>
            {t(scoreLabel(stars))} · {stars * 2}/10
          </Text>
        )}
      </View>

      {/* Comment */}
      <View style={styles.card}>
        <Text style={styles.question}>{t('Add a comment (optional)')}</Text>
        <InputField
          label=""
          placeholder={t('What went well, or what could be better?')}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />
      </View>

      {error ? <Text style={styles.error}>{t(error)}</Text> : null}

      <Button label={t('Submit Review')} onPress={handleSubmit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '700' },
  provider: { ...typography.h3 },
  service: { ...typography.bodySecondary, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  question: { ...typography.body, fontWeight: '700', marginBottom: spacing.md },
  starsWrap: { alignItems: 'center' },
  starsLabel: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
});
