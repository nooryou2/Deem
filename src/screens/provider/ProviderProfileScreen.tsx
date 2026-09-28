import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
// src/screens/provider/ProviderProfileScreen.tsx
//
// The provider's own profile: how they appear to homeowners, what they service,
// and where they work. Area and map editing lives on a separate screen so this
// one stays scannable.

import Button from '@/components/Button';
import InputField from '@/components/InputField';
import StarRating from '@/components/StarRating';
import Text from '@/components/app-text';
import { useDialog } from '@/components/AppDialog';
import { useAuth } from '@/context/AuthContext';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';
import { getProviderRating } from '@/services/reviewService';
import {
getProviderProfile,
saveProviderAppliances,
saveProviderBio,
saveProviderServiceAreas,
} from '@/services/roleService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { ProviderRating } from '@/types';
import { APPLIANCES,applianceIcon } from '@/utils/appliances';
import { AREAS,GOVERNORATES,areaLabel } from '@/utils/areas';
import { Ionicons } from '@expo/vector-icons';
import DirectionalArrow from '@/components/DirectionalArrow';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useCallback,useState } from 'react';
import {
ActivityIndicator,
Modal,
ScrollView,
StyleSheet,
TouchableOpacity,
View,
} from 'react-native';

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderStackParamList, 'ProviderProfile'>,
  NativeStackScreenProps<ProviderStackParamList>
>;

