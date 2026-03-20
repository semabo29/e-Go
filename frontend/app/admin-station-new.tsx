import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';
import { MapView, Marker } from '@/components/MapWrapper';

const ADMIN_TOKEN_KEY = '@ego_admin_token';

type FormState = {
  nom: string;
  latitud: string;
  longitud: string;
  kw: string;
  ac_dc: string;
  tipus_connexio: string;
  tipus_velocitat: string;
  adreca: string;
  municipi: string;
  provincia: string;
  promotor: string;
  acces: string;
  external_id: string;
};

const initialState: FormState = {
  nom: '',
  latitud: '',
  longitud: '',
  kw: '',
  ac_dc: '',
  tipus_connexio: '',
  tipus_velocitat: '',
  adreca: '',
  municipi: '',
  provincia: '',
  promotor: '',
  acces: '',
  external_id: '',
};

export default function AdminStationNewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getParam = (key: string) => {
    const value = params[key as keyof typeof params];
    if (Array.isArray(value)) return value[0];
    return value as string | undefined;
  };
  const isEdit = getParam('mode') === 'edit';
  const stationId = getParam('id') ? Number(getParam('id')) : null;
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    setForm({
      nom: getParam('nom') || '',
      latitud: getParam('latitud') || '',
      longitud: getParam('longitud') || '',
      kw: getParam('kw') || '',
      ac_dc: getParam('ac_dc') || '',
      tipus_connexio: getParam('tipus_connexio') || '',
      tipus_velocitat: getParam('tipus_velocitat') || '',
      adreca: getParam('adreca') || '',
      municipi: getParam('municipi') || '',
      provincia: getParam('provincia') || '',
      promotor: getParam('promotor') || '',
      acces: getParam('acces') || '',
      external_id: getParam('external_id') || '',
    });
    const lat = getParam('latitud') ? Number(getParam('latitud')) : null;
    const lng = getParam('longitud') ? Number(getParam('longitud')) : null;
    if (lat !== null && !Number.isNaN(lat) && lng !== null && !Number.isNaN(lng)) {
      setPicked({ lat, lng });
    }
  }, [isEdit]);

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  }

  async function submit() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
      if (!token) {
        setError('No hay sesion admin');
        return;
      }
      const basePayload = {
        ...form,
        latitud: form.latitud ? Number(form.latitud) : form.latitud,
        longitud: form.longitud ? Number(form.longitud) : form.longitud,
        kw: form.kw ? Number(form.kw) : form.kw,
      };
      let res;
      if (isEdit && Number.isFinite(stationId)) {
        const payload = Object.fromEntries(
          Object.entries(basePayload).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        );
        res = await fetch(`${API_URL}/admin/stations/${stationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else if (isEdit) {
        setError('ID de estacion invalido');
        return;
      } else {
        res = await fetch(`${API_URL}/admin/stations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(basePayload),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar la estacion');
        return;
      }
      setSuccess(isEdit ? 'Estacion actualizada' : 'Estacion creada correctamente');
      if (!isEdit) setForm(initialState);
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{isEdit ? 'Editar estacion manual' : 'Nueva estacion manual'}</Text>
        <Text style={styles.subtitle}>Solo visible en el backoffice admin</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basico</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la estacion"
            placeholderTextColor="#9ca3af"
            value={form.nom}
            onChangeText={(v) => updateField('nom', v)}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Latitud"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.latitud}
              onChangeText={(v) => updateField('latitud', v)}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Longitud"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.longitud}
              onChangeText={(v) => updateField('longitud', v)}
            />
          </View>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setMapOpen(true)}
          >
            <Text style={styles.mapButtonText}>Seleccionar en el mapa</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Potencia (kW)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.kw}
              onChangeText={(v) => updateField('kw', v)}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="AC/DC"
              placeholderTextColor="#9ca3af"
              value={form.ac_dc}
              onChangeText={(v) => updateField('ac_dc', v)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conector y velocidad</Text>
          <TextInput
            style={styles.input}
            placeholder="Tipo de conexion"
            placeholderTextColor="#9ca3af"
            value={form.tipus_connexio}
            onChangeText={(v) => updateField('tipus_connexio', v)}
          />
          <TextInput
            style={styles.input}
            placeholder="Tipo de velocidad"
            placeholderTextColor="#9ca3af"
            value={form.tipus_velocitat}
            onChangeText={(v) => updateField('tipus_velocitat', v)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direccion</Text>
          <TextInput
            style={styles.input}
            placeholder="Direccion"
            placeholderTextColor="#9ca3af"
            value={form.adreca}
            onChangeText={(v) => updateField('adreca', v)}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Municipio"
              placeholderTextColor="#9ca3af"
              value={form.municipi}
              onChangeText={(v) => updateField('municipi', v)}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Provincia"
              placeholderTextColor="#9ca3af"
              value={form.provincia}
              onChangeText={(v) => updateField('provincia', v)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operador</Text>
          <TextInput
            style={styles.input}
            placeholder="Promotor/gestor"
            placeholderTextColor="#9ca3af"
            value={form.promotor}
            onChangeText={(v) => updateField('promotor', v)}
          />
          <TextInput
            style={styles.input}
            placeholder="Acceso"
            placeholderTextColor="#9ca3af"
            value={form.acces}
            onChangeText={(v) => updateField('acces', v)}
          />
          <TextInput
            style={styles.input}
            placeholder="External ID (opcional)"
            placeholderTextColor="#9ca3af"
            value={form.external_id}
            onChangeText={(v) => updateField('external_id', v)}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{isEdit ? 'Guardar cambios' : 'Crear estacion'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <View style={styles.mapScreen}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Selecciona ubicacion</Text>
            <TouchableOpacity onPress={() => setMapOpen(false)}>
              <Text style={styles.mapClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapContainer}>
            <MapView
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: picked?.lat ?? 41.3879,
                longitude: picked?.lng ?? 2.16992,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={(e: any) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setPicked({ lat: latitude, lng: longitude });
              }}
            >
              {picked && (
                <Marker
                  coordinate={{ latitude: picked.lat, longitude: picked.lng }}
                />
              )}
            </MapView>
          </View>
          <View style={styles.mapFooter}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                if (picked) {
                  updateField('latitud', String(picked.lat));
                  updateField('longitud', String(picked.lng));
                }
                setMapOpen(false);
              }}
            >
              <Text style={styles.primaryButtonText}>Usar esta ubicacion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  section: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  primaryButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  mapButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mapScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mapClose: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  mapFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  successText: {
    color: '#047857',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
