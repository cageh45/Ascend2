import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

import { getGameIcon } from '../game/iconData';

export default function GameIcon({
  token,
  size = 28,
  style,
}: {
  token: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={getGameIcon(token)}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
