import { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { APP_LOCALES, setAppLocale, type AppLocale } from '@/i18n/i18n';
import { LocaleFlagIcon } from '@/components/LocaleFlagIcon';

const BTN_SIZE = 36;

const OPTIONS: AppLocale[] = ['es', 'ca', 'en', 'it'];

type Props = {
  isDark: boolean;
  accent: string;
};

export function LanguageMenuSelector({ isDark, accent }: Props) {
  const { t, i18n } = useTranslation();
  const raw = (i18n.language || 'es').split('-')[0];
  const active = useMemo(
    () => (APP_LOCALES.includes(raw as AppLocale) ? (raw as AppLocale) : 'es'),
    [raw]
  );

  return (
    <View style={[styles.section, { borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
      <View style={styles.row}>
        {OPTIONS.map((lng) => {
          const selected = active === lng;
          return (
            <Pressable
              key={lng}
              accessibilityRole="button"
              accessibilityLabel={t(`language.names.${lng}`)}
              onPress={() => void setAppLocale(lng)}
              style={({ pressed }) => [
                styles.flagBtn,
                {
                  borderColor: selected ? accent : isDark ? '#475569' : '#cbd5e1',
                  backgroundColor: selected ? (isDark ? '#1e3a5f' : '#ecfdf5') : isDark ? '#1e293b' : '#fff',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <LocaleFlagIcon locale={lng} size={24} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    columnGap: 6,
    rowGap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
  },
  flagBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
});
