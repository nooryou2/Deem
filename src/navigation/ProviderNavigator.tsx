// src/navigation/ProviderNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ProviderDashboardScreen from '@/screens/provider/ProviderDashboardScreen';
import ProviderRequestsScreen from '@/screens/provider/ProviderRequestsScreen';
import ProviderScheduleScreen from '@/screens/provider/ProviderScheduleScreen';
import ProviderTeamScreen from '@/screens/provider/ProviderTeamScreen';
import ProviderProfileScreen from '@/screens/provider/ProviderProfileScreen';
import ManagerProfileScreen from '@/screens/provider/ManagerProfileScreen';
import RequestDetailScreen from '@/screens/provider/RequestDetailScreen';
import EmployeeDetailScreen from '@/screens/provider/EmployeeDetailScreen';
import EmployeeWorkloadScreen from '@/screens/provider/EmployeeWorkloadScreen';
import ProviderAreasScreen from '@/screens/provider/ProviderAreasScreen';

import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme/theme';
import { ServiceRequest, Employee } from '@/types';

export type ProviderStackParamList = {
  ProviderTabs: undefined;
  ProviderDashboard: undefined;
  ProviderRequests: undefined;
  ProviderSchedule: undefined;
  ProviderTeam: undefined;
  ProviderProfile: undefined;
  RequestDetail: { request: ServiceRequest };
  EmployeeDetail: { employee: Employee };
  EmployeeWorkload: { employee: Employee };
  ProviderAreas: undefined;
};

const Tab = createBottomTabNavigator<ProviderStackParamList>();
const Stack = createNativeStackNavigator<ProviderStackParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ProviderDashboard: 'home-outline',
  ProviderRequests: 'document-text-outline',
  ProviderSchedule: 'calendar-outline',
  ProviderTeam: 'people-outline',
  ProviderProfile: 'person-outline',
};

function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{
        width: 42,
        height: 42,
        marginLeft: spacing.md,
      }}
      resizeMode="contain"
    />
  );
}

function ProviderTabs() {
  const { role } = useAuth();

  const ProfileComponent =
    role === 'provider'
      ? ProviderProfileScreen
      : ManagerProfileScreen;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerLeft: () => <HeaderLogo />,

        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '500',
          color: colors.textPrimary,
        },

        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,

        // Same as homeowner
        tabBarShowLabel: false,

        tabBarStyle: {
          height: 60,
          paddingTop: 6,
          paddingBottom: 6,
        },

        tabBarIconStyle: {
          marginTop: 0,
        },

        tabBarIcon: ({ color }) => {
          // Use DEEM logo for Dashboard
          if (route.name === 'ProviderDashboard') {
            return (
              <Image
                source={require('../../assets/logo.png')}
                style={{
                  width: 32,
                  height: 32,
                  tintColor: color,
                }}
                resizeMode="contain"
              />
            );
          }

          return (
            <Ionicons
              name={TAB_ICONS[route.name]}
              size={26}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="ProviderDashboard"
        component={ProviderDashboardScreen}
        options={{
          title: 'Dashboard',
        }}
      />

      <Tab.Screen
        name="ProviderRequests"
        component={ProviderRequestsScreen}
        options={{
          title: 'Service Requests',
        }}
      />

      <Tab.Screen
        name="ProviderSchedule"
        component={ProviderScheduleScreen}
        options={{
          title: 'Schedule',
        }}
      />

      <Tab.Screen
        name="ProviderTeam"
        component={ProviderTeamScreen}
        options={{
          title: 'Team',
        }}
      />

      <Tab.Screen
        name="ProviderProfile"
        component={ProfileComponent}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function ProviderNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '500',
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen
        name="ProviderTabs"
        component={ProviderTabs}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{
          title: 'Request Details',
        }}
      />

      <Stack.Screen
        name="EmployeeDetail"
        component={EmployeeDetailScreen}
        options={{
          title: 'Employee',
        }}
      />

      <Stack.Screen
        name="ProviderAreas"
        component={ProviderAreasScreen}
        options={{
          title: 'Areas & Coverage',
        }}
      />

      <Stack.Screen
        name="EmployeeWorkload"
        component={EmployeeWorkloadScreen}
        options={{
          title: 'Employee Jobs',
        }}
      />
    </Stack.Navigator>
  );
}