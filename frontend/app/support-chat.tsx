import React, { useState } from 'react';
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
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fetchGroqResponse } from '../services/groqService';

const ASSISTANT_AVATAR = require('../assets/images/avatar_asistente_IA.png');

function ChatContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        //height para no estar debajo de los tres botones de los mobiles
        behavior="height"
        style={{ flex: 1 }}
        //Este valor es la altura aproximada de la cabecera + barra de estado
        keyboardVerticalOffset={Platform.select({ android: 90 })}
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>{t('support.header')}</Text>
          <Image source={ASSISTANT_AVATAR} style={styles.headerImage} />
        </View>

        {/* Marco de conversación */}
        <View style={styles.chatFrame}>
          <FlatList
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.listContent}
            // Esto hace que al abrir el teclado, si hay muchos mensajes, se desplace al final
            onContentSizeChange={() => {}}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={item.role === 'user' ? styles.userText : styles.aiText}>{item.content}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="chat-bubble-outline" size={50} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t('support.empty')}</Text>
              </View>
            }
          />
        </View>

        {/* Contenedor de entrada */}
        {/* Usamos el inset bottom para respetar los botones del Poco, pero con un padding extra */}
        <View style={[styles.inputWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t('support.placeholder')}
              placeholderTextColor="#94a3b8"
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendButton, !input.trim() && styles.disabledBtn]}
              disabled={loading || !input.trim()}
            >
              <MaterialIcons name={loading ? "autorenew" : "send"} size={22} color="white" />
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

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60, // Altura fija para controlar mejor el offset del teclado
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backAction: { flexDirection: 'row', alignItems: 'center' },
  headerImage: { width: 55, height: 55, borderRadius: 100, marginHorizontal: 10, backgroundColor: '#f1f5f9' },
  headerTitle: { fontSize: 16, color: '#10b981', fontWeight: '600' },
  headerSubtitle: { fontSize: 14, color: '#64748b', fontWeight: 'bold' },

  chatFrame: {
    flex: 1,
    marginHorizontal: 10,
    marginTop: 5,
    marginBottom: 5,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  listContent: { padding: 15 },
  bubble: { padding: 12, borderRadius: 15, marginBottom: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#10b981', borderBottomRightRadius: 2 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  userText: { color: 'white' },
  aiText: { color: '#1e293b' },

  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 25,
    paddingLeft: 15,
    paddingRight: 5,
    paddingVertical: 5
  },
  input: { flex: 1, maxHeight: 100, paddingVertical: 8, color: '#1e293b', textAlignVertical: 'center' },
  sendButton: { backgroundColor: '#10b981', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  disabledBtn: { backgroundColor: '#cbd5e1' },
  emptyContainer: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
  emptyText: { textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }
});