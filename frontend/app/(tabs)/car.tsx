import { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { appFetch } from '@/services/appFetch';
import { getApiUrl } from '@/constants/api';
import { getSemanticColors } from '@/constants/accessibilityColors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';
import egg from '../egg';
import Egg from '../egg';

interface Vehicle {
  usuari: number;
  nom: string;
  kw: string;
  tipus_connexio: string;
  ac_dc: string;
}


export default function VehiclesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { colorblindFriendly } = useColorblindPreference();
  const sem = useMemo(() => getSemanticColors(colorblindFriendly), [colorblindFriendly]);
  const themeIndex = colorScheme === 'dark' ? 1 : 0;

  const getThemeColor = (values: [string, string]) => values[themeIndex];
  const theme = {
    containerBg: getThemeColor(['#f8fafc', '#0f172a']),
    surface: getThemeColor(['#ffffff', '#1e293b']),
    border: getThemeColor(['#e2e8f0', '#334155']),
    title: getThemeColor(['#1f2937', '#f1f5f9']),
    secondaryText: getThemeColor(['#475569', '#cbd5e1']),
    mutedText: getThemeColor(['#64748b', '#94a3b8']),
    inputBg: getThemeColor(['#ffffff', '#0f172a']),
    inputBorder: getThemeColor(['#cbd5e1', '#475569']),
    chipBg: getThemeColor(['#f1f5f9', '#334155']),
    chipBorder: getThemeColor(['#e2e8f0', '#475569']),
    chipText: getThemeColor(['#64748b', '#cbd5e1']),
    typeBtnBg: getThemeColor(['#f1f5f9', '#334155']),
    overlay: getThemeColor(['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.55)']),
    modalCloseBg: getThemeColor(['#f1f5f9', '#334155']),
    modalCloseIcon: getThemeColor(['#94a3b8', '#cbd5e1']),
    badgeBg: sem.badgeBg,
    badgeIcon: sem.badgeIcon,
    badgeText: sem.badgeLabel,
    textPrimaryInverse: '#ffffff',
    accent: sem.accent,
    danger: sem.error,
    chipHighlightBg: sem.chipActiveBg,
    placeholder: getThemeColor(['#94a3b8', '#94a3b8']),
  };
  const styles = useMemo(() => createStyles(theme), [colorScheme, colorblindFriendly]);

  // Estats per a guardar els valors del formulari
  const [nom, setNom] = useState('');
  const [potencia, setPotencia] = useState('');
  const [connectorType, setConnectorType] = useState('');
  const [acDc, setAcDc] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showEgg, setShowEgg] = useState(false);
  
  // Llista de vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const { user } = useAuth();

  // Llista de connectors més habituals
  const CONNECTOR_TYPES = ['CCS Combo2', 'CHAdeMO', 'Schuko', 'MENNEKES', 'TESLA'];

  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const fetchVehicles = async () => {
    if (!user?.id) return;
    try {
      const response = await appFetch(`/car?usuari_id=${user.id}`); // vehicles d'un usuari
      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : []);
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
    
	  if(nom === "Voltix") {
      setShowEgg(true);
      setNom('');
      setPotencia('');
      setConnectorType('');
      setAcDc('');
      return;
    }

    if ((nom === '') || (potencia === '') || (connectorType === '') || (acDc === '')) {
	setErrorMessage(t('car.validationIncomplete'));
	return;
    }
    try {
      const method = 'POST';
      const res = await appFetch('/car', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuari_id: user!.id, v_nom: nom, v_potencia: potencia, v_conector: connectorType, v_corrent: acDc}),
      });

      if (res.ok) {
        try {
          // És fetchvehicles() però fa la cerca després
          const response = await appFetch(`/car?usuari_id=${user!.id}`);
          const data = await response.json();
          setVehicles(Array.isArray(data) ? data : []);
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
        Alert.alert(t('common.error'), t('car.saveError'));
      }
    } catch (e) {
      console.error('Error al guardar vehiculo', e);
      Alert.alert(t('common.error'), t('car.connectionError'));
    }
  };

  // Eliminar vehicle
  const deleteCar = async ( nomV : string ) => {
    // Netegem l'error
    setErrorMessage('');
	  
    try {
      const method = 'DELETE';
      const res = await appFetch('/car', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuari_id: user!.id, v_nom: nomV }),
      });

      if (res.ok) {
        try {
          // És fetchvehicles()
          const response = await appFetch(`/car?usuari_id=${user!.id}`);
          const data = await response.json();
          setVehicles(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Error cargando vehiculos:", error);
        }
      } else {
        Alert.alert(t('common.error'), t('car.deleteError'));
      }
    } catch (e) {
      console.error('Error al eliminar vehiculo', e);
      Alert.alert(t('common.error'), t('car.connectionError'));
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="garage-screen-root">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Capçalera */}
      <View style={styles.header}>
        <Text style={styles.titleHeader}>{t('car.garage')}</Text>
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
                <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
                  <MaterialIcons name="bolt" size={14} color={theme.badgeIcon} />
                  <Text style={[styles.badgeText, { color: theme.badgeText }]}>{v.kw} kW</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
                  <MaterialIcons name="ev-station" size={14} color={theme.badgeIcon} />
                  <Text style={[styles.badgeText, { color: theme.badgeText }]}>{v.ac_dc}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
                  <MaterialIcons name="electrical-services" size={14} color={theme.badgeIcon} />
                  <Text style={[styles.badgeText, { color: theme.badgeText }]}>{v.tipus_connexio}</Text>
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
                <Text style={styles.applyBtnText}>{t('car.searchStations')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteCar(v.nom)}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteBtnText}>{t('car.deleteVehicle')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={styles.lastinfoPanel}>
          <Text style={styles.titleNew}>{t('car.newVehicle')}</Text>

          {/* Input Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('car.name')}</Text>
            <TextInput
              style={[
                styles.input, focusedInput === 'nom' && styles.inputFocused,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}
              ]}
              keyboardType="default"
              cursorColor={theme.accent}
              value={nom}
              onChangeText={setNom}
              maxLength={50}
              onFocus={() => setFocusedInput('nom')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Input Màxim */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('car.maxPower')}</Text>
            <TextInput
              style={[
                styles.input, focusedInput === 'max' && styles.inputFocused,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}
              ]}
              placeholderTextColor={theme.placeholder}
              keyboardType="numeric"
              cursorColor={theme.accent}
              value={potencia}
              onChangeText={setPotencia}
              maxLength={4}
              onFocus={() => setFocusedInput('max')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Tipus de Corrent */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('car.currentType')}</Text>
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
            <Text style={styles.label}>{t('car.connectorType')}</Text>
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
            <TouchableOpacity
              testID="garage-save-vehicle-button"
              style={styles.applyBtn}
              onPress={saveCar}
              activeOpacity={0.8}
            >
              <Text style={styles.applyBtnText}>{t('car.saveVehicle')}</Text>
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
              <MaterialIcons name="error" size={28} color={theme.danger} />
              <Text style={styles.modalText}>{errorMessage}</Text>
            </View>

            {/* Botó per tancar / Creueta */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setErrorMessage('')}
            >
              <MaterialIcons name="close" size={24} color={theme.modalCloseIcon} />
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      <Egg
        visible={showEgg}
        onClose={() => setShowEgg(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: {
  containerBg: string;
  surface: string;
  border: string;
  title: string;
  secondaryText: string;
  mutedText: string;
  inputBg: string;
  inputBorder: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  typeBtnBg: string;
  overlay: string;
  modalCloseBg: string;
  textPrimaryInverse: string;
  accent: string;
  danger: string;
  chipHighlightBg: string;
}) => StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.containerBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.title,
  },
  titleHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.title,
    marginTop: 20,
  },
  titleNew: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.title,
    marginBottom: 16,
  },
  content: {
    padding: 24,
    paddingBottom: 40, // Espai pel bottom
  },
  description: {
    fontSize: 15,
    color: theme.mutedText,
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
    color: theme.secondaryText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.title,
    width: '100%',
  },
  inputFocused: {
    borderColor: theme.accent, // El verd de la teva App
    borderWidth: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 40, // Espai pel bottom
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: theme.mutedText,
    fontSize: 16,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.accent, // El verd de la teva App
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  applyBtnText: {
    color: theme.textPrimaryInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  deleteBtnText: {
    color: theme.textPrimaryInverse,
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
    backgroundColor: theme.chipBg,
    borderWidth: 1,
    borderColor: theme.chipBorder,
  },
  chipActive: {
    backgroundColor: theme.chipHighlightBg,
    borderColor: theme.accent,
  },
  chipText: {
    fontSize: 14,
    color: theme.chipText,
    fontWeight: '500',
  },
  chipTextActive: {
    color: theme.accent,
    fontWeight: '700',
  },
  // --- Estils per els botons de les corrents ---
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.typeBtnBg,
  },
  typeBtnActive: {
    borderColor: theme.accent,
    backgroundColor: theme.chipHighlightBg,
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.mutedText,
  },
  typeBtnTextActive: {
    color: theme.accent,
  },
  // --- Estils del Pop-up Modal ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.overlay, // Fons semi-transparent per ressaltar el pop-up
    justifyContent: 'center', // Centra verticalment
    alignItems: 'center',     // Centra horitzontalment
    padding: 20,              // Marge de seguretat perquè no toqui les vores en pantalles petites
  },
  modalPopup: {
    backgroundColor: theme.surface,
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
    color: theme.title,
    flexShrink: 1, // Fa que el text salti de línia si és llarg en comptes de tallar-se
    lineHeight: 24,
  },
  modalCloseButton: {
    marginLeft: 16,
    padding: 4,
    backgroundColor: theme.modalCloseBg,
    borderRadius: 20,
  },
  infoPanel: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px 0px 12px rgba(0, 0, 0, 0.1)', // width, height, blur, color amb opacitat
    elevation: 10,
    marginBottom: 16,
  },
  lastinfoPanel: {
    backgroundColor: theme.surface,
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