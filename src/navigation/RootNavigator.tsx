// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/app-text';
import Button from '@/components/Button';
import { useLanguage } from '@/i18n/LanguageContext';
import { readInviteFromUrl, readStaffLoginFromUrl } from '@/services/inviteService';
import { useAuth } from '@/context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ProviderNavigator from './ProviderNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import AdminNavigator from './AdminNavigator';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';

/**
 * Shown when someone opens a provider invitation while already signed in.
 * The sign-up page is only for signed-out visitors, so without this the link
 * would quietly drop them into their existing account instead.
 */
function SignedInNotice({ reason }: { reason: 'invite' | 'staffLogin' }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const invite = reason === 'invite';
  return (
    <View style={styles.loading}>
      <View style={styles.noticeCard}>
        <Ionicons
          name={invite ? 'mail-open-outline' : 'log-in-outline'}
          size={36}
          color={colors.primary}
          style={{ alignSelf: 'center' }}
        />
        <Text style={styles.noticeTitle}>
          {t(invite ? 'Provider invitation' : 'Already signed in')}
        </Text>
        <Text style={styles.noticeBody}>
          {invite
            ? t('You are signed in as {email}. To accept this invitation and create a service provider account, log out first.', { email: user?.email ?? '' })
            : t('You are signed in as {email}. To sign in with a different account, log out first.', { email: user?.email ?? '' })}
        </Text>
        <Button label={t('Log out and continue')} onPress={logout} style={{ marginTop: spacing.lg }} />
        <Button
          label={t('Stay signed in')}
          variant="secondary"
          onPress={() => {
            // Leave the invitation page and return to the normal app.
            if (Platform.OS === 'web') window.location.replace('/');
          }}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </View>
  );
}

export default function RootNavigator() {
  const { user, role, privilege, roleLoading, initializing, providerSignupActive } = useAuth();

  // Wait for auth to resolve, and for the role to load once logged in. Not
  // while a provider is signing up: that would unmount the sign-up page and
  // lose the form and any error mid-attempt.
  if (initializing || (user && roleLoading && !providerSignupActive)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // A manager (employee with manager privilege) gets the full provider
  // interface (minus profile editing). Workers get the limited employee view.
  const isManager = role === 'employee' && privilege === 'manager';

  if (user && !providerSignupActive && role !== 'provider' && readInviteFromUrl() !== null) {
    return <SignedInNotice reason="invite" />;
  }

  // The staff sign-in pages live in the signed-out part of the app, so opening
  // one while signed in would otherwise drop the user straight into whichever
  // account they already have — e.g. landing in the admin console after
  // opening the provider sign-in page.
  const staffMode = readStaffLoginFromUrl();
  if (user && staffMode) {
    const allowed = staffMode === 'admin' ? ['admin'] : ['provider', 'employee'];
    if (!role || !allowed.includes(role)) {
      return <SignedInNotice reason="staffLogin" />;
    }
  }

  return (
    <NavigationContainer>
      {!user || providerSignupActive ? (
        <AuthNavigator />
      ) : role === 'admin' ? (
        <AdminNavigator />
      ) : role === 'provider' ? (
        <ProviderNavigator />
      ) : isManager ? (
        <ProviderNavigator />
      ) : role === 'employee' ? (
        <EmployeeNavigator />
      ) : (
        // Default to the homeowner interface (covers 'homeowner' and any
        // older account whose role hasn't been set yet).
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  noticeCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadow.card,
  },
  noticeTitle: { ...typography.h2, textAlign: 'center', marginTop: spacing.md },
  noticeBody: { ...typography.bodySecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21 },
});
