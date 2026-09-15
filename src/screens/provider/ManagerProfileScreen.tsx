// src/screens/provider/ManagerProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/Button';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';

export default function ManagerProfileScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

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
      if (window.confirm('Log out?')) doLogout();
      return;
    }
    Alert.alert('Log out?', 'You can always log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: doLogout },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={typography.h3}>{user?.displayName || 'Manager'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Manager</Text>
        </View>
      </View>

      <Text style={styles.note}>
        As a manager you can view and manage the company's requests, schedule, and team. Company
        profile and services are managed by the account owner.
      </Text>

      <Button label="Log Out" variant="danger" onPress={confirmLogout} loading={loggingOut} />
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
    marginBottom: spacing.lg,
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
  roleBadge: {
    marginTop: spacing.sm,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: { color: '#6D28D9', fontWeight: '700', fontSize: 12 },
  note: { ...typography.bodySecondary, marginBottom: spacing.xl, textAlign: 'center' },
});
