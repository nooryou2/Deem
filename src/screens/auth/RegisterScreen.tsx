// src/screens/auth/RegisterScreen.tsx
//
// Signup runs as three steps so the form never feels long:
//   1. Select Role   — homeowner or service provider
//   2. Personal Info — name, email, password
//   3. Location      — optional map pin and area(s)
//
// Only step 2 is required; the location step can be skipped and completed
// later from the user's profile.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { getAuthErrorMessage } from '@/services/authService';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import GoogleButton from '@/components/GoogleButton';
import StepIndicator from '@/components/StepIndicator';
import AreaSelector from '@/components/AreaSelector';
import MapPicker, { LatLng } from '@/components/MapPicker';
import { nearestArea, areaLabel } from '@/utils/areas';
import { getEmailError, getPasswordError } from '@/utils/validation';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { UserRole } from '@/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const STEPS = ['Select Role', 'Personal Info', 'Location'];

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

  // Step 3
  const [areas, setAreas] = useState<string[]>([]);
  const [coords, setCoords] = useState<LatLng | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Dropping a pin fills in the surrounding area, so most people never need to
  // open the area list at all.
  function handleCoordsChange(next: LatLng) {
    setCoords(next);
    const match = nearestArea(next);
    if (match && !areas.includes(match.id)) {
      setAreas((prev) => [...prev, match.id]);
    }
  }

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
      await register(name, email.trim(), password, role, areas, coords);
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
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Create Account</Text>
        <StepIndicator steps={STEPS} current={step} />

        <View style={styles.card}>
          {/* ---------- STEP 1: Role ---------- */}
          {step === 0 && (
            <>
              <Text style={styles.stepTitle}>I want to sign up as</Text>
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
                        {opt.label}
                      </Text>
                      <Text style={[styles.roleSub, on && styles.roleSubOn]}>{opt.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleButton
                label="Sign up with Google"
                onPress={handleGoogle}
                loading={googleLoading}
              />
            </>
          )}

          {/* ---------- STEP 2: Personal info ---------- */}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>Personal Info</Text>
              <InputField
                label="Full Name"
                placeholder="Ahmed Ali"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (nameError) setNameError('');
                }}
                error={nameError}
              />
              <InputField
                label="Email"
                placeholder="you@example.com"
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
                label="Password"
                placeholder="At least 6 characters"
                isPassword
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                }}
                error={passwordError}
              />
              <InputField
                label="Confirm Password"
                placeholder="Re-enter your password"
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

          {/* ---------- STEP 3: Location ---------- */}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>
                {role === 'provider' ? 'Where are you based?' : 'Where is your home?'}
              </Text>
              <Text style={styles.stepHint}>
                {role === 'provider'
                  ? "Homeowners see you first when you cover their area. You can set this later."
                  : "We'll show providers who work near you. You can set this later."}
              </Text>

              <MapPicker value={coords} onChange={handleCoordsChange} height={200} />

              <Text style={styles.areaLabel}>
                {role === 'provider' ? 'Areas you can work in' : 'Your area'}
              </Text>
              {areas.length > 0 && (
                <View style={styles.areaChips}>
                  {areas.map((a) => (
                    <View key={a} style={styles.areaChip}>
                      <Text style={styles.areaChipText}>{areaLabel(a)}</Text>
                    </View>
                  ))}
                </View>
              )}
              <AreaSelector selected={areas} onChange={setAreas} searchable />

              <Text style={styles.terms}>
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </Text>
            </>
          )}

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
        </View>

        {/* Footer navigation */}
        <View style={styles.footer}>
          {step > 0 && (
            <Button
              label="Back"
              variant="secondary"
              onPress={() => setStep((s) => s - 1)}
              style={{ flex: 1 }}
            />
          )}
          {step < 2 ? (
            <Button label="Continue" onPress={handleContinue} style={{ flex: 1 }} />
          ) : (
            <Button
              label="Create Account"
              onPress={handleFinish}
              loading={loading}
              style={{ flex: 1 }}
            />
          )}
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
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
