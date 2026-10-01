// src/screens/auth/StaffLoginScreen.tsx
//
// Sign-in for service providers and their employees. Kept separate from the
// homeowner page so each role has its own entrance.
//
// Reached only by URL (…/provider/login); nothing in the public app links here.

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Text from '@/components/app-text';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth, AUTH_ERROR_KEY, safeSessionRemove } from '@/context/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { getAuthErrorMessage } from '@/services/authService';
import { getEmailError } from '@/utils/validation';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { UserRole } from '@/types';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'StaffLogin'>;

const MODE: { title: string; subtitle: string; allowed: UserRole[] } = {
  title: 'Service Provider Sign In',
  subtitle: 'For service providers and their team members.',
  allowed: ['provider', 'employee'],
};

export default function StaffLoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const mode = MODE;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');

  // A redirect sign-in that was rejected leaves its reason here.
  React.useEffect(() => {
    try {
      const msg = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(AUTH_ERROR_KEY) : null;
      if (msg) {
        setFormError(msg);
        safeSessionRemove(AUTH_ERROR_KEY);
      }
    } catch {
      // Storage unavailable; nothing to show.
    }
  }, []);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setFormError('');
    setEmailError('');
    const emailProblem = getEmailError(email);
    if (emailProblem) {
      setEmailError(emailProblem);
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password, mode.allowed);
    } catch (e: any) {
      if (e?.message === 'REDIRECTING') return;
      if (e?.message === 'ROLE_NOT_ALLOWED') {
        setFormError(
          e.actualRole === 'homeowner'
            ? 'This is a homeowner account. Please sign in on the main DEEM page.'
            : 'This account cannot sign in here. Please use the correct sign-in page.'
        );
      } else {
        setFormError(getAuthErrorMessage(e, 'login'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.root} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <View />
          <LanguageSwitcher style={{ alignSelf: 'center' }} />
        </View>

        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons
              name="construct-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.badgeText}>{t(mode.title)}</Text>
          </View>
          <Text style={styles.subtitle}>{t(mode.subtitle)}</Text>

          <InputField
            label={t('Email')}
            placeholder={t('you@example.com')}
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
          <InputField
            label={t('Password')}
            placeholder={t('••••••••')}
            isPassword
            value={password}
            onChangeText={setPassword}
          />

          {formError ? <Text style={styles.error}>{t(formError)}</Text> : null}

          <Button label={t('Login')} onPress={handleLogin} loading={loading} />

          <Text
            style={styles.forgot}
            onPress={() => navigation.navigate('ForgotPassword')}
            accessibilityRole="button"
          >
            {t('Forgot password?')}
          </Text>
        </View>

        <Text style={styles.footnote}>
          {t('Homeowners sign in on the main DEEM page.')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1, justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 92, height: 92, alignSelf: 'center', marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  badgeText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  subtitle: { ...typography.caption, marginTop: spacing.sm, marginBottom: spacing.lg },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
  forgot: { color: colors.primary, fontWeight: '600', fontSize: 13, marginTop: spacing.md, textAlign: 'center' },
  footnote: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
});
