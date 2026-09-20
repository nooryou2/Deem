// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ProviderNavigator from './ProviderNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import AdminNavigator from './AdminNavigator';
import { colors } from '@/theme/theme';

export default function RootNavigator() {
  const { user, role, privilege, roleLoading, initializing } = useAuth();

  // Wait for auth to resolve, and for the role to load once logged in.
  if (initializing || (user && roleLoading)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // A manager (employee with manager privilege) gets the full provider
  // interface (minus profile editing). Workers get the limited employee view.
  const isManager = role === 'employee' && privilege === 'manager';

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : role === 'admin' ? (
        <AdminNavigator />
      ) : role === 'provider' ? (
        <ProviderNavigator />
      ) : isManager ? (
        <ProviderNavigator />
      ) : role === 'employee' ? (
        <EmployeeNavigator />
      ) : (
        // Default to the homeowner interface (covers 'homeowner' and any
        // older account whose role hasn't been set yet).
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
