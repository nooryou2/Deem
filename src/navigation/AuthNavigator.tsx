import { useLanguage } from '@/i18n/LanguageContext';
// src/navigation/AuthNavigator.tsx
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ProviderSignupScreen from '@/screens/auth/ProviderSignupScreen';
import StaffLoginScreen from '@/screens/auth/StaffLoginScreen';
import { readInviteFromUrl, readStaffLoginFromUrl } from '@/services/inviteService';
import LandingScreen from '@/screens/landing-screen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  /** Invite-only. Reached solely through an admin's invitation link. */
  ProviderSignup: { invite?: string };
  /** Staff entrance: 'provider' or 'admin'. Reached by URL only. */
  StaffLogin: { mode?: 'provider' | 'admin' };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const { t } = useLanguage();
  // Opened from an invitation link? Start on the provider sign-up page. This
  // is the only way to reach it: nothing in the public app links there.
  const [invite] = React.useState(() => readInviteFromUrl());
  const [staffMode] = React.useState(() => readStaffLoginFromUrl());
  return (
    <Stack.Navigator
      initialRouteName={
        invite !== null ? 'ProviderSignup' : staffMode ? 'StaffLogin' : 'Landing'
      }
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="StaffLogin"
        component={StaffLoginScreen}
        initialParams={{ mode: staffMode ?? 'provider' }}
      />
      <Stack.Screen
        name="ProviderSignup"
        component={ProviderSignupScreen}
        initialParams={{ invite: invite ?? '' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: true, title: t('Reset Password') }}
      />
    </Stack.Navigator>
  );
}
