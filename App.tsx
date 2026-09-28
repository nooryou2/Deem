// App.tsx
import SplashScreen from '@/components/SplashScreen';
import { DialogProvider } from '@/components/AppDialog';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import React,{ useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Tells React Native Web which way the app reads.
 *
 * Setting direction on the page alone isn't enough: RN Web resolves
 * marginStart / marginEnd / paddingStart / paddingEnd into left or right using
 * its own writing-direction context, which defaults to left-to-right. Without
 * this, the browser flips rows for Arabic but every "start/end" gap stays on
 * the English side — which is why icons ended up touching their labels.
 *
 * The `dir` prop is web-only; native platforms ignore it.
 */
function DirectionRoot({ children }: { children: React.ReactNode }) {
  const { rtl, language } = useLanguage();
  const dirProps = { dir: rtl ? 'rtl' : 'ltr', lang: language } as any;
  return (
    <View style={{ flex: 1 }} {...dirProps}>
      {children}
    </View>
  );
}

export default function App() {
  // The splash overlays the app while it boots. It's rendered on top rather
  // than instead of the navigator, so auth and data load behind it.
  const [showSplash, setShowSplash] = useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <DirectionRoot>
            <DialogProvider>
              <AuthProvider>
                <StatusBar style="dark" />
                <RootNavigator />
                {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
              </AuthProvider>
            </DialogProvider>
          </DirectionRoot>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
