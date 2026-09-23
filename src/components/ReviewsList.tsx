// src/components/ReviewsList.tsx
//
// A provider's reviews: a star breakdown followed by each review. Shared by
// the homeowner's view of a provider and the provider's own reviews page, so
// both always show reviews the same way.

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/app-text';
import StarRating from '@/components/StarRating';
import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
import { useItemName } from '@/hooks/useItemName';
import { formatFriendlyDate } from '@/utils/dateCalculations';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { Review } from '@/types';

interface Props {
  reviews: Review[];
  loading?: boolean;
  /** Shown when there are no reviews; wording differs by who is looking. */
  emptyText: string;
}

export default function ReviewsList({ reviews, loading = false, emptyText }: Props) {
  const { t } = useLanguage();
  const itemName = useItemName();

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />;
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>{t(emptyText)}</Text>
      </View>
    );
  }

  // How many reviews sit at each star value, for the breakdown bars.
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.stars) === star).length,
  }));

  return (
    <>
      <View style={styles.card}>
        {distribution.map(({ star, count }) => {
          const pct = (count / reviews.length) * 100;
          return (
            <View key={star} style={styles.distRow}>
              <Text style={styles.distStar}>{fmtNumber(star)}</Text>
              <Ionicons name="star" size={11} color="#E8A33D" />
              <View style={styles.distBar}>
                <View style={[styles.distFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.distCount}>{fmtNumber(count)}</Text>
            </View>
          );
        })}
      </View>

      {reviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <View style={styles.reviewAvatar}>
              <Text style={styles.reviewAvatarText}>
                {r.homeownerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewer}>{r.homeownerName}</Text>
              <Text style={styles.reviewMeta}>
                {/* Service names are often built-in templates saved in
                    English; itemName shows them in the current language. */}
                {itemName(r.serviceName)} · {formatFriendlyDate(r.createdAt)}
              </Text>
            </View>
            <StarRating value={r.stars} readonly size={13} />
          </View>
          {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  emptyText: { ...typography.bodySecondary },

  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  // Centred rather than right-aligned so the digit sits correctly in both
  // reading directions.
  distStar: { ...typography.caption, width: 12, textAlign: 'center' },
  distBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  distFill: { height: '100%', backgroundColor: '#E8A33D', borderRadius: 3 },
  distCount: { ...typography.caption, width: 22, textAlign: 'center' },

  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { color: colors.primary, fontWeight: '700' },
  reviewer: { ...typography.body, fontWeight: '600' },
  reviewMeta: { ...typography.caption, marginTop: 1 },
  reviewComment: { ...typography.bodySecondary, marginTop: spacing.sm, lineHeight: 20 },
});
