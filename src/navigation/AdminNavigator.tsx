// src/navigation/AdminNavigator.tsx
import React from 'react';
import { Image } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '@/screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '@/screens/admin/AdminUsersScreen';
import AdminUserDetailScreen from '@/screens/admin/AdminUserDetailScreen';
import AdminTemplatesScreen from '@/screens/admin/AdminTemplatesScreen';
import AdminActivityScreen from '@/screens/admin/AdminActivityScreen';
import AdminItemDetailScreen from '@/screens/admin/AdminItemDetailScreen';
import AdminSettingsScreen from '@/screens/admin/AdminSettingsScreen';
import { colors, spacing } from '@/theme/theme';
import { MaintenanceItem } from '@/types';

export type AdminStackParamList = {
  AdminTabs: undefined;
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminTemplates: undefined;
  AdminActivity: undefined;
  AdminSettings: undefined;
  AdminUserDetail: { userId: string };
  AdminItemDetail: { item: MaintenanceItem & { ownerName?: string } };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();
const Tab = createBottomTabNavigator<AdminStackParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  AdminUsers: 'people-outline',
  AdminTemplates: 'albums-outline',
  AdminActivity: 'document-text-outline',
  AdminSettings: 'settings-outline',
};

function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ width: 42, height: 42, marginLeft: spacing.md }}
      resizeMode="contain"
    />
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerLeft: () => <HeaderLogo />,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: { height: 60, paddingTop: 6, backgroundColor: colors.surface },
        tabBarIcon: ({ color }) => {
          // The brand mark stands in for the Dashboard icon, as elsewhere.
          if (route.name === 'AdminDashboard') {
            return (
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 32, height: 32, tintColor: color }}
                resizeMode="contain"
              />
            );
          }
          return <Ionicons name={TAB_ICONS[route.name]} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Users' }} />
      <Tab.Screen
        name="AdminTemplates"
        component={AdminTemplatesScreen}
        options={{ title: 'Templates' }}
      />
      <Tab.Screen
        name="AdminActivity"
        component={AdminActivityScreen}
        options={{ title: 'Activity' }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
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
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AdminUserDetail"
        component={AdminUserDetailScreen}
        options={{ title: 'User Details' }}
      />
      <Stack.Screen
        name="AdminItemDetail"
        component={AdminItemDetailScreen}
        options={{ title: 'Maintenance Detail' }}
      />
    </Stack.Navigator>
  );
}
