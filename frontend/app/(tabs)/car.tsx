import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getApiUrl } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';

interface Vehicle {
  usuari: number;
  nom: string;
  kw: string;
  tipus_connexio: string;
  ac_dc: string;
}


export default function VehiclesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Estats per a guardar els valors del formulari
  const [nom, setNom] = useState('');
  const [potencia, setPotencia] = useState('');
  const [connectorType, setConnectorType] = useState('');
  const [acDc, setAcDc] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Llista de vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const { user } = useAuth();

  // Llista de connectors més habituals
  const CONNECTOR_TYPES = ['CCS Combo2', 'CHAdeMO', 'Schuko', 'MENNEKES', 'TESLA'];

  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const fetchVehicles = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${getApiUrl()}/car?usuari_id=${user.id}`); // vehicles d'un usuari
      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : []);
      console.log(data);
    } catch (error) {
      console.error("Error cargando vehiculos:", error);
    }
  };
  
  // Carregar vehicles inicialment
  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  // Guardar vehicle
  const saveCar = async () => {
    // Netegem l'error abans de tornar a comprovar
    setErrorMessage('');
    
    if ((nom === '') || (potencia === '') || (connectorType === '') || (acDc === '')) {
	setErrorMessage('Los vehículos deben estar completamente especificados (nombre, potencia, tipo de conector y de corriente)');
	return;
    }
	  
    try {
      const method = 'POST';
      const res = await fetch(`${getApiUrl()}/car`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuari_id: user!.id, v_nom: nom, v_potencia: potencia, v_conector: connectorType, v_corrent: acDc}),
      });

      if (res.ok) {
        try {
          // És fetchvehicles() però fa la cerca després
          const response = await fetch(`${getApiUrl()}/car?usuari_id=${user!.id}`);
          const data = await response.json();
          setVehicles(Array.isArray(data) ? data : []);
          console.log(data);
          router.navigate({
            pathname: '/',
            params: {// Paràmetres de la cerca
              maxKw: Number(potencia),
              ac_dc: acDc,
              connectorType: connectorType
            }
          })
          setNom('');
          setPotencia('');
          setConnectorType('');
          setAcDc('');
        } catch (error) {
          console.error("Error cargando vehiculos:", error);
        }
      } else {
        Alert.alert("Error", "No se ha podido guardar el vehículo");
      }
    } catch (e) {
      console.error('Error al guardar vehiculo', e);
      Alert.alert("Error", "Error de conexión");
    }
  };

  // Eliminar vehicle
  const deleteCar = async ( nomV : string ) => {
    // Netegem l'error
    setErrorMessage('');
	  
    try {
      const method = 'DELETE';
      const res = await fetch(`${getApiUrl()}/car`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuari_id: user!.id, v_nom: nomV }),
      });

      if (res.ok) {
        try {
          // És fetchvehicles()
          const response = await fetch(`${getApiUrl()}/car?usuari_id=${user!.id}`);
          const data = await response.json();
          setVehicles(Array.isArray(data) ? data : []);
          console.log(data);
        } catch (error) {
          console.error("Error cargando vehiculos:", error);
        }
      } else {
        Alert.alert("Error", "No se ha podido eliminar el vehículo");
      }
    } catch (e) {
      console.error('Error al eliminar vehiculo', e);
      Alert.alert("Error", "Error de conexión");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Capçalera */}
      <View style={styles.header}>
        <Text style={styles.titleHeader}>Garaje</Text>
      </View>

      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {vehicles.map((v) => {
          return (
            <View key={v.nom} style={styles.infoPanel}>
              <Text style={styles.title}>{v.nom}</Text>
              {/* Informació del vehicle */}
              <View style={styles.infoBadgeRow}>
                <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
                  <MaterialIcons name="bolt" size={14} color="#10b981" />
                  <Text style={[styles.badgeText, { color: '#047857' }]}>{v.kw} kW</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
                  <MaterialIcons name="ev-station" size={14} color="#10b981" />
                  <Text style={[styles.badgeText, { color: '#047857' }]}>{v.ac_dc}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
                  <MaterialIcons name="electrical-services" size={14} color="#10b981" />
                  <Text style={[styles.badgeText, { color: '#047857' }]}>{v.tipus_connexio}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => router.navigate({
                  pathname: '/',
                  params: {
                    maxKw: Number(v.kw),
                    ac_dc: v.ac_dc,
                    connectorType: v.tipus_connexio
                  }
                })}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>Buscar estaciones</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteCar(v.nom)}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteBtnText}>Eliminar vehículo</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={styles.lastinfoPanel}>
          <Text style={styles.titleNew}>Nuevo vehículo</Text>

          {/* Input Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={[
                styles.input, focusedInput === 'nom' && styles.inputFocused,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}
              ]}
              keyboardType="default"
              cursorColor="#10b981"
              value={nom}
              onChangeText={setNom}
              maxLength={50}
              onFocus={() => setFocusedInput('nom')}
              onBlur={() => setFocusedInput(null)}
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
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              cursorColor="#10b981"
              value={potencia}
              onChangeText={setPotencia}
              maxLength={4}
              onFocus={() => setFocusedInput('max')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Tipus de Corrent */}
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

          {/* Tipus de Connector */}
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

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={saveCar} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Guardar vehículo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* --- POP-UP FLOTANT D'ERROR --- */}
      <Modal
        visible={errorMessage !== ''}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorMessage('')} // Per quan l'usuari clica el botó "Enrere" d'Android
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPopup}>

            {/* Capçalera del pop-up amb la icona i el text */}
            <View style={styles.modalContent}>
              <MaterialIcons name="error" size={28} color="#ef4444" />
              <Text style={styles.modalText}>{errorMessage}</Text>
            </View>

            {/* Botó per tancar / Creueta */}
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

const styles = StyleSheet.create({
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
    justifyContent: 'center',
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
  titleHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 20,
  },
  titleNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
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
    alignSelf: 'stretch',
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
    marginTop: 15,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  deleteBtnText: {
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
  // --- Estils del Pop-up Modal ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Fons semi-transparent per ressaltar el pop-up
    justifyContent: 'center', // Centra verticalment
    alignItems: 'center',     // Centra horitzontalment
    padding: 20,              // Marge de seguretat perquè no toqui les vores en pantalles petites
  },
  modalPopup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400, // Topall màxim perquè en tauletes no es vegi gegant
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
    flex: 1, // Ocupa l'espai restant
    gap: 12,
  },
  modalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flexShrink: 1, // Fa que el text salti de línia si és llarg en comptes de tallar-se
    lineHeight: 24,
  },
  modalCloseButton: {
    marginLeft: 16,
    padding: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  infoPanel: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px 0px 12px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 10,
    marginBottom: 16,
  },
  lastinfoPanel: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px 0px 12px rgba(0, 0, 0, 0.1)',
    elevation: 10,
    marginBottom: -16,
  },
  infoBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});