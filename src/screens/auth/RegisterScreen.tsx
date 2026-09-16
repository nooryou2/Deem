import Button from '@/components/Button';
import GoogleButton from '@/components/GoogleButton';
import InputField from '@/components/InputField';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import StepIndicator from '@/components/StepIndicator';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { getAuthErrorMessage } from '@/services/authService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { UserRole } from '@/types';
import { getEmailError,getPasswordError } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
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

const STEPS = ['Select Role', 'Personal Info'];

const ROLES: {
  value: UserRole;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'homeowner', label: 'Homeowner', sub: 'Manage my home', icon: 'home-outline' },
  {
    value: 'provider',
    label: 'Service Provider',
    sub: 'Offer services',
    icon: 'construct-outline',
  },
];

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { register, loginWithGoogle } = useAuth();

  const [step, setStep] = useState(0);

  // Step 1
  const [role, setRole] = useState<UserRole>('homeowner');

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

  /** Validates step 2 and reports whether it's safe to continue. */
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

  function handleContinue() {
    setFormError('');
    if (step === 1 && !validateDetails()) return;
    setStep((s) => s + 1);
  }

  async function handleGoogle() {
    setFormError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(role);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, 'register'));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleFinish() {
    setFormError('');
    // Re-check in case the user edited details then jumped forward.
    if (!validateDetails()) {
      setStep(1);
      return;
    }
    setLoading(true);
    try {
      await register(name, email.trim(), password, role, [], null);
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Landing')}><Text style={styles.linkText}>{t('Back to home ←')}</Text></TouchableOpacity><LanguageSwitcher /></View>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{t('Create Account')}</Text>
        <Text style={styles.stepHint}>
          {t('You can add your home location when requesting a service.')}
        </Text>
        <StepIndicator steps={STEPS} current={step} />

        <View style={styles.card}>
          {/* ---------- STEP 1: Role ---------- */}
          {step === 0 && (
            <>
              <Text style={styles.stepTitle}>{t('I want to sign up as')}</Text>
              <View style={styles.roleRow}>
                {ROLES.map((opt) => {
                  const on = role === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.roleCard, on && styles.roleCardOn]}
                      onPress={() => setRole(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={26}
                        color={on ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[styles.roleLabel, on && styles.roleLabelOn]}>
                        {t(opt.label)}
                      </Text>
                      <Text style={[styles.roleSub, on && styles.roleSubOn]}>{t(opt.sub)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleButton
                label={t('Sign up with Google')}
                onPress={handleGoogle}
                loading={googleLoading}
              />
            </>
          )}

          {/* ---------- STEP 2: Personal info ---------- */}
          {step === 1 && (
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
          )}

          {formError ? <Text style={styles.error}>{t(formError)}</Text> : null}
        </View>

        {/* Footer navigation */}
        <View style={styles.footer}>
          {step > 0 && (
            <Button
              label={t('Back')}
              variant="secondary"
              onPress={() => setStep((s) => s - 1)}
              style={{ flex: 1 }}
            />
          )}
          {step < 1 ? (
            <Button label={t('Continue')} onPress={handleContinue} style={{ flex: 1 }} />
          ) : (
            <Button
              label={t('Create Account')}
              onPress={handleFinish}
              loading={loading}
              style={{ flex: 1 }}
            />
          )}
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

  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 6,
  },
  roleCardOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleLabel: { ...typography.body, fontWeight: '700' },
  roleLabelOn: { color: colors.primary },
  roleSub: { ...typography.caption },
  roleSubOn: { color: colors.primary },

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
