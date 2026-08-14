import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import WelcomeScreen from './WelcomeScreen';
import CharacterCreator from './screens/CharacterCreator';
import MainTabs from './navigation/MainTabs';
import { RootStackParamList } from './navigation/types';
import { GameProvider, useGame } from './state/GameContext';
import { colors } from './theme';
import AppErrorBoundary from './components/AppErrorBoundary';
import { AuthProvider } from './state/AuthContext';
import { SocialProvider } from './state/SocialContext';
import { MusicProvider } from './state/MusicContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primaryLight,
    border: colors.border,
  },
};

function AppNavigator() {
  const { hydrated, onboardingComplete } = useGame();

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primaryLight} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        key={onboardingComplete ? 'main-flow' : 'onboarding-flow'}
        initialRouteName={onboardingComplete ? 'Main' : 'Welcome'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CharacterCreator" component={CharacterCreator} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AuthProvider>
          <MusicProvider>
            <GameProvider>
              <SocialProvider>
                <StatusBar style="light" />
                <AppNavigator />
              </SocialProvider>
            </GameProvider>
          </MusicProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
