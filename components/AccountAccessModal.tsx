import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../state/AuthContext';

type Props = {
  mode: 'link' | 'signIn';
  onClose: () => void;
  visible: boolean;
};

export default function AccountAccessModal({ mode, onClose, visible }: Props) {
  const { errorMessage, sendEmailCode, status, verifyEmailCode } = useAuth();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [activeMode, setActiveMode] = useState(mode);

  useEffect(() => {
    if (!visible) {
      setToken('');
      setSent(false);
    } else {
      setActiveMode(mode);
    }
  }, [mode, visible]);

  const linking = activeMode === 'link';
  const busy = status === 'connecting';

  async function send() {
    const success = await sendEmailCode(email, activeMode);
    if (success) setSent(true);
  }

  async function verify() {
    const success = await verifyEmailCode(email, token, activeMode);
    if (success) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{linking ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</Text>
          <Text style={styles.title}>{linking ? 'Save this account' : 'Sign in to saved account'}</Text>
          <Text style={styles.description}>
            {sent
              ? `Enter the verification code sent to ${email.trim().toLowerCase()}.`
              : linking
                ? 'Add an email to protect this character and restore it on another device.'
                : 'We’ll email a one-time code. Signing in restores the character saved to that account.'}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!sent && !busy}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor="#626A7C"
            style={styles.input}
          />
          {sent && (
            <TextInput
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={8}
              placeholder="8-digit code"
              placeholderTextColor="#626A7C"
              style={styles.input}
            />
          )}
          {!sent && mode === 'link' && (
            <Pressable onPress={() => setActiveMode(linking ? 'signIn' : 'link')}>
              <Text style={styles.secondary}>
                {linking ? 'SIGN IN TO AN EXISTING ACCOUNT' : 'GO BACK TO SAVING THIS GUEST'}
              </Text>
            </Pressable>
          )}
          {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
          <Pressable
            style={[styles.primary, busy && styles.disabled]}
            onPress={() => void (sent ? verify() : send())}
            disabled={busy || !email.includes('@') || (sent && token.length < 6)}
          >
            <Text style={styles.primaryText}>
              {busy ? 'PLEASE WAIT…' : sent ? 'VERIFY CODE' : 'SEND CODE'}
            </Text>
          </Pressable>
          {sent && (
            <Pressable onPress={() => { setSent(false); setToken(''); }} disabled={busy}>
              <Text style={styles.secondary}>USE A DIFFERENT EMAIL</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} disabled={busy}>
            <Text style={styles.close}>CLOSE</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,4,9,0.82)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 430, backgroundColor: '#151827', borderRadius: 22, borderWidth: 1, borderColor: '#30364A', padding: 22 },
  eyebrow: { color: '#8B7CFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 5 },
  description: { color: '#9AA2B4', fontSize: 13, lineHeight: 20, marginTop: 9, marginBottom: 15 },
  input: { color: '#FFFFFF', backgroundColor: '#0E111B', borderWidth: 1, borderColor: '#30364A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginTop: 9 },
  error: { color: '#FF9EAD', fontSize: 12, lineHeight: 18, marginTop: 10 },
  primary: { backgroundColor: '#635BFF', borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginTop: 15 },
  disabled: { opacity: 0.48 },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  secondary: { color: '#9B94FF', textAlign: 'center', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 16 },
  close: { color: '#858DA0', textAlign: 'center', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 18 },
});
