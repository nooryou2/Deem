// src/screens/provider/ProviderProfileScreen.tsx
//
// The provider's own profile: how they appear to homeowners, what they service,
// and where they work. Area and map editing lives on a separate screen so this
// one stays scannable.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import {
  getProviderProfile,
  saveProviderAppliances,
  saveProviderServiceAreas,
  saveProviderBio,
} from '@/services/roleService';
import { getProviderRating } from '@/services/reviewService';
import Button from '@/components/Button';
import InputField from '@/components/InputField';
import StarRating from '@/components/StarRating';
import { APPLIANCES, applianceIcon } from '@/utils/appliances';
import { areaLabel, GOVERNORATES, AREAS } from '@/utils/areas';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { ProviderRating } from '@/types';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderStackParamList, 'ProviderProfile'>,
  NativeStackScreenProps<ProviderStackParamList>
>;

export default function ProviderProfileScreen({ navigation }: Props) {
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
    getProviderRating(user.uid).then(setRating).catch(() => {});
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
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Profile', msg);
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
      notify('Could not save your services.');
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
      notify('Could not save your bio.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAddress() {
    if (!user) return;
    setSaving(true);
    try {
      await saveProviderServiceAreas(
        user.uid,
        draftAddress,
        serviceAreas,
        null
      );
      setAddress(draftAddress.trim());
      setAddressOpen(false);
    } catch {
      notify('Could not save your address.');
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
    if (Platform.OS === 'web') {
      if (window.confirm('Log out? You can always log back in anytime.')) doLogout();
      return;
    }
    Alert.alert('Log out?', 'You can always log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: doLogout },
    ]);
  }

  // Firebase records when the account was created, so "Joined" needs no extra
  // field of its own.
  const joined = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : '—';

  // Which governorates the selected areas fall under, for the summary line.
  const coveredGovernorates = GOVERNORATES.filter((g) =>
    serviceAreas.some((id) => AREAS.find((a) => a.id === id)?.governorate === g)
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

        <Text style={styles.name}>{user?.displayName || 'Service Provider'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {rating && rating.count > 0 ? (
          <View style={styles.ratingRow}>
            <StarRating value={rating.averageStars} readonly size={16} />
            <Text style={styles.ratingText}>
              {rating.averageStars.toFixed(1)} ({rating.count} review
              {rating.count === 1 ? '' : 's'})
            </Text>
          </View>
        ) : (
          <Text style={styles.noRating}>No reviews yet</Text>
        )}

        {/* Stat strip */}
        <View style={styles.statStrip}>
          <View style={styles.stat}>
            <Ionicons name="shield-checkmark-outline" size={17} color={colors.completed} />
            <Text style={styles.statValue}>
              {rating && rating.count >= 5 ? 'Verified' : 'New'}
            </Text>
            <Text style={styles.statLabel}>Business</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="calendar-outline" size={17} color={colors.primary} />
            <Text style={styles.statValue}>Joined</Text>
            <Text style={styles.statLabel}>{joined}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="location-outline" size={17} color={colors.primary} />
            <Text style={styles.statValue}>Based in</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {serviceAreas.length > 0 ? areaLabel(serviceAreas[0]) : 'Not set'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>About your business</Text>
          <Text style={styles.sectionSub}>What homeowners read before choosing you.</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setDraftBio(bio);
            setBioOpen(true);
          }}
        >
          <Ionicons name="pencil" size={13} color={colors.primary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={bio ? styles.bioText : styles.placeholderText}>
          {bio || 'Add a short description so homeowners know what you do.'}
        </Text>
      </View>

      {/* Services */}
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Services you offer</Text>
          <Text style={styles.sectionSub}>Homeowners find you by these.</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setServicesOpen(true)}>
          <Ionicons name="options-outline" size={13} color={colors.primary} />
          <Text style={styles.editBtnText}>Manage</Text>
        </TouchableOpacity>
      </View>
      {appliances.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.placeholderText}>
            No services selected yet — tap Manage to choose what you fix.
          </Text>
        </View>
      ) : (
        <View style={styles.serviceGrid}>
          {appliances.map((a) => (
            <View key={a} style={styles.serviceTile}>
              <Text style={styles.serviceIcon}>{applianceIcon(a)}</Text>
              <Text style={styles.serviceLabel} numberOfLines={2}>
                {areaLabelSafe(a)}
              </Text>
            </View>
          ))}
        </View>
      )}
      {otherText ? <Text style={styles.alsoFixes}>Also fixes: {otherText}</Text> : null}

      {/* Areas — editing lives on its own screen */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Areas you cover</Text>
      <Text style={styles.sectionSub}>Manage areas and set your coverage location.</Text>
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
              ? 'No areas selected'
              : `${serviceAreas.length} area${serviceAreas.length === 1 ? '' : 's'} selected`}
          </Text>
          <Text style={styles.linkSub} numberOfLines={1}>
            {coveredGovernorates.length > 0
              ? coveredGovernorates.join(', ')
              : 'Tap to choose where you work'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Address */}
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Your address</Text>
          <Text style={styles.sectionSub}>Where your business is based.</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setDraftAddress(address);
            setAddressOpen(true);
          }}
        >
          <Ionicons name="pencil" size={13} color={colors.primary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.linkRow}>
        <View style={styles.linkIcon}>
          <Ionicons name="business-outline" size={20} color={colors.primary} />
        </View>
        <Text style={[address ? styles.linkTitle : styles.placeholderText, { flex: 1 }]}>
          {address || 'No address added yet'}
        </Text>
      </View>

      <Button
        label="Log Out"
        variant="danger"
        onPress={confirmLogout}
        loading={loggingOut}
        style={{ marginTop: spacing.xl }}
      />

      {/* ---- Manage services ---- */}
      <Modal visible={servicesOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Services you offer</Text>
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
                        on ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                      )
                    }
                  >
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={21}
                      color={on ? colors.primary : colors.border}
                    />
                    <Text style={styles.checkIcon}>{a.icon}</Text>
                    <Text style={styles.checkLabel}>{a.label}</Text>
                  </TouchableOpacity>
                );
              })}
              {appliances.includes('other') && (
                <InputField
                  label="Describe the other service"
                  placeholder="e.g. Curtain fitting"
                  value={otherText}
                  onChangeText={setOtherText}
                />
              )}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setServicesOpen(false);
                  load();
                }}
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
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
            <Text style={styles.sheetTitle}>About your business</Text>
            <InputField
              label=""
              placeholder="We provide reliable home services…"
              value={draftBio}
              onChangeText={setDraftBio}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
            <View style={styles.sheetActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setBioOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label="Save" onPress={saveBio} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- Edit address ---- */}
      <Modal visible={addressOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Your address</Text>
            <InputField
              label=""
              placeholder="Building 123, Road 45, Manama"
              value={draftAddress}
              onChangeText={setDraftAddress}
              multiline
              numberOfLines={2}
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />
            <View style={styles.sheetActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setAddressOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label="Save" onPress={saveAddress} loading={saving} style={{ flex: 1 }} />
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
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },

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
  serviceLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
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
