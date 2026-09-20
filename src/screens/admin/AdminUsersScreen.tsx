// src/screens/admin/AdminUsersScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAllUsers } from '@/services/adminService';
import SearchBar from '@/components/SearchBar';
import { formatFriendlyDate } from '@/utils/dateCalculations';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { AdminUser } from '@/types';
import type { AdminStackParamList } from '@/navigation/AdminNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminStackParamList, 'AdminUsers'>,
  NativeStackScreenProps<AdminStackParamList>
>;

const ROLE_FILTERS = ['all', 'homeowner', 'provider', 'employee', 'admin'] as const;

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  homeowner: { bg: '#D1FADF', color: '#079455' },
  provider: { bg: '#E0F2FE', color: '#026AA2' },
  employee: { bg: '#FEF0C7', color: '#B54708' },
  admin: { bg: '#FAF5EA', color: '#7A4100' },
};

export default function AdminUsersScreen({ navigation }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<(typeof ROLE_FILTERS)[number]>('all');

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAllUsers()
        .then(setUsers)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, role]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Users</Text>
        <Text style={styles.pageSub}>Manage and view registered users</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or email…" />

        <View style={styles.chipRow}>
          {ROLE_FILTERS.map((r) => {
            const on = role === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.count}>
          {filtered.length} of {users.length} users
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(u) => u.uid}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const roleMeta = ROLE_STYLE[item.role] ?? ROLE_STYLE.homeowner;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminUserDetail', { userId: item.uid })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email} numberOfLines={1}>
                  {item.email}
                </Text>
                <Text style={styles.meta}>
                  {item.itemCount} item{item.itemCount === 1 ? '' : 's'} ·{' '}
                  {formatFriendlyDate(item.createdAt)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[styles.rolePill, { backgroundColor: roleMeta.bg }]}>
                  <Text style={[styles.rolePillText, { color: roleMeta.color }]}>
                    {item.role}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  pageTitle: { ...typography.h2 },
  pageSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: colors.white },
  count: { ...typography.caption, marginTop: spacing.md },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  name: { ...typography.body, fontWeight: '700' },
  email: { ...typography.caption, marginTop: 1 },
  meta: { ...typography.caption, marginTop: 2 },
  rolePill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  rolePillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
});
