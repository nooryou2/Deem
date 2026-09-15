// src/screens/provider/ProviderTeamScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { createEmployee, listEmployees } from '@/services/employeeService';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { getAuthErrorMessage } from '@/services/authService';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { Employee, EmployeePrivilege } from '@/types';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderStackParamList, 'ProviderTeam'>,
  NativeStackScreenProps<ProviderStackParamList>
>;

export default function ProviderTeamScreen({ navigation }: Props) {
  const { user, role } = useAuth();
  const companyId = useCompanyId();
  const isManager = role === 'employee'; // a manager viewing the provider UI
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Add-employee form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [privilege, setPrivilege] = useState<EmployeePrivilege>('worker');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    listEmployees(companyId)
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(load);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Team', msg);
  }

  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setPrivilege('worker');
    setError('');
  }

  async function handleAdd() {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      await createEmployee({
        name,
        email,
        password,
        privilege,
        providerId: companyId!,
        providerName: user?.displayName ?? 'Company',
      });
      setModalOpen(false);
      resetForm();
      notify(`${name.trim()} was added. They can log in with the email and password you set.`);
      load();
    } catch (e) {
      setError(getAuthErrorMessage(e, 'register'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.intro}>
          {isManager
            ? 'Your team. Tap an employee to see the jobs assigned to them.'
            : 'Your team. Tap an employee to see their jobs, or edit them from there.'}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : employees.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No employees yet</Text>
            <Text style={styles.emptySub}>Tap "Add Employee" to create your first team member.</Text>
          </View>
        ) : (
          employees.map((emp) => (
            <TouchableOpacity
              key={emp.uid}
              style={styles.empCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EmployeeWorkload', { employee: emp })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.name}</Text>
                <Text style={styles.empEmail}>{emp.email}</Text>
              </View>
              <View
                style={[
                  styles.privBadge,
                  { backgroundColor: emp.privilege === 'manager' ? '#EDE9FE' : '#DBEAFE' },
                ]}
              >
                <Text
                  style={[
                    styles.privText,
                    { color: emp.privilege === 'manager' ? '#6D28D9' : '#1D4ED8' },
                  ]}
                >
                  {emp.privilege === 'manager' ? 'Manager' : 'Worker'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {!isManager && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => {
            resetForm();
            setModalOpen(true);
          }}
        >
          <Text style={styles.fabIcon}>＋</Text>
          <Text style={styles.fabLabel}>Add Employee</Text>
        </TouchableOpacity>
      )}

      {/* Add employee modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Employee</Text>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <InputField label="Full Name" placeholder="Sara Ali" value={name} onChangeText={setName} />
              <InputField
                label="Email"
                placeholder="employee@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <InputField
                label="Temporary Password"
                placeholder="At least 6 characters"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.privLabel}>Privilege</Text>
              <View style={styles.privRow}>
                {(['worker', 'manager'] as EmployeePrivilege[]).map((p) => {
                  const on = privilege === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.privOption, on && styles.privOptionOn]}
                      onPress={() => setPrivilege(p)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.privOptTitle, on && styles.privOptTitleOn]}>
                        {p === 'worker' ? 'Worker' : 'Manager'}
                      </Text>
                      <Text style={[styles.privOptSub, on && styles.privOptSubOn]}>
                        {p === 'worker'
                          ? 'View & update assigned jobs'
                          : 'View all jobs & update status'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label="Add" onPress={handleAdd} loading={submitting} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 120 },
  intro: { ...typography.bodySecondary, marginBottom: spacing.lg },
  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  empName: { ...typography.body, fontWeight: '700' },
  empEmail: { ...typography.caption, marginTop: 2 },
  privBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  privText: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: spacing.sm },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptySub: { ...typography.bodySecondary, textAlign: 'center', marginTop: spacing.xs },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    ...shadow.card,
  },
  fabIcon: { color: colors.white, fontSize: 20, fontWeight: '700', marginTop: -2 },
  fabLabel: { color: colors.white, fontSize: 15, fontWeight: '700' },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: { ...typography.h2, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },

  privLabel: { ...typography.bodySecondary, fontWeight: '600', marginBottom: spacing.sm },
  privRow: { flexDirection: 'row', gap: spacing.md },
  privOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  privOptionOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  privOptTitle: { ...typography.body, fontWeight: '700' },
  privOptTitleOn: { color: colors.primary },
  privOptSub: { ...typography.caption, marginTop: 2 },
  privOptSubOn: { color: colors.primary },
});
