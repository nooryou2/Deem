// src/screens/auth/LoginScreen.tsx
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { getAuthErrorMessage } from '@/services/authService';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import GoogleButton from '@/components/GoogleButton';
import RoleSelector from '@/components/RoleSelector';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { getEmailError } from '@/utils/validation';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { UserRole } from '@/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
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
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={typography.h2}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to your account</Text>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.roleLabel}>I am a</Text>
            <RoleSelector value={role} onChange={setRole} />

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
              error={emailError}
            />
            <InputField
              label="Password"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
            />

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button label="Login" onPress={handleLogin} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onPress={handleGoogle} loading={googleLoading} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
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
