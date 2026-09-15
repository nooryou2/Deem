// App.tsx
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/AuthContext';
import RootNavigator from '@/navigation/RootNavigator';
import SplashScreen from '@/components/SplashScreen';

export default function App() {
  // The splash overlays the app while it boots. It's rendered on top rather
  // than instead of the navigator, so auth and data load behind it.
  const [showSplash, setShowSplash] = useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
          {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
