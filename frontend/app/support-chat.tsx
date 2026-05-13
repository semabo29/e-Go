import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fetchGroqResponse } from '../services/groqService';

export default function SupportChatScreen() {
  const router = useRouter();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#10b981" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}> Salir del Asistente e-Go</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={item.role === 'user' ? styles.userText : styles.aiText}>{item.content}</Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="¿En qué puedo ayudarte?"
          multiline
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton} disabled={loading}>
          {loading ? <MaterialIcons name="hourglass-empty" size={24} color="white" /> : <MaterialIcons name="send" size={24} color="white" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6bf276' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 30, backgroundColor: 'white' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: '#1e293b' },
  bubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#10b981' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0' },
  userText: { color: 'white' },
  aiText: { color: '#1e293b' },
  inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: 'white', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10 },
  sendButton: { backgroundColor: '#10b981', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});