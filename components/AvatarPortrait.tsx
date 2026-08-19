import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AvatarCustomization,
  HAIR_COLOR_VALUES,
  SKIN_TONE_VALUES,
} from '../game/appearanceData';

type Props = {
  customization: AvatarCustomization;
  size?: number;
};

export default function AvatarPortrait({ customization, size = 116 }: Props) {
  const skin = SKIN_TONE_VALUES[customization.skinTone];
  const hair = HAIR_COLOR_VALUES[customization.hairColor];
  const eyeHeight = customization.eyeStyle === 'round' ? 8 : customization.eyeStyle === 'soft' ? 4 : 5;
  const eyeWidth = customization.eyeStyle === 'round' ? 8 : 11;
  const noseWidth = customization.noseStyle === 'wide' ? 9 : customization.noseStyle === 'small' ? 4 : 6;

  return (
    <View style={[styles.shell, { width: size, height: size, borderRadius: size / 2 }]}>
      {customization.hairStyle === 'tied' && (
        <View style={[styles.ponytail, { backgroundColor: hair }]} />
      )}
      <View style={[styles.neck, { backgroundColor: skin }]} />
      <View style={[styles.face, { backgroundColor: skin }]}>
        <View style={[styles.hairBack, { backgroundColor: hair }]} />
        <View style={styles.eyes}>
          <View style={[styles.eye, { width: eyeWidth, height: eyeHeight }]} />
          <View style={[styles.eye, { width: eyeWidth, height: eyeHeight }]} />
        </View>
        <View style={[styles.nose, { width: noseWidth }]} />
        <View style={styles.mouth} />
        <HairFront style={customization.hairStyle} color={hair} />
      </View>
    </View>
  );
}

function HairFront({ style, color }: { style: AvatarCustomization['hairStyle']; color: string }) {
  if (style === 'curls') {
    return <View style={styles.curlRow}>{[0, 1, 2, 3].map((item) => <View key={item} style={[styles.curl, { backgroundColor: color }]} />)}</View>;
  }
  return (
    <>
      <View style={[styles.hairCap, { backgroundColor: color }]} />
      <View
        style={[
          styles.fringe,
          { backgroundColor: color },
          style === 'swept' && styles.sweptFringe,
          style === 'tied' && styles.tiedFringe,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#202538', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  neck: { position: 'absolute', width: 28, height: 32, bottom: 4, borderRadius: 10 },
  face: { width: '62%', height: '72%', borderRadius: 34, overflow: 'hidden', alignItems: 'center' },
  hairBack: { position: 'absolute', top: -4, left: -4, right: -4, height: 31, borderRadius: 22 },
  hairCap: { position: 'absolute', top: -3, left: -3, right: -3, height: 24, borderBottomRightRadius: 25 },
  fringe: { position: 'absolute', top: 9, left: 10, width: 17, height: 26, borderBottomRightRadius: 20, transform: [{ rotate: '18deg' }] },
  sweptFringe: { left: 27, width: 27, transform: [{ rotate: '-20deg' }] },
  tiedFringe: { left: 7, height: 20 },
  ponytail: { position: 'absolute', width: 24, height: 46, right: 13, top: 26, borderRadius: 15, transform: [{ rotate: '-18deg' }] },
  curlRow: { position: 'absolute', top: 0, left: 1, right: 1, flexDirection: 'row', justifyContent: 'space-around' },
  curl: { width: 24, height: 29, borderRadius: 14 },
  eyes: { position: 'absolute', top: '46%', left: 13, right: 13, flexDirection: 'row', justifyContent: 'space-between' },
  eye: { backgroundColor: '#151928', borderRadius: 6 },
  nose: { position: 'absolute', top: '59%', height: 7, borderBottomWidth: 1.5, borderColor: 'rgba(70,38,33,0.55)', borderRadius: 4 },
  mouth: { position: 'absolute', top: '75%', width: 16, height: 5, borderBottomWidth: 2, borderColor: 'rgba(95,42,52,0.75)', borderRadius: 7 },
});
