import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/provider/EmployeeDetailScreen.tsx
import Button from '@/components/Button';
import InputField from '@/components/InputField';
import Text from '@/components/app-text';
import { useDialog } from '@/components/AppDialog';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';
import { removeEmployee,updateEmployee } from '@/services/employeeService';
import { colors,radius,spacing,typography } from '@/theme/theme';
import { EmployeePrivilege } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useState } from 'react';
import { ScrollView,StyleSheet,TouchableOpacity,View } from 'react-native';

type Props = NativeStackScreenProps<ProviderStackParamList, 'EmployeeDetail'>;

export default function EmployeeDetailScreen({ navigation, route }: Props) {
  const { t } = useLanguage();
  const dialog = useDialog();
  const emp = route.params.employee;
  const [name, setName] = useState(emp.name);
  const [privilege, setPrivilege] = useState<EmployeePrivilege>(emp.privilege);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function notify(msg: string) {
    dialog.alert(msg);
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
      notify(t('Employee updated.'));
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
        notify(t('{name} was removed from your team.', { name: emp.name }));
        navigation.goBack();
      } catch (e) {
        notify(t('Could not remove employee.'));
      } finally {
        setSaving(false);
      }
    })();
  }

  function confirmRemove() {
    const msg = t('Remove {name} from your team? They will no longer be able to log in as an employee or receive assignments.', { name: emp.name });
    dialog
      .confirm({ title: 'Remove employee?', message: msg, confirmLabel: 'Remove', destructive: true })
      .then((ok) => ok && performRemove());
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text ltr style={styles.email}>{emp.email}</Text>
      </View>

      <InputField label={t('Full Name')} value={name} onChangeText={setName} />

      <Text style={styles.label}>{t('Privilege')}</Text>
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
                {p === 'worker' ? t('Worker') : t('Manager')}
              </Text>
              <Text style={[styles.privSub, on && styles.privSubOn]}>
                {p === 'worker' ? t('View & update assigned jobs') : t('View all jobs & assign')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.readonlyNote}>
        {t("Email can't be changed here — it's tied to the login account.")}
      </Text>

      {error ? <Text style={styles.error}>{t(error)}</Text> : null}

      <Button
        label={t('Save Changes')}
        onPress={handleSave}
        loading={saving}
        style={{ marginTop: spacing.lg }}
      />
      <Button
        label={t('Remove from Team')}
        variant="danger"
        onPress={confirmRemove}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
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
