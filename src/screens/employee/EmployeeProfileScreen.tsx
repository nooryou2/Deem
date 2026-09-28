import { useDialog } from '@/components/AppDialog';
import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/employee/EmployeeProfileScreen.tsx
import Button from '@/components/Button';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import React,{ useState } from 'react';
import { StyleSheet,View } from 'react-native';

export default function EmployeeProfileScreen() {
  const { t } = useLanguage();
  const dialog = useDialog();
  const { user, logout, privilege } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function doLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  async function confirmLogout() {
    const ok = await dialog.confirm({
      title: 'Log out?',
      message: 'You can always log back in anytime.',
      confirmLabel: 'Log Out',
      destructive: true,
    });
    if (ok) doLogout();
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={typography.h3}>{user?.displayName || t('Employee')}</Text>
        <Text ltr style={styles.email}>{user?.email}</Text>
        <View style={styles.privBadge}>
          <Text style={styles.privText}>
            {privilege === 'manager' ? t('Manager') : t('Worker')}
          </Text>
        </View>
      </View>

      <Button label={t('Log Out')} variant="danger" onPress={confirmLogout} loading={loggingOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '700' },
  email: { ...typography.bodySecondary, marginTop: 2 },
  privBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  privText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
});
