// Inicio
import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { MaterialIcons } from '@expo/vector-icons';

import { getSemanticColors } from '@/constants/accessibilityColors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

export default function TabLayout() {

  const { user } = useAuth();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const tabBarInactiveTintColor = colorblindFriendly ? '#075985' : '#064e3b';

  return (
    <Tabs
      screenOptions={{
        // Colors de les icones
        tabBarActiveTintColor: '#ffffff', // Blanc per a la pestanya on ens trobem
        tabBarInactiveTintColor,

        // Estil de la barra inferior
        tabBarStyle: {
          backgroundColor: sem.accent,
          borderTopWidth: 0, // Treu la línia grisa
          display: user ? 'flex' : 'none', // només mostrem la barra inferior si el user ja ha fet loggin
          // --- MILLORES PER A ANDROID ---
          elevation: 10, // Dóna una ombra superior suau per separar-ho del mapa
          height: 65, // Li donem una mica més d'alçada perquè respirin les icones
          paddingBottom: 10, // Puja les icones perquè no xoquin amb la barra del sistema
          paddingTop: 10, // Centra visualment les icones
        },

        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      {/* 1. Pestanya del Cotxe (Esquerra) */}
      <Tabs.Screen
        name="car" // Aquest serà el nom de l'arxiu (car.tsx)
        options={{
          title: '',
          tabBarIcon: ({ color }) => <MaterialIcons name="electric-car" size={28} color={color} />,
        }}
      />

      {/* 2. Pestanya del Mapa (Centre) */}
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          href: '/', // Força la redirecció a l'inici
          tabBarIcon: ({ color }) => <MaterialIcons name="map" size={28} color={color} />,
        }}
      />

      {/* 3. Pestanya de Pagaments (Dreta) */}
      <Tabs.Screen
        name="payments" // Aquest serà el nom de l'arxiu (payments.tsx)
        options={{
          title: '',
          tabBarIcon: ({ color }) => <MaterialIcons name="credit-card" size={28} color={color} />,
        }}
      />

      {/* 4. Pestanya de ranking */}
      <Tabs.Screen
        name="ranking"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <MaterialIcons name="emoji-events" size={28} color={color} />, // Subimos a 28
        }}
      />

    </Tabs>
  );
}