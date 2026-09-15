// src/navigation/MainNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '@/screens/DashboardScreen';
import MaintenanceListScreen from '@/screens/MaintenanceListScreen';
import ServicedScreen from '@/screens/ServicedScreen';
import ProvidersScreen from '@/screens/ProvidersScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import MaintenanceDetailScreen from '@/screens/MaintenanceDetailScreen';
import AddEditMaintenanceScreen from '@/screens/AddEditMaintenanceScreen';
import RequestProviderScreen from '@/screens/RequestProviderScreen';
import BookingScreen from '@/screens/BookingScreen';
import SetLocationScreen from '@/screens/SetLocationScreen';
import MyLocationsScreen from '@/screens/MyLocationsScreen';
import WriteReviewScreen from '@/screens/WriteReviewScreen';
import { colors, spacing } from '@/theme/theme';
import { MaintenanceStatus } from '@/types';

export type MainStackParamList = {
  MainTabs: undefined;
  Dashboard: undefined;
  MaintenanceList: { filter?: 'all' | MaintenanceStatus | 'on_track' } | undefined;
  Serviced: undefined;
  Providers: undefined;
  Profile: undefined;
  MaintenanceDetail: { itemId: string };
  AddEditMaintenance: { itemId?: string } | undefined;
  RequestProvider: { itemId: string };
  Booking: { providerId?: string; providerName?: string } | undefined;
  MyLocations: undefined;
  SetLocation: { locationId?: string } | undefined;
  WriteReview: {
    providerId: string;
    providerName: string;
    jobId: string;
    jobType: 'request' | 'booking';
    serviceName: string;
  };
};

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainStackParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home-outline',
  MaintenanceList: 'construct-outline',
  Providers: 'people-outline',
  Profile: 'person-outline',
};

/** Small brand mark shown at the left of each tab's header. */
function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ width: 42, height: 42, marginLeft: spacing.md }}
      resizeMode="contain"
    />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerLeft: () => <HeaderLogo />,
        // Titles sit quietly above the content rather than competing with it.
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // Icons only — no text labels, so nothing overlaps on narrow screens.
        tabBarShowLabel: false,
        tabBarStyle: { height: 60, paddingTop: 6, paddingBottom: 6 },
        tabBarIconStyle: { marginTop: 0 },
        tabBarIcon: ({ color }) => {
          // The brand mark stands in for the usual house icon on the Home tab.
          if (route.name === 'Dashboard') {
            return (
              <Image
                source={require('../../assets/logo.png')}
                // tintColor recolours the mark to match the other icons, so it
                // greys out when inactive instead of just fading.
                style={{ width:38,height: 38, tintColor: color }}
                resizeMode="contain"
              />
            );
          }
          return <Ionicons name={TAB_ICONS[route.name]} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="MaintenanceList"
        component={MaintenanceListScreen}
        options={{ title: 'Maintenance' }}
      />
      <Tab.Screen
        name="Providers"
        component={ProvidersScreen}
        options={{ title: 'Service Providers' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
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
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Serviced"
        component={ServicedScreen}
        options={{ title: 'Serviced' }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
        options={{ title: 'Details' }}
      />
      <Stack.Screen
        name="AddEditMaintenance"
        component={AddEditMaintenanceScreen}
        options={({ route }) => ({
          title: route.params?.itemId ? 'Edit Item' : 'Add Item',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="RequestProvider"
        component={RequestProviderScreen}
        options={{ title: 'Request a Provider' }}
      />
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Book a Service' }}
      />
      <Stack.Screen
        name="MyLocations"
        component={MyLocationsScreen}
        options={{ title: 'My Locations' }}
      />
      <Stack.Screen
        name="WriteReview"
        component={WriteReviewScreen}
        options={{ title: 'Rate Service' }}
      />
      <Stack.Screen
        name="SetLocation"
        component={SetLocationScreen}
        options={({ route }) => ({
          title: route.params?.locationId ? 'Edit Location' : 'Add Location',
        })}
      />
    </Stack.Navigator>
  );
}
