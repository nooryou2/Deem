import Button from '@/components/Button';
import GoogleButton from '@/components/GoogleButton';
import InputField from '@/components/InputField';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import DirectionalArrow from '@/components/DirectionalArrow';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { getAuthErrorMessage } from '@/services/authService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { getEmailError,getPasswordError } from '@/utils/validation';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;



export default function RegisterScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { register, loginWithGoogle } = useAuth();


  // Step 1

  // Step 2
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [nameError, setNameError] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');

  /** Validates the form and reports whether it's safe to submit. */
  function validateDetails(): boolean {
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
    let ok = true;

    if (!name.trim()) {
      setNameError('Please enter your full name.');
      ok = false;
    }
    const emailProblem = getEmailError(email);
    if (emailProblem) {
      setEmailError(emailProblem);
      ok = false;
    }
    const passwordProblem = getPasswordError(password);
    if (passwordProblem) {
      setPasswordError(passwordProblem);
      ok = false;
    }
    if (password && password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      ok = false;
    }
    return ok;
  }


  async function handleGoogle() {
    setFormError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      setFormError(getAuthErrorMessage(error, 'register'));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleFinish() {
    setFormError('');
    if (!validateDetails()) return;
    setLoading(true);
    try {
      await register(name, email.trim(), password, [], null);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, 'register'));
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
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Landing')}
            style={styles.backLink}
          >
            <DirectionalArrow kind="back" size={16} color={colors.primary} />
            <Text style={styles.linkText}>{t('Back to home')}</Text>
          </TouchableOpacity>
          <LanguageSwitcher style={{ alignSelf: 'center' }} />
        </View>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{t('Create Account')}</Text>
        <Text style={styles.stepHint}>
          {t('You can add your home location when requesting a service.')}
        </Text>
        <View style={styles.card}>
          <GoogleButton
            label={t('Sign up with Google')}
            onPress={handleGoogle}
            loading={googleLoading}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <>
              <Text style={styles.stepTitle}>{t('Personal Info')}</Text>
              <InputField
                label={t('Full Name')}
                placeholder={t('Ahmed Ali')}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (nameError) setNameError('');
                }}
                error={nameError}
              />
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
                onBlur={() => {
                  if (email.trim()) setEmailError(getEmailError(email) ?? '');
                }}
                error={emailError}
              />
              <InputField
                label={t('Password')}
                placeholder={t('At least 6 characters')}
                isPassword
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                }}
                error={passwordError}
              />
              <InputField
                label={t('Confirm Password')}
                placeholder={t('Re-enter your password')}
                isPassword
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (confirmError) setConfirmError('');
                }}
                error={confirmError}
              />
            </>

          {formError ? <Text style={styles.error}>{t(formError)}</Text> : null}
        </View>

        {/* Footer navigation */}
        <View style={styles.footer}>
          <Button
            label={t('Create Account')}
            onPress={handleFinish}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>{t('Already have an account?')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>{t('Log in')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Back link at the start, language at the end. The row follows the reading
  // direction, so the two swap sides in Arabic on their own.
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  logo: { width: 92, height: 92, alignSelf: 'center', marginBottom: spacing.sm },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  stepTitle: { ...typography.h3, marginBottom: spacing.sm },
  stepHint: { ...typography.caption, marginBottom: spacing.md },


  areaLabel: {
    ...typography.bodySecondary,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  areaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  areaChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  areaChipText: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  terms: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },

  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  loginText: { color: colors.textSecondary, fontSize: 14 },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
