// App.tsx
import SplashScreen from '@/components/SplashScreen';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/i18n/LanguageContext';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import React,{ useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  // The splash overlays the app while it boots. It's rendered on top rather
  // than instead of the navigator, so auth and data load behind it.
  const [showSplash, setShowSplash] = useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
            {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
