// src/components/InputField.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme/theme';

// Edge and Chrome add their own password reveal control inside the field,
// which would sit next to ours and show two eyes. Injected once per session.
let nativeRevealHidden = false;
function hideBrowserPasswordReveal() {
  if (nativeRevealHidden || Platform.OS !== 'web' || typeof document === 'undefined') return;
  nativeRevealHidden = true;
  const style = document.createElement('style');
  style.textContent = `
    input::-ms-reveal,
    input::-ms-clear,
    input::-webkit-credentials-auto-fill-button,
    input::-webkit-textfield-decoration-container {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  // When true, renders a password field with an eye icon to toggle visibility.
  isPassword?: boolean;
}

export default function InputField({
  label,
  error,
  style,
  isPassword = false,
  secureTextEntry,
  ...rest
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(hideBrowserPasswordReveal, []);

  const actuallyHide = isPassword ? hidden : secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            isPassword && styles.inputWithIcon,
            focused && styles.inputFocused,
            error ? styles.inputError : null,
            style,
          ]}
          secureTextEntry={actuallyHide}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputWithIcon: { paddingRight: 44 },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.danger,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
});
