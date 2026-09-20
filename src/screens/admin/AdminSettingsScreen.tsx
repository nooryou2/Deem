// src/screens/admin/AdminSettingsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/Button';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';

export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = React.useState(false);

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
    Alert.alert('Log out?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: doLogout },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Settings</Text>
      <Text style={styles.pageSub}>Manage application settings</Text>

      <Text style={styles.sectionTitle}>Admin Account</Text>
      <View style={styles.card}>
        <Row label="Name" value={user?.displayName || 'Admin'} />
        <Row label="Email" value={user?.email || '—'} last />
      </View>

      <Text style={styles.sectionTitle}>Application Information</Text>
      <View style={styles.card}>
        <Row label="Application name" value="Deem" />
        <Row label="Version" value="1.0.0" last />
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={17} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Reminder timing is set per user on their own device, so it isn't configured here.
        </Text>
      </View>

      <Button
        label="Log Out"
        variant="danger"
        onPress={confirmLogout}
        loading={loggingOut}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h2 },
  pageSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm, marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...typography.bodySecondary, flex: 1 },
  rowValue: { ...typography.body, fontWeight: '600' },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  noteText: { ...typography.caption, flex: 1 },
});
