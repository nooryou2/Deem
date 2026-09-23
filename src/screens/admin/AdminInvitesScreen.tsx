// src/screens/admin/AdminInvitesScreen.tsx
//
// Where the admin invites service providers. Each invitation is a one-time
// link with an expiry, optionally tied to the provider's email address.

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Text from '@/components/app-text';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  createInvite,
  listInvites,
  revokeInvite,
  inviteLink,
  inviteStatus,
  InviteStatus,
  ProviderInvite,
} from '@/services/inviteService';
import { getEmailError } from '@/utils/validation';
import { formatFriendlyDate } from '@/utils/dateCalculations';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';

const VALIDITY_DAYS = [3, 7, 14, 30];

const STATUS_STYLE: Record<InviteStatus, { label: string; color: string; bg: string }> = {
  valid: { label: 'Active', color: '#079455', bg: '#D1FADF' },
  used: { label: 'Used', color: '#026AA2', bg: '#E0F2FE' },
  expired: { label: 'Expired', color: '#B54708', bg: '#FEF0C7' },
  revoked: { label: 'Revoked', color: '#D92D20', bg: '#FEE4E2' },
  invalid: { label: 'Invalid', color: colors.textSecondary, bg: colors.border },
};

export default function AdminInvitesScreen() {
  const { user } = useAuth();
  const { t, tp } = useLanguage();

  const [invites, setInvites] = useState<ProviderInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [days, setDays] = useState(7);
  const [emailError, setEmailError] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<ProviderInvite | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const load = useCallback(() => {
    listInvites()
      .then(setInvites)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(t('Invitations'), msg);
  }

  async function handleCreate() {
    if (!user) return;
    setEmailError('');
    // Email is optional, but if given it must be real: the invite will only
    // work for that exact address.
    if (email.trim()) {
      const problem = getEmailError(email);
      if (problem) {
        setEmailError(problem);
        return;
      }
    }
    setCreating(true);
    try {
      const inv = await createInvite({ adminUid: user.uid, email, note, validDays: days });
      setJustCreated(inv);
      setEmail('');
      setNote('');
      load();
    } catch (e: any) {
      notify(
        e?.message === 'SECURE_RANDOM_UNAVAILABLE'
          ? t('This device cannot generate a secure link. Please create invitations from a web browser.')
          : t('Could not create the invitation. Please try again.')
      );
    } finally {
      setCreating(false);
    }
  }

  async function copy(token: string) {
    const link = inviteLink(token);
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
      } else {
        // No clipboard on this platform: fall back to the share sheet.
        await Share.share({ message: link });
      }
    } catch {
      notify(link);
    }
  }

  async function share(token: string) {
    const link = inviteLink(token);
    const message = t('You have been invited to join DEEM as a service provider. Create your account here: {link}', { link });
    try {
      await Share.share({ message });
    } catch {
      // Share isn't available in every browser; copying still gets the link out.
      copy(token);
    }
  }

  function confirmRevoke(inv: ProviderInvite) {
    const run = async () => {
      try {
        await revokeInvite(inv.token);
        load();
      } catch {
        notify(t('Could not revoke the invitation.'));
      }
    };
    const msg = t('Revoke this invitation? The link will stop working immediately.');
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) run();
      return;
    }
    Alert.alert(t('Revoke invitation?'), msg, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Revoke'), style: 'destructive', onPress: run },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>{t('Invite Service Provider')}</Text>
      <Text style={styles.pageSub}>
        {t('Service providers can only register through an invitation link.')}
      </Text>

      {/* ---- Create ---- */}
      <View style={styles.card}>
        <InputField
          label={t('Provider email (optional)')}
          placeholder={t('provider@example.com')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (emailError) setEmailError('');
          }}
          error={emailError ? t(emailError) : undefined}
        />
        <Text style={styles.hint}>
          {t('If set, only this email address can use the link.')}
        </Text>

        <InputField
          label={t('Note (optional)')}
          placeholder={t('e.g. business name, to recognise this invite later')}
          value={note}
          onChangeText={setNote}
        />

        <Text style={styles.fieldLabel}>{t('Link expires after')}</Text>
        <View style={styles.chipRow}>
          {VALIDITY_DAYS.map((d) => {
            const on = days === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setDays(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {tp('days', d)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          label={t('Generate invitation link')}
          onPress={handleCreate}
          loading={creating}
          style={{ marginTop: spacing.lg }}
        />
      </View>

      {/* ---- Just created ---- */}
      {justCreated && (
        <View style={[styles.card, styles.createdCard]}>
          <View style={styles.createdHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#079455" />
            <Text style={styles.createdTitle}>{t('Invitation created')}</Text>
          </View>
          <Text style={styles.linkBox} selectable numberOfLines={3}>
            {inviteLink(justCreated.token)}
          </Text>
          <Text style={styles.hint}>
            {t('Works once, until {date}.', { date: formatFriendlyDate(justCreated.expiresAt) })}
          </Text>
          <View style={styles.actionRow}>
            <Button
              label={copiedToken === justCreated.token ? t('Copied!') : t('Copy link')}
              variant="secondary"
              onPress={() => copy(justCreated.token)}
              style={{ flex: 1 }}
            />
            <Button label={t('Share')} onPress={() => share(justCreated.token)} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {/* ---- All invitations ---- */}
      <Text style={styles.sectionTitle}>{t('Invitations')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : invites.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t('No invitations yet.')}</Text>
        </View>
      ) : (
        invites.map((inv) => {
          const status = inviteStatus(inv);
          const meta = STATUS_STYLE[status];
          return (
            <View key={inv.token} style={styles.inviteRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteTitle} numberOfLines={1}>
                  {inv.email || inv.note || t('Open invitation')}
                </Text>
                {inv.email && inv.note ? (
                  <Text style={styles.inviteMeta} numberOfLines={1}>{inv.note}</Text>
                ) : null}
                <Text style={styles.inviteMeta}>
                  {status === 'used' && inv.usedAt
                    ? t('Used on {date}', { date: formatFriendlyDate(inv.usedAt) })
                    : t('Expires {date}', { date: formatFriendlyDate(inv.expiresAt) })}
                </Text>
              </View>

              <View style={styles.inviteSide}>
                <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.pillText, { color: meta.color }]}>{t(meta.label)}</Text>
                </View>
                {/* Only a live invitation can be copied or revoked. */}
                {status === 'valid' && (
                  <View style={styles.iconRow}>
                    <TouchableOpacity onPress={() => copy(inv.token)} hitSlop={8}>
                      <Ionicons
                        name={copiedToken === inv.token ? 'checkmark' : 'copy-outline'}
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmRevoke(inv)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={19} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h2 },
  pageSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  hint: { ...typography.caption, marginTop: -spacing.xs, marginBottom: spacing.md },
  fieldLabel: { ...typography.bodySecondary, fontWeight: '600', marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: colors.white },

  createdCard: { borderWidth: 1.5, borderColor: '#079455' },
  createdHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  createdTitle: { ...typography.h3 },
  // The link is always LTR, even in Arabic, so it reads correctly.
  linkBox: {
    ...typography.caption,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },

  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  emptyText: { ...typography.bodySecondary },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  inviteTitle: { ...typography.body, fontWeight: '700' },
  inviteMeta: { ...typography.caption, marginTop: 2 },
  inviteSide: { alignItems: 'center', gap: spacing.sm },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10, fontWeight: '700' },
  iconRow: { flexDirection: 'row', gap: spacing.md },
});
