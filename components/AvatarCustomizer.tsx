import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AVATAR_OPTION_LABELS,
  AvatarCustomization,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  NOSE_STYLES,
  SKIN_TONES,
} from '../game/appearanceData';

type Props = {
  onChange: (customization: AvatarCustomization) => void;
  value: AvatarCustomization;
};

export default function AvatarCustomizer({ onChange, value }: Props) {
  return (
    <View style={styles.container}>
      <OptionRow label="EYES" field="eyeStyle" values={EYE_STYLES} value={value} onChange={onChange} />
      <OptionRow label="NOSE" field="noseStyle" values={NOSE_STYLES} value={value} onChange={onChange} />
      <OptionRow label="HAIR" field="hairStyle" values={HAIR_STYLES} value={value} onChange={onChange} />
      <OptionRow label="HAIR COLOR" field="hairColor" values={HAIR_COLORS} value={value} onChange={onChange} />
      <OptionRow label="SKIN COLOR" field="skinTone" values={SKIN_TONES} value={value} onChange={onChange} />
    </View>
  );
}

function OptionRow<K extends keyof AvatarCustomization>({
  field,
  label,
  onChange,
  value,
  values,
}: {
  field: K;
  label: string;
  onChange: (customization: AvatarCustomization) => void;
  value: AvatarCustomization;
  values: readonly AvatarCustomization[K][];
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {values.map((option) => {
          const selected = value[field] === option;
          const text = AVATAR_OPTION_LABELS[field][option as never];
          return (
            <Pressable
              key={String(option)}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange({ ...value, [field]: option })}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 15 },
  row: { gap: 8 },
  label: { color: '#7F8799', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { minHeight: 34, borderRadius: 10, borderWidth: 1, borderColor: '#303546', backgroundColor: '#11141F', justifyContent: 'center', paddingHorizontal: 11 },
  optionSelected: { borderColor: '#8B7CFF', backgroundColor: '#2A2652' },
  optionText: { color: '#858DA0', fontSize: 9, fontWeight: '800' },
  optionTextSelected: { color: '#FFFFFF' },
});
