import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Estats per guardar els valors temporals abans d'aplicar
  const [minKw, setMinKw] = useState((params.minKw as string) || '');
  const [maxKw, setMaxKw] = useState((params.maxKw as string) || '');
  const [connectorType, setConnectorType] = useState((params.connectorType as string) || '');

  // Llista de connectors més habituals
  const CONNECTOR_TYPES = ['CCS Combo2', 'CHAdeMO', 'Schuko', 'MENNEKES', 'TESLA'];

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleApply = () => {
    // Naveguem de tornada a l'Inici ('/') i li passem els paràmetres
    router.navigate({
      pathname: '/',
      params: { minKw, maxKw, connectorType }
    });
  };

  const handleClear = () => {
    setMinKw('');
    setMaxKw('');
    // Naveguem de tornada enviant els paràmetres buits
    router.navigate({
      pathname: '/',
      params: { minKw: '', maxKw: '', connectorType: '' }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Capçalera */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Filtrar Estaciones</Text>
        <View style={{ width: 24 }} /* Espai buit per centrar el títol */ />
      </View>

      <View style={styles.content}>

        {/* Input Mínim */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Potencia mínima (kW)</Text>
          <TextInput
            style={[
              styles.input, focusedInput === 'min' && styles.inputFocused,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}
            ]}
            placeholder="50"
            placeholderTextColor="#94a3b8" // Gris claret pel text d'exemple
            keyboardType="numeric"
            cursorColor="#10b981"
            value={minKw}
            onChangeText={setMinKw}
            maxLength={4}
            onFocus={() => setFocusedInput('min')} // Quan hi fem clic
            onBlur={() => setFocusedInput(null)}   // Quan sortim
          />
        </View>

        {/* Input Màxim */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Potencia máxima (kW)</Text>
          <TextInput
            style={[
              styles.input, focusedInput === 'max' && styles.inputFocused,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}
            ]}
            placeholder="150"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            cursorColor="#10b981"
            value={maxKw}
            onChangeText={setMaxKw}
            maxLength={4}
            onFocus={() => setFocusedInput('max')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        {/* Secció Tipus de Connector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo de Conector</Text>
          <View style={styles.chipContainer}>
            {CONNECTOR_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  connectorType === type && styles.chipActive
                ]}
                // Si clica el que ja està actiu, el desmarca (el deixa buit)
                onPress={() => setConnectorType(connectorType === type ? '' : type)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.chipText,
                  connectorType === type && styles.chipTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View> {/*<-- Final de content*/}

      {/* Botons d'acció */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
          <Text style={styles.clearBtnText}>Limpiar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
          <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Fons clar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputGroup: {

    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    width: '100%',
  },
  inputFocused: {
    borderColor: '#10b981', // El verd de la teva App
    borderWidth: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 40, // Espai pel bottom
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10b981', // El verd de la teva App
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // --- Estils per els botons de connectors ---
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#ecfdf5', // Verd molt claret de fons
    borderColor: '#10b981',     // Vora verda
  },
  chipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },
});