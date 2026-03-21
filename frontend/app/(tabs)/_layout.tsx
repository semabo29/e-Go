// Inicio
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {

  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        // Colors de les icones
        tabBarActiveTintColor: '#ffffff', // Blanc per a la pestanya on ens trobem
        tabBarInactiveTintColor: '#064e3b', // Verd molt fosc per a les pestanyes inactives

        // Estil de la barra inferior
        tabBarStyle: {
          backgroundColor: '#10b981', // El color verd de la teva App
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

    </Tabs>
  );
}