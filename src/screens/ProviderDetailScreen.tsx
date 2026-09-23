import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
// src/screens/ProviderDetailScreen.tsx
//
// The homeowner's view of a service provider: who they are, what they fix,
// where they work, and what other customers have said.

import StarRating from '@/components/StarRating';
import ReviewsList from '@/components/ReviewsList';
import Text from '@/components/app-text';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { fetchProviderReviews } from '@/services/reviewService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { Review } from '@/types';
import { applianceIcon,applianceLabel } from '@/utils/appliances';
import { areaLabel } from '@/utils/areas';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useEffect,useState } from 'react';
import { ScrollView,StyleSheet,View } from 'react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'ProviderDetail'>;

export default function ProviderDetailScreen({ route }: Props) {
  const { t, tp } = useLanguage();
  const { provider, distance } = route.params;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderReviews(provider.uid)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [provider.uid]);

  const rating = provider.rating;
  const appliances = provider.appliances ?? [];
  const areas = provider.serviceAreas ?? [];


  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{provider.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{provider.name}</Text>

        {rating && rating.count > 0 ? (
          <>
            <View style={styles.headerRating}>
              <StarRating value={rating.averageStars} readonly size={18} />
            </View>
            <Text style={styles.headerRatingText}>
              {fmtNumber(Number(rating.averageStars.toFixed(1)))} · {tp('reviews', rating.count)}
            </Text>
          </>
        ) : (
          <Text style={styles.noRating}>{t('No reviews yet')}</Text>
        )}

        {distance != null && (
          <View style={styles.distancePill}>
            <Ionicons name="location-outline" size={13} color={colors.primary} />
            <Text style={styles.distanceText}>
              {distance < 1
                ? t('{distance} m away', { distance: Math.round(distance * 1000) })
                : t('{distance} km away', { distance: Number(distance.toFixed(1)) })}
            </Text>
          </View>
        )}
      </View>

      {/* Services */}
      <Text style={styles.sectionTitle}>{t('Services offered')}</Text>
      <View style={styles.card}>
        {appliances.length === 0 ? (
          <Text style={styles.emptyText}>
            {t("This provider hasn't listed their services yet.")}
          </Text>
        ) : (
          <View style={styles.tagWrap}>
            {appliances.map((a) => (
              <View key={a} style={styles.tag}>
                <Text style={styles.tagIcon}>{applianceIcon(a)}</Text>
                <Text style={styles.tagText}>{t(applianceLabel(a))}</Text>
              </View>
            ))}
          </View>
        )}
        {provider.otherAppliance ? (
          <Text style={styles.alsoFixes}>
            {t('Also fixes:')} {provider.otherAppliance}
          </Text>
        ) : null}
      </View>

      {/* Coverage */}
      <Text style={styles.sectionTitle}>{t('Areas covered')}</Text>
      <View style={styles.card}>
        {areas.length === 0 ? (
          <Text style={styles.emptyText}>{t('Works across all areas.')}</Text>
        ) : (
          <View style={styles.tagWrap}>
            {areas.map((a) => (
              <View key={a} style={styles.areaTag}>
                <Text style={styles.areaTagText}>{t(areaLabel(a))}</Text>
              </View>
            ))}
          </View>
        )}
        {provider.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="business-outline" size={16} color={colors.textMuted} />
            <Text style={styles.addressText}>{provider.address}</Text>
          </View>
        ) : null}
      </View>

      {/* Reviews */}
      <Text style={styles.sectionTitle}>
        {t('Reviews')} {reviews.length > 0 ? ` (${reviews.length})` : ''}
      </Text>

      <ReviewsList
        reviews={reviews}
        loading={loading}
        emptyText="No reviews yet. Be the first to rate this provider after a service."
      />
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

  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 30 },
  name: { ...typography.h2, textAlign: 'center' },
  headerRating: { marginTop: spacing.sm },
  headerRatingText: { ...typography.bodySecondary, marginTop: spacing.xs, fontWeight: '600' },
  noRating: { ...typography.caption, marginTop: spacing.sm },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  distanceText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  emptyText: { ...typography.bodySecondary },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  tagIcon: { fontSize: 14 },
  tagText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  alsoFixes: { ...typography.caption, marginTop: spacing.md, fontStyle: 'italic' },
  areaTag: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  areaTagText: { ...typography.caption, fontWeight: '600' },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addressText: { ...typography.caption, flex: 1 },


});
