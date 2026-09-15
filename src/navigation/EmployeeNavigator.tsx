// src/navigation/EmployeeNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmployeeJobsScreen from '@/screens/employee/EmployeeJobsScreen';
import EmployeeProfileScreen from '@/screens/employee/EmployeeProfileScreen';
import RequestDetailScreen from '@/screens/provider/RequestDetailScreen';
import { colors } from '@/theme/theme';
import { ServiceRequest } from '@/types';

export type EmployeeStackParamList = {
  EmployeeTabs: undefined;
  EmployeeJobs: undefined;
  EmployeeProfile: undefined;
  EmployeeJobDetail: { request: ServiceRequest };
};

const Tab = createBottomTabNavigator<EmployeeStackParamList>();
const Stack = createNativeStackNavigator<EmployeeStackParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  EmployeeJobs: 'construct-outline',
  EmployeeProfile: 'person-outline',
};

function EmployeeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size ?? 22} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="EmployeeJobs"
        component={EmployeeJobsScreen}
        options={{ title: 'My Jobs', tabBarLabel: 'Jobs' }}
      />
      <Tab.Screen
        name="EmployeeProfile"
        component={EmployeeProfileScreen}
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function EmployeeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="EmployeeJobDetail"
        component={RequestDetailScreen as any}
        options={{ title: 'Job Details' }}
      />
    </Stack.Navigator>
  );
}
