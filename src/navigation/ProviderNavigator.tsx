import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/i18n/LanguageContext';
// src/navigation/ProviderNavigator.tsx
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Image } from 'react-native';

import EmployeeDetailScreen from '@/screens/provider/EmployeeDetailScreen';
import EmployeeWorkloadScreen from '@/screens/provider/EmployeeWorkloadScreen';
import ManagerProfileScreen from '@/screens/provider/ManagerProfileScreen';
import ProviderAreasScreen from '@/screens/provider/ProviderAreasScreen';
import ProviderDashboardScreen from '@/screens/provider/ProviderDashboardScreen';
import ProviderProfileScreen from '@/screens/provider/ProviderProfileScreen';
import ProviderRequestsScreen from '@/screens/provider/ProviderRequestsScreen';
import ProviderScheduleScreen from '@/screens/provider/ProviderScheduleScreen';
import ProviderTeamScreen from '@/screens/provider/ProviderTeamScreen';
import RequestDetailScreen from '@/screens/provider/RequestDetailScreen';

import { useAuth } from '@/context/AuthContext';
import { colors,spacing } from '@/theme/theme';
import { Employee,ServiceRequest } from '@/types';

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
  const { t } = useLanguage();
  const { role } = useAuth();

  const ProfileComponent = role === 'provider' ? ProviderProfileScreen : ManagerProfileScreen;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerLeft: () => <HeaderLogo />,

        headerTitleAlign: 'center',
        headerRight: () => <LanguageSwitcher />,
        headerBackTitle: t('Back'),
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

          return <Ionicons name={TAB_ICONS[route.name]} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="ProviderDashboard"
        component={ProviderDashboardScreen}
        options={{
          title: t('Dashboard'),
        }}
      />

      <Tab.Screen
        name="ProviderRequests"
        component={ProviderRequestsScreen}
        options={{
          title: t('Service Requests'),
        }}
      />

      <Tab.Screen
        name="ProviderSchedule"
        component={ProviderScheduleScreen}
        options={{
          title: t('Schedule'),
        }}
      />

      <Tab.Screen
        name="ProviderTeam"
        component={ProviderTeamScreen}
        options={{
          title: t('Team'),
        }}
      />

      <Tab.Screen
        name="ProviderProfile"
        component={ProfileComponent}
        options={{
          title: t('Profile'),
        }}
      />
    </Tab.Navigator>
  );
}

export default function ProviderNavigator() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerRight: () => <LanguageSwitcher />,
        headerBackTitle: t('Back'),
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
          title: t('Request Details'),
        }}
      />

      <Stack.Screen
        name="EmployeeDetail"
        component={EmployeeDetailScreen}
        options={{
          title: t('Employee'),
        }}
      />

      <Stack.Screen
        name="ProviderAreas"
        component={ProviderAreasScreen}
        options={{
          title: t('Areas & Coverage'),
        }}
      />

      <Stack.Screen
        name="EmployeeWorkload"
        component={EmployeeWorkloadScreen}
        options={{
          title: t('Employee Jobs'),
        }}
      />
    </Stack.Navigator>
  );
}
