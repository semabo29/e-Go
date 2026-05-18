// Inicio
import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { MaterialIcons } from '@expo/vector-icons';

import { getSemanticColors } from '@/constants/accessibilityColors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

// 1. IMPORTEM EL HOOK D'ÀREA SEGURA
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { user } = useAuth();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const tabBarInactiveTintColor = colorblindFriendly ? '#075985' : '#064e3b';

  // 2. OBTENIM ELS MARGES DEL SISTEMA
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor,

        tabBarStyle: {
          backgroundColor: sem.accent,
          borderTopWidth: 0,
          display: user ? 'flex' : 'none',
          elevation: 10,

          // 3. APLIQUEM L'ALÇADA DINÀMICA
          // L'alçada base és 60 + el marge inferior del sistema (insets.bottom)
          height: 60 + insets.bottom,
          // El padding inferior serà exactament el que demani el sistema
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },

        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      <Tabs.Screen
        name="car"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <MaterialIcons name="electric-car" size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: '',
          href: '/',
          tabBarIcon: ({ color }) => <MaterialIcons name="map" size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="payments"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <MaterialIcons name="credit-card" size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="ranking"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <MaterialIcons name="emoji-events" size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="shop"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <MaterialIcons name="storefront" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}