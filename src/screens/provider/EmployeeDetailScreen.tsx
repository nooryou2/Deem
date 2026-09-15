// src/screens/provider/EmployeeDetailScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { updateEmployee, removeEmployee } from '@/services/employeeService';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { EmployeePrivilege } from '@/types';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';

type Props = NativeStackScreenProps<ProviderStackParamList, 'EmployeeDetail'>;

export default function EmployeeDetailScreen({ navigation, route }: Props) {
  const emp = route.params.employee;
  const [name, setName] = useState(emp.name);
  const [privilege, setPrivilege] = useState<EmployeePrivilege>(emp.privilege);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Employee', msg);
  }

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateEmployee(emp.uid, { name, privilege });
      notify('Employee updated.');
      navigation.goBack();
    } catch (e) {
      setError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function performRemove() {
    (async () => {
      setSaving(true);
      try {
        await removeEmployee(emp.uid);
        notify(`${emp.name} was removed from your team.`);
        navigation.goBack();
      } catch (e) {
        notify('Could not remove employee.');
      } finally {
        setSaving(false);
      }
    })();
  }

  function confirmRemove() {
    const msg = `Remove ${emp.name} from your team? They will no longer be able to log in as an employee or receive assignments.`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) performRemove();
      return;
    }
    Alert.alert('Remove employee?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: performRemove },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.email}>{emp.email}</Text>
      </View>

      <InputField label="Full Name" value={name} onChangeText={setName} />

      <Text style={styles.label}>Privilege</Text>
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
              <Text style={[styles.privTitle, on && styles.privTitleOn]}>
                {p === 'worker' ? 'Worker' : 'Manager'}
              </Text>
              <Text style={[styles.privSub, on && styles.privSubOn]}>
                {p === 'worker' ? 'View & update assigned jobs' : 'View all jobs & assign'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.readonlyNote}>
        Email can't be changed here — it's tied to the login account.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: spacing.lg }} />
      <Button
        label="Remove from Team"
        variant="danger"
        onPress={confirmRemove}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 30 },
  email: { ...typography.bodySecondary },
  label: { ...typography.bodySecondary, fontWeight: '600', marginBottom: spacing.sm },
  privRow: { flexDirection: 'row', gap: spacing.md },
  privOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  privOptionOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  privTitle: { ...typography.body, fontWeight: '700' },
  privTitleOn: { color: colors.primary },
  privSub: { ...typography.caption, marginTop: 2 },
  privSubOn: { color: colors.primary },
  readonlyNote: { ...typography.caption, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
});
