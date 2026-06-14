import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { createPrivilegedLoginStyles } from '@/components/auth/privilegedLoginStyles';
import { useScreenTheme } from '@/hooks/use-screen-theme';
import { usePrivilegedLogin, type PrivilegedLoginConfig } from '@/hooks/usePrivilegedLogin';
import SvgComponent from '@/app/_assets/logo.jsx';

type Props = Readonly<{
  config: PrivilegedLoginConfig;
}>;

function PrivilegedLoginBody({
  vm,
  sem,
  styles,
  t,
}: Readonly<{
  vm: ReturnType<typeof usePrivilegedLogin>;
  sem: ReturnType<typeof useScreenTheme>['sem'];
  styles: ReturnType<typeof createPrivilegedLoginStyles>;
  t: ReturnType<typeof useTranslation>['t'];
}>) {
  if (vm.sessionUser) {
    return (
      <View style={styles.successBox}>
        <Text style={styles.successTitle}>{vm.labels.sessionStarted}</Text>
        <Text style={styles.successText}>{vm.sessionUser.email}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={vm.goToTabs}>
          <Text style={styles.secondaryButtonText}>{vm.labels.goToApp}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (vm.showOpeningGoogle) {
    return (
      <View style={styles.openingGoogle}>
        <ActivityIndicator size="large" color={sem.accent} />
        <Text style={styles.openingGoogleText}>{vm.labels.openingGoogle}</Text>
      </View>
    );
  }

  return (
    <>
      {vm.error ? <Text style={styles.errorText}>{vm.error}</Text> : null}
      <View style={styles.localForm}>
        <TextInput
          style={styles.input}
          placeholder={t('common.email')}
          placeholderTextColor="#9ca3af"
          value={vm.email}
          onChangeText={vm.setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder={t('common.password')}
          placeholderTextColor="#9ca3af"
          value={vm.password}
          onChangeText={vm.setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
        />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={vm.submitLocalLogin}
          disabled={vm.localLoading || vm.loading}
          activeOpacity={0.85}
        >
          {vm.localLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('login.signIn')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.separatorText}>{t('common.or')}</Text>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={vm.handleGoogleLogin}
        disabled={vm.googleDisabled}
        activeOpacity={0.8}
      >
        {vm.loading ? (
          <ActivityIndicator color="#3c4043" />
        ) : (
          <>
            <Image
              source={{
                uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
              }}
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <Text style={styles.googleButtonText}>{t('login.continueGoogle')}</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

export function PrivilegedLoginView({ config }: Props) {
  const { t } = useTranslation();
  const theme = useScreenTheme();
  const styles = useMemo(() => createPrivilegedLoginStyles(theme), [theme.isDark, theme.sem]);
  const vm = usePrivilegedLogin(config);

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.screen}>
      <View style={styles.card}>
        <SvgComponent width={150} height={125} />
        <Text style={styles.title}>{vm.labels.title}</Text>
        <Text style={styles.subtitle}>{vm.labels.subtitle}</Text>

        {vm.showGoogleHint ? <Text style={styles.hintText}>{vm.labels.googleHint}</Text> : null}

        <PrivilegedLoginBody vm={vm} sem={theme.sem} styles={styles} t={t} />

        <TouchableOpacity style={styles.backLink} onPress={vm.goBack}>
          <Text style={styles.backLinkText}>{vm.labels.backToLogin}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
