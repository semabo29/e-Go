import React from 'react';
import { View, TextInput, StyleSheet, Image, TouchableOpacity, StatusBar, FlatList, Text, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Fila de resultat: estació (backend) o adreça (Places via backend). */
export type MapSearchListItem =
  | { kind: 'station'; station: { id: number; nom?: string; adreca?: string; municipi?: string } }
  | { kind: 'address'; placeId: string; label: string; subtitle: string };

interface TopBarProps {
  onPressMenu: () => void;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  searchResults: MapSearchListItem[];
  onSelectResult: (item: MapSearchListItem) => void;
  isSearching: boolean;
  searchMode: 'stations' | 'addresses';
  onToggleSearchMode: () => void;
}

export default function TopBar({
  onPressMenu,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSelectResult,
  isSearching,
  searchMode,
  onToggleSearchMode,
}: TopBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = React.useMemo(() => createStyles(isDark), [isDark]);
  const isAddressMode = searchMode === 'addresses';

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.logoContainer}>
          <Image
            source={require('../assets/images/favicon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons
            name={isAddressMode ? 'navigate-outline' : 'search'}
            size={20}
            color={isDark ? '#94a3b8' : '#888'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
            placeholder={isAddressMode ? 'Dirección, calle…' : 'Buscar puntos de carga'}
            placeholderTextColor={isDark ? '#94a3b8' : '#888'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            underlineColorAndroid="transparent"
          />
          {isSearching && <ActivityIndicator size="small" color="#10b981" />}
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={isDark ? '#94a3b8' : '#888'} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          testID="topbar-search-mode-toggle"
          style={[styles.modeToggle, isAddressMode && styles.modeToggleActive]}
          onPress={onToggleSearchMode}
          accessibilityRole="button"
          accessibilityLabel={
            isAddressMode
              ? 'Canviar a cerca de punts de recàrrega'
              : "Canviar a cerca d'adreces al mapa"
          }
        >
          <Ionicons
            name={isAddressMode ? 'flash-outline' : 'map-outline'}
            size={22}
            color={isAddressMode ? '#fff' : isDark ? '#e2e8f0' : '#334155'}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={onPressMenu}>
          <Ionicons name="menu" size={32} color={isDark ? '#f1f5f9' : 'black'} />
        </TouchableOpacity>
      </View>

      {searchQuery.length > 0 && (
        <View style={styles.dropdownContainer}>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) =>
                item.kind === 'station'
                  ? `s-${item.station.id}-${index}`
                  : `a-${item.placeId}-${index}`
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => onSelectResult(item)}>
                  <Ionicons
                    name={item.kind === 'station' ? 'flash-outline' : 'location-outline'}
                    size={20}
                    color="#10b981"
                  />
                  <View style={styles.resultTextContainer}>
                    {item.kind === 'station' ? (
                      <>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {item.station.nom || 'Punto de carga'}
                        </Text>
                        <Text style={styles.resultAddress} numberOfLines={1}>
                          {item.station.adreca}, {item.station.municipi}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {item.label}
                        </Text>
                        {item.subtitle ? (
                          <Text style={styles.resultAddress} numberOfLines={2}>
                            {item.subtitle}
                          </Text>
                        ) : null}
                      </>
                    )}
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

const createStyles = (isDark: boolean) => StyleSheet.create({
  wrapper: {
    zIndex: 100,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#1e293b' : 'white',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: StatusBar.currentHeight || 24,
    elevation: 4,
    zIndex: 10,
  },
  logoContainer: { justifyContent: 'center', alignItems: 'center', width: 56 },
  logo: { width: 56, height: 36, transform: [{ scale: 1.15 }] },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#334155' : '#F0F0F0',
    borderRadius: 25,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: isDark ? '#f1f5f9' : 'black' },
  modeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#334155' : '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  modeToggleActive: {
    backgroundColor: '#10b981',
  },
  menuButton: { padding: 2 },

  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 10,
    right: 10,
    backgroundColor: isDark ? '#1e293b' : 'white',
    borderRadius: 12,
    maxHeight: 250,
    elevation: 6,
    shadowColor: '#000',
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
    borderBottomColor: isDark ? '#334155' : '#f1f5f9',
  },
  resultTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#f1f5f9' : '#1e293b',
  },
  resultAddress: {
    fontSize: 13,
    color: isDark ? '#94a3b8' : '#64748b',
    marginTop: 2,
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: isDark ? '#94a3b8' : '#64748b',
    fontSize: 14,
  },
});
