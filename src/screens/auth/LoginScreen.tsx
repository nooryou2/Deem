import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/auth/LoginScreen.tsx
import Button from '@/components/Button';
import GoogleButton from '@/components/GoogleButton';
import InputField from '@/components/InputField';
import RoleSelector from '@/components/RoleSelector';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { getAuthErrorMessage } from '@/services/authService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { UserRole } from '@/types';
import { getEmailError } from '@/utils/validation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useState } from 'react';
import {
Image,
KeyboardAvoidingView,
Platform,
ScrollView,
StyleSheet,
TouchableOpacity,
View,
} from 'react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('homeowner');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [emailError, setEmailError] = useState('');

  async function handleGoogle() {
    setFormError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(role);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, 'login'));
    } finally {
      setGoogleLoading(false);
    }
  }

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
      await login(email.trim(), password, role);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, 'login'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <LanguageSwitcher />
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('Landing')}
          style={{ alignSelf: 'center', padding: 12, marginBottom: 12 }}
        >
          <Text style={styles.linkText}>{t('العودة إلى الرئيسية ←')}</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={typography.h2}>{t('Welcome Back')}</Text>
          <Text style={styles.subtitle}>{t('Login to your account')}</Text>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.roleLabel}>{t('I am a')}</Text>
            <RoleSelector value={role} onChange={setRole} />

            <InputField
              label={t('Email')}
              placeholder={t('you@example.com')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError('');
              }}
              error={emailError}
            />
            <InputField
              label={t('Password')}
              placeholder={t('••••••••')}
              isPassword
              value={password}
              onChangeText={setPassword}
            />

            {formError ? <Text style={styles.error}>{t(formError)}</Text> : null}

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
            >
              <Text style={styles.linkText}>{t('Forgot password?')}</Text>
            </TouchableOpacity>

            <Button label={t('Login')} onPress={handleLogin} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onPress={handleGoogle} loading={googleLoading} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("Don't have an account?")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>{t('Sign up')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 130, height: 130 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  subtitle: { ...typography.bodySecondary, marginTop: spacing.xs },
  roleLabel: { ...typography.bodySecondary, fontWeight: '600', marginBottom: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.lg },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
