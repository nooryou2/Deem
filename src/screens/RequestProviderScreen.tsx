import type { MainStackParamList } from '@/navigation/MainNavigator';
import { colors } from '@/theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useEffect } from 'react';
import { ActivityIndicator,View } from 'react-native';
export default function RequestProviderScreen({
  navigation,
  route,
}: NativeStackScreenProps<MainStackParamList, 'RequestProvider'>) {
  useEffect(() => {
    navigation.replace('Booking', { itemId: route.params.itemId });
  }, [navigation, route.params.itemId]);
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
