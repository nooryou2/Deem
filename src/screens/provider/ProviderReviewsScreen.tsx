// src/screens/provider/ProviderReviewsScreen.tsx
//
// Every review a provider has received, opened by tapping the rating on their
// profile.

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Text from '@/components/app-text';
import StarRating from '@/components/StarRating';
import ReviewsList from '@/components/ReviewsList';
import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
import { fetchProviderReviews } from '@/services/reviewService';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { Review } from '@/types';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';

type Props = NativeStackScreenProps<ProviderStackParamList, 'ProviderReviews'>;

export default function ProviderReviewsScreen({ route }: Props) {
  const { providerId } = route.params;
  const { t, tp } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Reloads on focus so a review that arrives while away shows on return.
  useFocusEffect(
    useCallback(() => {
      fetchProviderReviews(providerId)
        .then(setReviews)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [providerId])
  );

  // Worked out from the reviews themselves, so the summary always agrees with
  // the list below it.
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length
    : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {reviews.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.average}>{fmtNumber(Number(average.toFixed(1)))}</Text>
          <StarRating value={average} readonly size={20} />
          <Text style={styles.count}>{tp('reviews', reviews.length)}</Text>
        </View>
      )}

      <ReviewsList
        reviews={reviews}
        loading={loading}
        emptyText="No reviews yet. Reviews appear here after customers rate a completed service."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  average: { fontSize: 40, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  count: { ...typography.caption, marginTop: spacing.sm, textAlign: 'center' },
});
