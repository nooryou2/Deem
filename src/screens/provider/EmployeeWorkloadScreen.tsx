import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/provider/EmployeeWorkloadScreen.tsx
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';
import { fetchRequestsForEmployee } from '@/services/requestService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { ServiceRequest,ServiceRequestStatus } from '@/types';
import { CATEGORY_ICONS } from '@/utils/maintenanceTemplates';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useEffect,useState } from 'react';
import { ActivityIndicator,FlatList,StyleSheet,TouchableOpacity,View } from 'react-native';

type Props = NativeStackScreenProps<ProviderStackParamList, 'EmployeeWorkload'>;

const STATUS_META: Record<ServiceRequestStatus, { label: string; color: string; tint: string }> = {
  pending: { label: 'Pending', color: '#D97706', tint: '#FEF3C7' },
  accepted: { label: 'Accepted', color: '#2563EB', tint: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#7C3AED', tint: '#EDE9FE' },
  completed: { label: 'Completed', color: '#16A34A', tint: '#DCFCE7' },
  declined: { label: 'Declined', color: '#DC2626', tint: '#FEE2E2' },
};

export default function EmployeeWorkloadScreen({ navigation, route }: Props) {
  const { t } = useLanguage();
  const emp = route.params.employee;
  const { role } = useAuth();
  const isOwner = role === 'provider'; // account owner can edit the employee
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequestsForEmployee(emp.uid)
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [emp.uid]);

  const active = jobs.filter((j) => j.status !== 'completed' && j.status !== 'declined');
  const done = jobs.filter((j) => j.status === 'completed');

  return (
    <View style={styles.root}>
      {/* Employee header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{emp.name}</Text>
          <Text style={styles.sub}>
            {emp.privilege === 'manager' ? t('Manager') : t('Worker')} · {active.length}
            {t('active ·')} {done.length}
            {t('completed')}
          </Text>
        </View>
        {isOwner && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EmployeeDetail', { employee: emp })}
            activeOpacity={0.8}
          >
            <Text style={styles.editBtnText}>{t('Edit')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status];
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('RequestDetail', { request: item })}
              >
                <View style={styles.icon}>
                  <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[item.category] ?? '🛠️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={[styles.pill, { backgroundColor: meta.tint }]}>
                    <Text style={[styles.pillText, { color: meta.color }]}>{t(meta.label)}</Text>
                  </View>
                  <Text style={styles.service}>{item.serviceType}</Text>
                  <Text style={styles.customer}>{item.homeownerName}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧰</Text>
              <Text style={styles.emptyTitle}>{t('No jobs assigned')}</Text>
              <Text style={styles.emptySub}>{t('This employee has no assigned jobs yet.')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 22 },
  editBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  editBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  name: { ...typography.h3 },
  sub: { ...typography.caption, marginTop: 2 },
  listContent: { padding: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  service: { ...typography.body, fontWeight: '700', marginTop: 4 },
  customer: { ...typography.caption, marginTop: 1 },
  chevron: { fontSize: 24, color: colors.textMuted, marginLeft: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptySub: { ...typography.bodySecondary, marginTop: spacing.xs },
});
