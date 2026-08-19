import React, { useCallback, useState } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CHARACTER_CLASS_NAMES,
  CHARACTER_CLASSES,
  CharacterClassName,
  getBaseStats,
} from '../game/gameData';
import { CLASS_SPRITES, DEFAULT_AVATAR_CUSTOMIZATION } from '../game/appearanceData';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../state/GameContext';
import { SKILLS_MUSIC } from '../game/musicData';
import { useMusic } from '../state/MusicContext';
import GameIcon from '../components/GameIcon';
import AvatarPortrait from '../components/AvatarPortrait';
import AvatarCustomizer from '../components/AvatarCustomizer';

type Props = NativeStackScreenProps<RootStackParamList, 'CharacterCreator'>;

export default function CharacterCreator({ navigation }: Props) {
  const { characterClass, completeOnboarding } = useGame();
  const [selectedClass, setSelectedClass] =
    useState<CharacterClassName>(characterClass);
  const [customization, setCustomization] = useState({ ...DEFAULT_AVATAR_CUSTOMIZATION });
  const { playTrack } = useMusic();
  const selectedCharacter = CHARACTER_CLASSES[selectedClass];
  const starterStats = getBaseStats(selectedClass);

  useFocusEffect(
    useCallback(() => playTrack(SKILLS_MUSIC[selectedClass]), [playTrack, selectedClass]),
  );

  function beginJourney() {
    completeOnboarding(selectedClass, customization);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>CREATE YOUR CHARACTER</Text>

        <Text style={styles.subtitle}>
          Choose the path you want to begin your journey on.
        </Text>

        <View
          style={[
            styles.character,
            { borderColor: selectedCharacter.color },
          ]}
        >
          <View
            style={[
              styles.characterGlow,
              { backgroundColor: selectedCharacter.color },
            ]}
          />
          <Image
            source={CLASS_SPRITES[selectedClass]}
            style={styles.characterImage}
            resizeMode="contain"
            accessibilityLabel={`${selectedClass} character preview`}
          />
          <View style={styles.portraitPreview}>
            <AvatarPortrait customization={customization} size={92} />
          </View>
        </View>

        <Text style={styles.characterName}>YOUR ASCENDANT</Text>

        <View style={styles.previewStats}>
          <PreviewStat label="STR" value={starterStats.strength} />
          <PreviewStat label="END" value={starterStats.endurance} />
          <PreviewStat label="INT" value={starterStats.intelligence} />
          <PreviewStat label="MND" value={starterStats.mindfulness} />
          <PreviewStat label="VIT" value={starterStats.vitality} />
        </View>

        <Text style={styles.sectionTitle}>CHOOSE YOUR CLASS</Text>

        {CHARACTER_CLASS_NAMES.map((name) => {
          const character = CHARACTER_CLASSES[name];
          const selected = selectedClass === name;

          return (
            <Pressable
              key={name}
              onPress={() => setSelectedClass(name)}
              style={[
                styles.classCard,
                selected && {
                  borderColor: character.color,
                  backgroundColor: '#181B2A',
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${name}: ${character.description}`}
            >
              <GameIcon token={character.icon} size={42} />

              <View style={styles.classInfo}>
                <Text style={styles.className}>{name}</Text>
                <Text style={styles.classDescription}>
                  {character.description}
                </Text>
              </View>

              <View
                style={[
                  styles.radio,
                  selected && {
                    backgroundColor: character.color,
                  },
                ]}
              />
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>CUSTOMIZE YOUR FACE</Text>
        <View style={styles.customizerCard}>
          <AvatarCustomizer value={customization} onChange={setCustomization} />
        </View>

        <Pressable
          style={styles.continueButton}
          onPress={beginJourney}
          accessibilityRole="button"
          accessibilityLabel={`Begin as a ${selectedClass}`}
        >
          <Text style={styles.continueText}>
            BEGIN AS A {selectedClass.toUpperCase()}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.previewStat}>
      <Text style={styles.previewStatValue}>{value}</Text>
      <Text style={styles.previewStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  header: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 15,
  },

  subtitle: {
    color: '#8F96A8',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },

  character: {
    width: '100%',
    height: 310,
    borderRadius: 24,
    backgroundColor: '#151827',
    borderWidth: 2,
    borderColor: '#635BFF',
    alignSelf: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginVertical: 30,
  },

  characterGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    top: 50,
    opacity: 0.16,
  },

  characterImage: {
    width: '92%',
    height: 305,
  },
  portraitPreview: { position: 'absolute', right: 14, bottom: 14, borderRadius: 50, borderWidth: 2, borderColor: '#FFFFFF55', overflow: 'hidden' },
  customizerCard: { backgroundColor: '#151827', borderWidth: 1, borderColor: '#2A2E40', borderRadius: 16, padding: 14, marginBottom: 10 },

  characterName: {
    color: '#8B7CFF',
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 14,
  },

  previewStats: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 35,
  },

  previewStat: {
    flex: 1,
    backgroundColor: '#151827',
    borderWidth: 1,
    borderColor: '#2A2E40',
    borderRadius: 11,
    alignItems: 'center',
    paddingVertical: 9,
  },

  previewStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  previewStatLabel: {
    color: '#777F91',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 2,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
  },

  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#272B3A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  classIcon: {
    fontSize: 32,
    width: 50,
  },

  classInfo: {
    flex: 1,
  },

  className: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  classDescription: {
    color: '#8F96A8',
    fontSize: 12,
    marginTop: 4,
  },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#292D3D',
  },

  continueButton: {
    backgroundColor: '#635BFF',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 18,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
