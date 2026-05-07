import { useEffect, useRef, useState } from 'react';
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

import { MapView, Marker } from '@/app/_components/MapWrapper';
import { FormState } from '@/components/stations/types';
import { GeoSuggestion, reverseGeoAddress, searchGeoAddress } from '@/services/geoService';

const CATALUNYA_MUNICIPALITIES_BY_PROVINCE = require('@/constants/catalunyaMunicipalities.json') as Record<string, string[]>;
const CATALUNYA_PROVINCES = Object.keys(CATALUNYA_MUNICIPALITIES_BY_PROVINCE);
const AC_DC_OPTIONS = ['AC', 'DC'] as const;
const TIPUS_CONNEXIO_OPTIONS = ['TESLA', 'MENNEKES.M', 'MENNEKES.F', 'ChadeMO', 'CCS Combo2', 'Shuko'] as const;
const TIPUS_VELOCITAT_OPTIONS = ['RAPID', 'superRAPID', 'semiRAPID', 'NORMAL'] as const;

function splitMultiValue(value: string, separatorPattern: RegExp) {
  if (!value.trim()) return [];
  return value.split(separatorPattern).map((item) => item.trim()).filter(Boolean);
}

type Props = {
  title: string;
  subtitle: string;
  submitLabel: string;
  loading: boolean;
  error: string;
  success: string;
  form: FormState;
  onChange: (key: keyof FormState, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function ManualStationForm(props: Props) {
  const { title, subtitle, submitLabel, loading, error, success, form, onChange, onSubmit, onBack } = props;
  const [mapOpen, setMapOpen] = useState(false);
  const [provincePickerOpen, setProvincePickerOpen] = useState(false);
  const [municipalityPickerOpen, setMunicipalityPickerOpen] = useState(false);
  const [acDcPickerOpen, setAcDcPickerOpen] = useState(false);
  const [tipusConnexioPickerOpen, setTipusConnexioPickerOpen] = useState(false);
  const [tipusVelocitatPickerOpen, setTipusVelocitatPickerOpen] = useState(false);
  const [municipalityQuery, setMunicipalityQuery] = useState('');
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<GeoSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAddressSearchRef = useRef(false);
  const manualMunicipalityRef = useRef(false);
  const manualProvinceRef = useRef(false);
  const municipalityOptions = form.provincia ? CATALUNYA_MUNICIPALITIES_BY_PROVINCE[form.provincia] ?? [] : [];
  const filteredMunicipalityOptions = !municipalityQuery.trim()
    ? municipalityOptions
    : municipalityOptions.filter((municipality) => municipality.toLowerCase().includes(municipalityQuery.trim().toLowerCase()));

  function toggleMultiSelection(
    key: keyof Pick<FormState, 'ac_dc' | 'tipus_connexio' | 'tipus_velocitat'>,
    option: string,
    allOptions: readonly string[],
    separator: string,
    separatorPattern: RegExp
  ) {
    const selected = splitMultiValue(form[key], separatorPattern);
    const nextSelected = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option];
    const ordered = allOptions.filter((item) => nextSelected.includes(item));
    onChange(key, ordered.join(separator));
  }

  useEffect(() => {
    const lat = Number(form.latitud);
    const lng = Number(form.longitud);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setPicked({ lat, lng });
    }
  }, [form.latitud, form.longitud]);

  useEffect(() => {
    if (skipAddressSearchRef.current) {
      skipAddressSearchRef.current = false;
      return;
    }

    const query = form.adreca.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setAddressLoading(true);
        const suggestions = await searchGeoAddress(query);
        setAddressSuggestions(suggestions);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.adreca]);

  function applyGeoSuggestion(suggestion: GeoSuggestion, setCoordinates: boolean) {
    skipAddressSearchRef.current = true;
    onChange('adreca', suggestion.formattedAddress);
    if (setCoordinates) {
      onChange('latitud', String(suggestion.lat));
      onChange('longitud', String(suggestion.lng));
      setPicked({ lat: suggestion.lat, lng: suggestion.lng });
    }
    if (!manualMunicipalityRef.current && suggestion.municipi) {
      onChange('municipi', suggestion.municipi);
    }
    if (!manualProvinceRef.current && suggestion.provincia) {
      onChange('provincia', suggestion.provincia);
    }
    setAddressSuggestions([]);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basico</Text>
          <TextInput style={styles.input} placeholder="Nombre de la estacion" placeholderTextColor="#9ca3af" value={form.nom} onChangeText={(v) => onChange('nom', v)} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="Latitud" placeholderTextColor="#9ca3af" keyboardType="numeric" value={form.latitud} onChangeText={(v) => onChange('latitud', v)} />
            <TextInput style={[styles.input, styles.half]} placeholder="Longitud" placeholderTextColor="#9ca3af" keyboardType="numeric" value={form.longitud} onChangeText={(v) => onChange('longitud', v)} />
          </View>
          <TouchableOpacity style={styles.mapButton} onPress={() => setMapOpen(true)}>
            <Text style={styles.mapButtonText}>Seleccionar en el mapa</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="Potencia (kW)" placeholderTextColor="#9ca3af" keyboardType="numeric" value={form.kw} onChangeText={(v) => onChange('kw', v)} />
            <TouchableOpacity style={[styles.input, styles.half, styles.selectInput]} onPress={() => setAcDcPickerOpen(true)} activeOpacity={0.8}>
              <Text style={form.ac_dc ? styles.selectText : styles.placeholderText}>{form.ac_dc || 'AC/DC'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conector y velocidad</Text>
          <TouchableOpacity style={[styles.input, styles.selectInput]} onPress={() => setTipusConnexioPickerOpen(true)} activeOpacity={0.8}>
            <Text style={form.tipus_connexio ? styles.selectText : styles.placeholderText}>{form.tipus_connexio || 'Tipo de conexion'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, styles.selectInput]} onPress={() => setTipusVelocitatPickerOpen(true)} activeOpacity={0.8}>
            <Text style={form.tipus_velocitat ? styles.selectText : styles.placeholderText}>{form.tipus_velocitat || 'Tipo de velocidad'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direccion</Text>
          <TextInput
            style={styles.input}
            placeholder="Direccion"
            placeholderTextColor="#9ca3af"
            value={form.adreca}
            onChangeText={(v) => {
              skipAddressSearchRef.current = false;
              onChange('adreca', v);
            }}
          />
          {addressLoading ? <Text style={styles.helperText}>Buscando direcciones...</Text> : null}
          {!addressLoading && addressSuggestions.length ? (
            <View style={styles.suggestionList}>
              {addressSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={`${suggestion.lat},${suggestion.lng},${suggestion.formattedAddress}`}
                  style={styles.suggestionItem}
                  onPress={() => applyGeoSuggestion(suggestion, true)}
                >
                  <Text style={styles.suggestionText}>{suggestion.formattedAddress}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {geoMessage ? <Text style={styles.helperText}>{geoMessage}</Text> : null}
          <View style={styles.row}>
            <TouchableOpacity style={[styles.input, styles.half, styles.selectInput]} onPress={() => setProvincePickerOpen(true)} activeOpacity={0.8}>
              <Text style={form.provincia ? styles.selectText : styles.placeholderText}>{form.provincia || 'Provincia'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.input, styles.half, styles.selectInput, !form.provincia && styles.disabledInput]}
              onPress={() => {
                if (form.provincia) {
                  manualMunicipalityRef.current = true;
                  setMunicipalityQuery('');
                  setMunicipalityPickerOpen(true);
                }
              }}
              activeOpacity={0.8}
              disabled={!form.provincia}
            >
              <Text style={form.municipi ? styles.selectText : styles.placeholderText}>{form.municipi || (form.provincia ? 'Municipio' : 'Selecciona provincia antes')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operador</Text>
          <TextInput style={styles.input} placeholder="Promotor/gestor" placeholderTextColor="#9ca3af" value={form.promotor} onChangeText={(v) => onChange('promotor', v)} />
          <TextInput style={styles.input} placeholder="Acceso" placeholderTextColor="#9ca3af" value={form.acces} onChangeText={(v) => onChange('acces', v)} />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{submitLabel}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <View style={styles.mapScreen}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Selecciona ubicacion</Text>
            <TouchableOpacity onPress={() => setMapOpen(false)}><Text style={styles.mapClose}>Cerrar</Text></TouchableOpacity>
          </View>
          <View style={styles.mapContainer}>
            <MapView
              style={StyleSheet.absoluteFillObject}
              initialRegion={{ latitude: picked?.lat ?? 41.3879, longitude: picked?.lng ?? 2.16992, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
              onPress={(e: any) => setPicked({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
            >
              {picked ? <Marker coordinate={{ latitude: picked.lat, longitude: picked.lng }} /> : null}
            </MapView>
          </View>
          <View style={styles.mapFooter}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={async () => {
                if (picked) {
                  onChange('latitud', String(picked.lat));
                  onChange('longitud', String(picked.lng));
                  try {
                    setReverseLoading(true);
                    setGeoMessage('');
                    const suggestion = await reverseGeoAddress(picked.lat, picked.lng);
                    if (suggestion) {
                      applyGeoSuggestion(suggestion, false);
                    }
                  } catch {
                    setGeoMessage('No se pudo autocompletar la direccion desde el mapa.');
                  } finally {
                    setReverseLoading(false);
                  }
                }
                setMapOpen(false);
              }}
            >
              <Text style={styles.primaryButtonText}>{reverseLoading ? 'Obteniendo direccion...' : 'Usar esta ubicacion'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={acDcPickerOpen} animationType="fade" transparent onRequestClose={() => setAcDcPickerOpen(false)}>
        <View style={styles.overlay}><View style={styles.pickerCard}><Text style={styles.pickerTitle}>Selecciona AC/DC</Text>{AC_DC_OPTIONS.map((option) => <TouchableOpacity key={option} style={[styles.pickerOption, splitMultiValue(form.ac_dc, /\//).includes(option) && styles.pickerOptionSelected]} onPress={() => toggleMultiSelection('ac_dc', option, AC_DC_OPTIONS, '/', /\//)}><Text style={styles.pickerOptionText}>{option}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.secondaryButton} onPress={() => setAcDcPickerOpen(false)}><Text style={styles.secondaryButtonText}>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={tipusConnexioPickerOpen} animationType="fade" transparent onRequestClose={() => setTipusConnexioPickerOpen(false)}>
        <View style={styles.overlay}><View style={styles.pickerCard}><Text style={styles.pickerTitle}>Selecciona tipo de conexion</Text><ScrollView style={styles.pickerList}>{TIPUS_CONNEXIO_OPTIONS.map((option) => <TouchableOpacity key={option} style={[styles.pickerOption, splitMultiValue(form.tipus_connexio, /\+/).includes(option) && styles.pickerOptionSelected]} onPress={() => toggleMultiSelection('tipus_connexio', option, TIPUS_CONNEXIO_OPTIONS, '+', /\+/)}><Text style={styles.pickerOptionText}>{option}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity style={styles.secondaryButton} onPress={() => setTipusConnexioPickerOpen(false)}><Text style={styles.secondaryButtonText}>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={tipusVelocitatPickerOpen} animationType="fade" transparent onRequestClose={() => setTipusVelocitatPickerOpen(false)}>
        <View style={styles.overlay}><View style={styles.pickerCard}><Text style={styles.pickerTitle}>Selecciona tipo de velocidad</Text>{TIPUS_VELOCITAT_OPTIONS.map((option) => <TouchableOpacity key={option} style={[styles.pickerOption, splitMultiValue(form.tipus_velocitat, /\si\s/).includes(option) && styles.pickerOptionSelected]} onPress={() => toggleMultiSelection('tipus_velocitat', option, TIPUS_VELOCITAT_OPTIONS, ' i ', /\si\s/)}><Text style={styles.pickerOptionText}>{option}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.secondaryButton} onPress={() => setTipusVelocitatPickerOpen(false)}><Text style={styles.secondaryButtonText}>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={provincePickerOpen} animationType="fade" transparent onRequestClose={() => setProvincePickerOpen(false)}>
        <View style={styles.overlay}><View style={styles.pickerCard}><Text style={styles.pickerTitle}>Selecciona provincia</Text>{CATALUNYA_PROVINCES.map((province) => <TouchableOpacity key={province} style={styles.pickerOption} onPress={() => { manualProvinceRef.current = true; onChange('provincia', province); if (form.provincia !== province) onChange('municipi', ''); setProvincePickerOpen(false); setMunicipalityQuery(''); }}><Text style={styles.pickerOptionText}>{province}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.secondaryButton} onPress={() => setProvincePickerOpen(false)}><Text style={styles.secondaryButtonText}>Cancelar</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={municipalityPickerOpen} animationType="fade" transparent onRequestClose={() => setMunicipalityPickerOpen(false)}>
        <View style={styles.overlay}><View style={styles.pickerCard}><Text style={styles.pickerTitle}>Selecciona municipio</Text><TextInput style={styles.input} placeholder="Buscar municipio" placeholderTextColor="#9ca3af" value={municipalityQuery} onChangeText={setMunicipalityQuery} /><ScrollView style={styles.pickerList}>{filteredMunicipalityOptions.map((municipality) => <TouchableOpacity key={municipality} style={styles.pickerOption} onPress={() => { manualMunicipalityRef.current = true; onChange('municipi', municipality); setMunicipalityQuery(''); setMunicipalityPickerOpen(false); }}><Text style={styles.pickerOptionText}>{municipality}</Text></TouchableOpacity>)}{!filteredMunicipalityOptions.length ? <Text style={styles.emptyText}>No se han encontrado municipios</Text> : null}</ScrollView><TouchableOpacity style={styles.secondaryButton} onPress={() => { setMunicipalityQuery(''); setMunicipalityPickerOpen(false); }}><Text style={styles.secondaryButtonText}>Cancelar</Text></TouchableOpacity></View></View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' }, scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingVertical: 32 },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 18, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 }, subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 18 },
  section: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }, sectionTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 },
  input: { width: '100%', paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fafafa', marginBottom: 10 },
  selectInput: { justifyContent: 'center' }, selectText: { fontSize: 15, color: '#111827' }, placeholderText: { fontSize: 15, color: '#9ca3af' }, disabledInput: { opacity: 0.55 },
  row: { flexDirection: 'row', gap: 10 }, half: { flex: 1 }, primaryButton: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' }, secondaryButton: { marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: '#e5e7eb', alignItems: 'center' },
  secondaryButtonText: { color: '#111827', fontSize: 14, fontWeight: '600' }, mapButton: { alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#111827' },
  mapButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' }, mapScreen: { flex: 1, backgroundColor: '#fff' }, mapHeader: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapTitle: { fontSize: 16, fontWeight: '700', color: '#111827' }, mapClose: { fontSize: 14, color: '#111827', fontWeight: '600' }, mapContainer: { flex: 1 }, mapFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  overlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }, pickerCard: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }, pickerList: { maxHeight: 320 }, pickerOption: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#f9fafb', marginBottom: 8 },
  pickerOptionSelected: { backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: '#9ca3af' }, pickerOptionText: { fontSize: 15, color: '#111827', fontWeight: '500' }, emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 12 },
  helperText: { fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 },
  suggestionList: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  suggestionItem: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestionText: { fontSize: 14, color: '#111827' },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', marginTop: 8 }, successText: { color: '#047857', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
