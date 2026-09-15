// src/screens/auth/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { getAuthErrorMessage } from '@/services/authService';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { colors, spacing, typography } from '@/theme/theme';
import { getEmailError } from '@/utils/validation';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleReset() {
    setFormError('');
    // Check the address is well-formed before asking Firebase to send mail.
    const emailProblem = getEmailError(email);
    if (emailProblem) {
      setFormError(emailProblem);
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={typography.h1}>Reset password</Text>
      <Text style={styles.subtitle}>
        Enter the email associated with your account and we'll send you a link to reset your
        password.
      </Text>

      {sent ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            If an account exists for {email}, a reset link is on its way.
          </Text>
          <Button label="Back to Login" onPress={() => navigation.navigate('Login')} />
        </View>
      ) : (
        <>
          <InputField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button label="Send Reset Link" onPress={handleReset} loading={loading} />
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Back to login</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', backgroundColor: colors.background },
  subtitle: { ...typography.bodySecondary, marginTop: spacing.sm, marginBottom: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  backLink: { alignSelf: 'center', marginTop: spacing.lg },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  successBox: { alignItems: 'center', gap: spacing.lg },
  successText: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
});
