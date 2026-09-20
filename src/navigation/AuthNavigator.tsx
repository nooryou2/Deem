import { useLanguage } from '@/i18n/LanguageContext';
// src/navigation/AuthNavigator.tsx
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import LandingScreen from '@/screens/landing-screen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator initialRouteName="Landing" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: true, title: t('Reset Password') }}
      />
    </Stack.Navigator>
  );
}
