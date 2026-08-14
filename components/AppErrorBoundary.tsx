import { reloadAppAsync } from 'expo';
import React, { ErrorInfo, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type State = {
  failed: boolean;
};

export default class AppErrorBoundary extends React.Component<
  PropsWithChildren,
  State
> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ascend encountered an unrecoverable UI error.', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.glyph}>◇</Text>
        <Text style={styles.title}>Ascend needs to restart</Text>
        <Text style={styles.description}>
          Your saved progress remains on this device. Restart the app to return
          to your Ascendant.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => void reloadAppAsync('Recover from UI error')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>RESTART ASCEND</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0B0D14',
  },
  glyph: {
    color: '#8B7CFF',
    fontSize: 48,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 18,
  },
  description: {
    maxWidth: 340,
    color: '#979EAF',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: '#635BFF',
    marginTop: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
