import React, { useCallback } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from './navigation/types';
import { useMusic } from './state/MusicContext';

const welcomeHero = require('./assets/sprites/hero-violet.png');

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { playTrack } = useMusic();
  useFocusEffect(useCallback(() => playTrack('welcome'), [playTrack]));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>ASCEND</Text>

        <Text style={styles.tagline}>
          LEVEL UP YOUR REAL LIFE
        </Text>

        <View style={styles.avatar}>
          <View style={styles.avatarGlow} />
          <Image
            source={welcomeHero}
            style={styles.avatarImage}
            resizeMode="contain"
            accessibilityLabel="Warrior Ascendant"
          />
        </View>

        <Text style={styles.title}>
          Your journey begins now.
        </Text>

        <Text style={styles.subtitle}>
          Train your body. Sharpen your mind. Build your character.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('CharacterCreator')}
          accessibilityRole="button"
          accessibilityLabel="Start your journey"
        >
          <Text style={styles.buttonText}>
            START YOUR JOURNEY
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 8,
  },

  tagline: {
    color: '#8B7CFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 8,
  },

  avatar: {
    width: 250,
    height: 270,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#635BFF',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 55,
    marginBottom: 30,
    backgroundColor: '#151827',
  },

  avatarGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#635BFF',
    opacity: 0.18,
    top: 45,
  },

  avatarImage: {
    width: '100%',
    height: 265,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },

  button: {
    backgroundColor: '#635BFF',
    paddingVertical: 17,
    paddingHorizontal: 42,
    borderRadius: 14,
    marginTop: 35,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
