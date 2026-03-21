import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Switch
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Estats per guardar els valors temporals abans d'aplicar
  const [minKw, setMinKw] = useState((params.minKw as string) || '');
  const [maxKw, setMaxKw] = useState((params.maxKw as string) || '');
  const [connectorType, setConnectorType] = useState((params.connectorType as string) || '');
  const [acDc, setAcDc] = useState((params.ac_dc as string) || '');

  // Llista de connectors més habituals
  const CONNECTOR_TYPES = ['CCS Combo2', 'CHAdeMO', 'Schuko', 'MENNEKES', 'TESLA'];

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

 //Estado para el filtro de favoritos (leemos si ya venía activado)
  const [showFavorites, setShowFavorites] = useState(params.showFatvories === 'true');


  const handleApply = () => {
    // 1. Comprovem que cap dels dos estigui buit abans de comparar-los
    if (minKw !== '' && maxKw !== '') {
      const min = parseFloat(minKw);
      const max = parseFloat(maxKw);

      // Si el mínim és estrictament major que el màxim, llancem error i no avancem
      if (min > max) {
        Alert.alert('La potencia mínima no puede ser mayor que la máxima');
        return; // Això atura l'execució i no canvia de pantalla
      }
    }

    // 2. Si tot és correcte (o si falta algun dels dos camps), apliquem els filtres
    router.navigate({
      pathname: '/',
      params: {//Enviamos los parametros de vuelta al index
          minKw,
          maxKw,
          showFavorites: showFavorites ? 'true' : '', //Si es true mandamos 'true', si no, vacío
          ac_dc: acDc,
          connectorType
      }
    });
  };

  const handleClear = () => {
    setMinKw('');
    setMaxKw('');
    if (setAcDc) setAcDc('');
    if (setConnectorType) setConnectorType('');
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

      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Això fa que si toques qualsevol espai buit, s'amagui el teclat */}
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss}>
          <View style={{flex: 1}}>
            
          <Text style={styles.description}>
                Ajusta los parámetros para encontrar el punto de carga ideal.
              </Text>

              {/*   INTERRUPTOR DE FAVORITOS*/}
              <View style={styles.switchGroup}>
                <Text style={styles.label}>Mis Estaciones</Text>
                <View style={styles.switchRow}>
                  <MaterialIcons name={showFavorites ? "favorite" : "favorite-border"} size={22} color={showFavorites ? "#ef4444" : "#64748b"} />
                  <Text style={styles.switchDescription}>Mostrar solo mis favoritos</Text>
                  <Switch
                    value={showFavorites}
                    onValueChange={setShowFavorites}
                    trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

            {/* Input Mínim */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Potencia Mínima (kW)</Text>
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
              <Text style={styles.label}>Potencia Máxima (kW)</Text>
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

            {/*Secció Tipo de corrient*/}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Corriente</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['AC', 'DC'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBtn,
                      acDc === type && styles.typeBtnActive
                    ]}
                    // Si ja estava seleccionat i hi tornem a clicar, el desmarquem
                    onPress={() => setAcDc(acDc === type ? '' : type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.typeBtnText,
                      acDc === type && styles.typeBtnTextActive
                    ]}>
                      {type === 'AC' ? 'AC' : 'DC'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
          </View>
        </TouchableWithoutFeedback>
      </ScrollView> {/*<-- Final de content*/}

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
  //Estilos interruptor favoritos
  switchGroup: {
      marginBottom: 24,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    switchDescription: {
      flex: 1,
      fontSize: 16,
      color: '#334155',
      marginLeft: 8,
    },
    //Fin estilos interruptor favoritos
  contentContainer: {
    flex: 1,
  },
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
    padding: 24,
    paddingBottom: 40, // Espai pel bottom
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
  // --- Estils per els botons de les corrents ---
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  typeBtnActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  typeBtnTextActive: {
    color: '#10b981',
  },
});
