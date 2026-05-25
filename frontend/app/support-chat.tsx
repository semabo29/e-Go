import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fetchGroqResponse } from '../services/groqService';
import type { ScreenTheme } from '@/constants/screenTheme';
import { useScreenTheme } from '@/hooks/use-screen-theme';

const ASSISTANT_AVATAR = require('../assets/images/avatar_asistente_IA.png');

function ChatContent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useScreenTheme();
  const styles = useMemo(() => createChatStyles(theme), [theme.isDark, theme.sem]);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const aiResponse = await fetchGroqResponse(newMessages);
    setMessages([...newMessages, { role: 'assistant', content: aiResponse }]);
    setLoading(false);
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      <KeyboardAvoidingView
        behavior="height"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.select({ android: 90 })}
      >
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>{t('support.header')}</Text>
          <Image source={ASSISTANT_AVATAR} style={styles.headerImage} />
        </View>

        <View style={styles.chatFrame}>
          <FlatList
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => {}}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={item.role === 'user' ? styles.userText : styles.aiText}>{item.content}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="chat-bubble-outline" size={50} color={theme.inputBorder} />
                <Text style={styles.emptyText}>{t('support.empty')}</Text>
              </View>
            }
          />
        </View>

        <View style={[styles.inputWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t('support.placeholder')}
              placeholderTextColor={theme.placeholder}
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendButton, !input.trim() && styles.disabledBtn]}
              disabled={loading || !input.trim()}
            >
              <MaterialIcons name={loading ? 'autorenew' : 'send'} size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function SupportChatScreen() {
  return (
    <SafeAreaProvider>
      <ChatContent />
    </SafeAreaProvider>
  );
}

const createChatStyles = (theme: ScreenTheme) =>
  StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: theme.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 60,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerImage: {
      width: 55,
      height: 55,
      borderRadius: 100,
      marginHorizontal: 10,
      backgroundColor: theme.chipBg,
    },
    headerSubtitle: { fontSize: 14, color: theme.mutedText, fontWeight: 'bold' },
    chatFrame: {
      flex: 1,
      marginHorizontal: 10,
      marginTop: 5,
      marginBottom: 5,
      backgroundColor: theme.containerBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    listContent: { padding: 15 },
    bubble: { padding: 12, borderRadius: 15, marginBottom: 10, maxWidth: '85%' },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: theme.sem.accent,
      borderBottomRightRadius: 2,
    },
    aiBubble: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surface,
      borderBottomLeftRadius: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    userText: { color: theme.textOnAccent },
    aiText: { color: theme.title },
    inputWrapper: {
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.chipBg,
      borderRadius: 25,
      paddingLeft: 15,
      paddingRight: 5,
      paddingVertical: 5,
    },
    input: { flex: 1, maxHeight: 100, paddingVertical: 8, color: theme.inputText, textAlignVertical: 'center' },
    sendButton: {
      backgroundColor: theme.sem.accent,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    disabledBtn: { backgroundColor: theme.inputBorder },
    emptyContainer: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
    emptyText: { textAlign: 'center', marginTop: 10, paddingHorizontal: 40, color: theme.mutedText },
  });