export default function ProviderProfileScreen({ navigation }: Props) {
  const { t, tp, language } = useLanguage();
  const dialog = useDialog();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [rating, setRating] = useState<ProviderRating | null>(null);
  const [appliances, setAppliances] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [address, setAddress] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  const [servicesOpen, setServicesOpen] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [draftBio, setDraftBio] = useState('');
  const [draftAddress, setDraftAddress] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    getProviderRating(user.uid)
      .then(setRating)
      .catch(() => {});
    getProviderProfile(user.uid)
      .then((p) => {
        if (p) {
          setAppliances(p.appliances ?? []);
          setOtherText(p.otherAppliance ?? '');
          setAddress(p.address ?? '');
          setServiceAreas(p.serviceAreas ?? []);
          setBio(p.description ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(load);

  function notify(msg: string) {
    dialog.alert(msg);
  }

  async function saveServices(next: string[], nextOther: string) {
    if (!user) return;
    setSaving(true);
    try {
      await saveProviderAppliances(user.uid, next, nextOther.trim());
      setAppliances(next);
      setOtherText(nextOther);
      setServicesOpen(false);
    } catch {
      notify(t('Could not save your services.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveBio() {
    if (!user) return;
    setSaving(true);
    try {
      await saveProviderBio(user.uid, draftBio);
      setBio(draftBio.trim());
      setBioOpen(false);
    } catch {
      notify(t('Could not save your bio.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveAddress() {
    if (!user) return;
    setSaving(true);
    try {
      await saveProviderServiceAreas(user.uid, draftAddress, serviceAreas, null);
      setAddress(draftAddress.trim());
      setAddressOpen(false);
    } catch {
      notify(t('Could not save your address.'));
    } finally {
      setSaving(false);
    }
  }

  async function doLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmLogout() {
    dialog
      .confirm({
        title: 'Log out?',
        message: 'You can always log back in anytime.',
        confirmLabel: 'Log Out',
        destructive: true,
      })
      .then((ok) => ok && doLogout());
  }

  // Firebase records when the account was created, so "Joined" needs no extra
  // field of its own.
  const joined = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(language === 'ar' ? 'ar-BH' : 'en-GB', {
        month: 'short',
        year: 'numeric',
      })
    : '—';

  // Which governorates the selected areas fall under, for the summary line.
  const coveredGovernorates = GOVERNORATES.filter((g) =>
    serviceAreas.some((id) => AREAS.find((a) => a.id === id)?.governorate === g),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Identity */}
      <View style={styles.headerCard}>
        <View style={styles.headerBanner} />
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.name}>{user?.displayName || t('Service Provider')}</Text>
        <Text ltr style={styles.email}>{user?.email}</Text>

        {rating && rating.count > 0 ? (
          <TouchableOpacity
            style={styles.ratingRow}
            activeOpacity={0.6}
            accessibilityRole="button"
            onPress={() => user && navigation.navigate('ProviderReviews', { providerId: user.uid })}
          >
            <StarRating value={rating.averageStars} readonly size={16} />
            <Text style={styles.ratingText}>
              {fmtNumber(Number(rating.averageStars.toFixed(1)))}{' '}
              <Text style={styles.ratingCount}>({tp('reviews', rating.count)})</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noRating}>{t('No reviews yet')}</Text>
        )}

        {/* Stat strip */}
        <View style={styles.statStrip}>
          <View style={styles.stat}>
            <Ionicons name="shield-checkmark-outline" size={17} color={colors.completed} />
            <Text style={styles.statValue}>
              {rating && rating.count >= 5 ? t('5+ reviews') : t('New')}
            </Text>
            <Text style={styles.statLabel}>{t('Business')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="calendar-outline" size={17} color={colors.primary} />
            <Text style={styles.statValue}>{t('Joined')}</Text>
            <Text style={styles.statLabel}>{joined}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="location-outline" size={17} color={colors.primary} />
            <Text style={styles.statValue}>{t('Based in')}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {serviceAreas.length > 0 ? areaLabel(serviceAreas[0]) : t('Not set')}
            </Text>
          </View>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{t('About your business')}</Text>
          <Text style={styles.sectionSub}>{t('What homeowners read before choosing you.')}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setDraftBio(bio);
            setBioOpen(true);
          }}
        >
          <Ionicons name="pencil" size={13} color={colors.primary} />
          <Text style={styles.editBtnText}>{t('Edit')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={bio ? styles.bioText : styles.placeholderText}>
          {bio || t('Add a short description so homeowners know what you do.')}
        </Text>
      </View>

      {/* Services */}
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{t('Services you offer')}</Text>
          <Text style={styles.sectionSub}>{t('Homeowners find you by these.')}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setServicesOpen(true)}>
          <Ionicons name="options-outline" size={13} color={colors.primary} />
          <Text style={styles.editBtnText}>{t('Manage')}</Text>
        </TouchableOpacity>
      </View>
      {appliances.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.placeholderText}>
            {t('No services selected yet — tap Manage to choose what you fix.')}
          </Text>
        </View>
      ) : (
        <View style={styles.serviceGrid}>
          {appliances.map((a) => (
            <View key={a} style={styles.serviceTile}>
              <Text style={styles.serviceIcon}>{applianceIcon(a)}</Text>
              <Text style={styles.serviceLabel} numberOfLines={2}>
                {t(areaLabelSafe(a))}
              </Text>
            </View>
          ))}
        </View>
      )}
      {otherText ? (
        <Text style={styles.alsoFixes}>
          {t('Also fixes:')} {otherText}
        </Text>
      ) : null}

      {/* Areas — editing lives on its own screen */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>{t('Areas you cover')}</Text>
      <Text style={styles.sectionSub}>{t('Manage areas and set your coverage location.')}</Text>
      <TouchableOpacity
        style={styles.linkRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ProviderAreas')}
      >
        <View style={styles.linkIcon}>
          <Ionicons name="globe-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.linkTitle}>
            {serviceAreas.length === 0
              ? t('No areas selected')
              : tp('areasSelected', serviceAreas.length)}
          </Text>
          <Text style={styles.linkSub} numberOfLines={1}>
            {coveredGovernorates.length > 0
              ? coveredGovernorates.join(', ')
              : t('Tap to choose where you work')}
          </Text>
        </View>
        <DirectionalArrow kind="forward" shape="chevron" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Address */}
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{t('Your address')}</Text>
          <Text style={styles.sectionSub}>{t('Where your business is based.')}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setDraftAddress(address);
            setAddressOpen(true);
          }}
        >
          <Ionicons name="pencil" size={13} color={colors.primary} />
          <Text style={styles.editBtnText}>{t('Edit')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.linkRow}>
        <View style={styles.linkIcon}>
          <Ionicons name="business-outline" size={20} color={colors.primary} />
        </View>
        <Text style={[address ? styles.linkTitle : styles.placeholderText, { flex: 1 }]}>
          {address || t('No address added yet')}
        </Text>
      </View>

      <Button
        label={t('Log Out')}
        variant="danger"
        onPress={confirmLogout}
        loading={loggingOut}
        style={{ marginTop: spacing.xl }}
      />

      {/* ---- Manage services ---- */}
      <Modal visible={servicesOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('Services you offer')}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {APPLIANCES.map((a) => {
                const on = appliances.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={styles.checkRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      setAppliances((prev) =>
                        on ? prev.filter((x) => x !== a.id) : [...prev, a.id],
                      )
                    }
                  >
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={21}
                      color={on ? colors.primary : colors.border}
                    />
                    <Text style={styles.checkIcon}>{a.icon}</Text>
                    <Text style={styles.checkLabel}>{t(a.label)}</Text>
                  </TouchableOpacity>
                );
              })}
              {appliances.includes('other') && (
                <InputField
                  label={t('Describe the other service')}
                  placeholder={t('e.g. Curtain fitting')}
                  value={otherText}
                  onChangeText={setOtherText}
                />
              )}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Button
                label={t('Cancel')}
                variant="secondary"
                onPress={() => {
                  setServicesOpen(false);
                  load();
                }}
                style={{ flex: 1 }}
              />
              <Button
                label={t('Save')}
                onPress={() => saveServices(appliances, otherText)}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- Edit bio ---- */}
      <Modal visible={bioOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('About your business')}</Text>
            <InputField
              label=""
              placeholder={t('We provide reliable home services…')}
              value={draftBio}
              onChangeText={setDraftBio}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
            <View style={styles.sheetActions}>
              <Button
                label={t('Cancel')}
                variant="secondary"
                onPress={() => setBioOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label={t('Save')} onPress={saveBio} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- Edit address ---- */}
      <Modal visible={addressOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('Your address')}</Text>
            <InputField
              label=""
              placeholder={t('Building 123, Road 45, Manama')}
              value={draftAddress}
              onChangeText={setDraftAddress}
              multiline
              numberOfLines={2}
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />
            <View style={styles.sheetActions}>
              <Button
                label={t('Cancel')}
                variant="secondary"
                onPress={() => setAddressOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                label={t('Save')}
                onPress={saveAddress}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/** Appliance labels come from the appliance catalogue, not the area one. */
function areaLabelSafe(id: string): string {
  return APPLIANCES.find((a) => a.id === id)?.label ?? id;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingBottom: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  headerBanner: { height: 74, alignSelf: 'stretch', backgroundColor: '#DDB176' },
  avatarWrap: { marginTop: -38 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarText: { color: colors.white, fontSize: 30, fontWeight: '700' },
  name: { ...typography.h2, marginTop: spacing.sm },
  email: { ...typography.caption, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  ratingText: { ...typography.caption, fontWeight: '600' },
  // Same gold as the stars it sits beside.
  ratingCount: { color: '#E8A33D', fontWeight: '700' },
  noRating: { ...typography.caption, marginTop: spacing.sm },

  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statValue: { ...typography.caption, fontWeight: '700', color: colors.textPrimary },
  statLabel: { ...typography.caption },

  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.lg },
  sectionTitle: { ...typography.h3 },
  sectionSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.sm },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  editBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  bioText: { ...typography.bodySecondary, lineHeight: 21 },
  placeholderText: { ...typography.caption },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  serviceTile: {
    width: '31%',
    aspectRatio: 1.15,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  serviceIcon: { fontSize: 20 },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alsoFixes: { ...typography.caption, marginTop: spacing.sm, fontStyle: 'italic' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.body, fontWeight: '600' },
  linkSub: { ...typography.caption, marginTop: 1 },

  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkIcon: { fontSize: 16 },
  checkLabel: { ...typography.body, flex: 1 },
});
