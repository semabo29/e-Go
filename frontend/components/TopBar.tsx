import React from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, StatusBar, FlatList, Text, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TopBarProps {
  onPressMenu: () => void;
  // Noves propietats pel buscador
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  searchResults: any[];
  onSelectResult: (station: any) => void;
  isSearching: boolean;
}

export default function TopBar({ onPressMenu, searchQuery, setSearchQuery, searchResults, onSelectResult, isSearching }: TopBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.headerContainer}>
        {/* Logo d'e-Go */}
        <TouchableOpacity style={styles.logoContainer}>
          <Image
            source={require('../assets/images/favicon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)
            ]}
            placeholder="Buscar"
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // Aquesta propietat nativa elimina la línia inferior o efectes de focus a Android
            underlineColorAndroid="transparent"
          />
          {isSearching && <ActivityIndicator size="small" color="#10b981" />}
          {/* Botó per esborrar la cerca ràpidament */}
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Menú d'opcions (Hamburguesa) */}
        <TouchableOpacity style={styles.menuButton} onPress={onPressMenu}>
          <Ionicons name="menu" size={32} color="black" />
        </TouchableOpacity>
      </View>

      {/* Llista de resultats desplegable */}
      {searchQuery.length > 0 && (
        <View style={styles.dropdownContainer}>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              keyboardShouldPersistTaps="handled" // Permet clicar mentre el teclat està obert
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => onSelectResult(item)}
                >
                  <Ionicons name="location-outline" size={20} color="#10b981" />
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultName} numberOfLines={1}>{item.nom || 'Punto de carga'}</Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>{item.adreca}, {item.municipi}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            !isSearching && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No se han encontrado resultados</Text>
              </View>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 100, // Molt important perquè el desplegable quedi per sobre del mapa
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingBottom: 10,
    paddingTop: (StatusBar.currentHeight || 24),
    elevation: 4,
    zIndex: 10, // Manté la barra sobre l'ombra
  },
  logoContainer: { justifyContent: 'center', alignItems: 'center' },
  logo: { width: 100, height: 60 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    marginHorizontal: 15,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: 'black' },
  menuButton: { padding: 2 },

  // Estils pel desplegable de resultats
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 15,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: 250,
    elevation: 6, // Ombra Android
    shadowColor: '#000', // Ombra iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginTop: 5,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  resultAddress: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#64748b',
    fontSize: 14,
  }
});