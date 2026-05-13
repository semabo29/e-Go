import { useState, useMemo } from 'react';
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
  Switch,
  Modal
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getSemanticColors, type SemanticColors } from '@/constants/accessibilityColors';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

export default function FiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const styles = useMemo(() => createFiltersStyles(sem), [sem]);

  // Estats per guardar els valors temporals abans d'aplicar
  const [minKw, setMinKw] = useState((params.minKw as string) || '');
  const [maxKw, setMaxKw] = useState((params.maxKw as string) || '');
  const [connectorType, setConnectorType] = useState((params.connectorType as string) || '');
  const [acDc, setAcDc] = useState((params.ac_dc as string) || '');
  const [errorMessage, setErrorMessage] = useState('');

  // Llista de connectors més habituals
  const CONNECTOR_TYPES = ['CCS Combo2', 'CHAdeMO', 'Schuko', 'MENNEKES', 'TESLA'];

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [showFavorites, setShowFavorites] = useState(params.showFavorites === 'true');

  const handleApply = () => {
    setErrorMessage('');

    if (minKw !== '' && maxKw !== '') {
      const min = parseFloat(minKw);
      const max = parseFloat(maxKw);

      if (min > max) {
        setErrorMessage('La potencia mínima no puede ser mayor que la máxima');
        return;
      }
    }

    router.navigate({
      pathname: '/',
      params: {
          minKw,
          maxKw,
          showFavorites: showFavorites ? 'true' : '',
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
        {/* Espai buit per centrar el títol */}
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={{flex: 1}}>

          <Text style={styles.description}>
                Ajusta los parámetros para encontrar el punto de carga ideal.
              </Text>

              {/* INTERRUPTOR DE FAVORITOS */}
              <View style={styles.switchGroup}>
                <Text style={styles.label}>Mis Estaciones</Text>
                <View style={styles.switchRow}>
                  <MaterialIcons name={showFavorites ? "favorite" : "favorite-border"} size={22} color={showFavorites ? sem.favorite : "#64748b"} />
                  <Text style={styles.switchDescription}>Mostrar solo mis favoritos</Text>
                  <Switch
                    value={showFavorites}
                    onValueChange={setShowFavorites}
                    trackColor={{ false: '#cbd5e1', true: sem.accent }}
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
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                cursorColor={sem.accent}
                value={minKw}
                onChangeText={setMinKw}
                maxLength={4}
                onFocus={() => setFocusedInput('min')}
                onBlur={() => setFocusedInput(null)}
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
                cursorColor={sem.accent}
                value={maxKw}
                onChangeText={setMaxKw}
                maxLength={4}
                onFocus={() => setFocusedInput('max')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Secció Tipo de corriente */}
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
      </ScrollView>

      {/* Botons d'acció */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
          <Text style={styles.clearBtnText}>Limpiar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
          <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
        </TouchableOpacity>
      </View>

      {/* --- POP-UP FLOTANT D'ERROR --- */}
      <Modal
        visible={errorMessage !== ''}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorMessage('')}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPopup}>
            <View style={styles.modalContent}>
              <MaterialIcons name="error" size={28} color={sem.error} />
              <Text style={styles.modalText}>{errorMessage}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setErrorMessage('')}
            >
              <MaterialIcons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createFiltersStyles = (sem: SemanticColors) => StyleSheet.create({
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
  contentContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    paddingBottom: 40,
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
    borderColor: sem.accent,
    borderWidth: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 40,
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
    backgroundColor: sem.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
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
    backgroundColor: sem.chipActiveBg,
    borderColor: sem.accent,
  },
  chipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  chipTextActive: {
    color: sem.accent,
    fontWeight: '700',
  },
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
    borderColor: sem.accent,
    backgroundColor: sem.chipActiveBg,
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  typeBtnTextActive: {
    color: sem.accent,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalPopup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  modalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flexShrink: 1,
    lineHeight: 24,
  },
  modalCloseButton: {
    marginLeft: 16,
    padding: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
});