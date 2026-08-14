import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAudioModeAsync,
  useAudioPlayer,
} from 'expo-audio';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  MUSIC_TRACKS,
  MusicTrackId,
} from '../game/musicData';

const MUSIC_SETTINGS_KEY = '@ascend/music-settings-v1';
const FADE_DURATION = 850;
const FADE_STEPS = 17;

type MusicContextValue = {
  enabled: boolean;
  volume: number;
  currentTrackId: MusicTrackId;
  currentTrackTitle: string;
  errorMessage: string | null;
  playTrack: (trackId: MusicTrackId) => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: PropsWithChildren) {
  const playerA = useAudioPlayer(null, { updateInterval: 1000 });
  const playerB = useAudioPlayer(null, { updateInterval: 1000 });
  const players = useRef([playerA, playerB]);
  const activePlayer = useRef(0);
  const activeTrack = useRef<MusicTrackId | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeRef = useRef(0.5);
  const [hydrated, setHydrated] = useState(false);
  const [enabled, updateEnabled] = useState(true);
  const [volume, updateVolume] = useState(0.5);
  const [requestedTrack, setRequestedTrack] = useState<MusicTrackId>('welcome');
  const [currentTrackId, setCurrentTrackId] = useState<MusicTrackId>('welcome');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    players.current = [playerA, playerB];
  }, [playerA, playerB]);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(MUSIC_SETTINGS_KEY)
      .then((saved) => {
        if (!mounted || !saved) return;
        const parsed = JSON.parse(saved) as { enabled?: unknown; volume?: unknown };
        if (typeof parsed.enabled === 'boolean') updateEnabled(parsed.enabled);
        if (typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)) {
          updateVolume(Math.max(0, Math.min(1, parsed.volume)));
        }
      })
      .catch(() => setErrorMessage('Music settings could not be loaded.'))
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => setErrorMessage('The audio session could not be configured.'));
  }, []);

  useEffect(() => {
    volumeRef.current = volume;
    if (enabled && activeTrack.current) {
      players.current[activePlayer.current].volume = volume;
    }
  }, [enabled, volume]);

  const stopFade = useCallback(() => {
    if (fadeTimer.current) clearInterval(fadeTimer.current);
    fadeTimer.current = null;
  }, []);

  const transitionTo = useCallback((trackId: MusicTrackId) => {
    stopFade();
    const pair = players.current;
    if (activeTrack.current === trackId) {
      const player = pair[activePlayer.current];
      player.loop = true;
      player.volume = volumeRef.current;
      player.play();
      setCurrentTrackId(trackId);
      return;
    }

    const previousIndex = activePlayer.current;
    const nextIndex = previousIndex === 0 ? 1 : 0;
    const previous = pair[previousIndex];
    const next = pair[nextIndex];
    next.pause();
    next.replace(MUSIC_TRACKS[trackId].source);
    next.loop = true;
    next.volume = 0;
    next.play();
    activePlayer.current = nextIndex;
    activeTrack.current = trackId;
    setCurrentTrackId(trackId);
    setErrorMessage(null);

    let step = 0;
    fadeTimer.current = setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / FADE_STEPS);
      next.volume = volumeRef.current * progress;
      previous.volume = volumeRef.current * (1 - progress);
      if (progress >= 1) {
        stopFade();
        previous.pause();
        void previous.seekTo(0).catch(() => undefined);
      }
    }, FADE_DURATION / FADE_STEPS);
  }, [stopFade]);

  useEffect(() => {
    if (!hydrated) return;
    if (!enabled) {
      stopFade();
      for (const player of players.current) player.pause();
      return;
    }
    try {
      transitionTo(requestedTrack);
    } catch {
      setErrorMessage('This soundtrack cue could not be played.');
    }
  }, [enabled, hydrated, requestedTrack, stopFade, transitionTo]);

  useEffect(() => () => stopFade(), [stopFade]);

  const persist = useCallback((nextEnabled: boolean, nextVolume: number) => {
    void AsyncStorage.setItem(
      MUSIC_SETTINGS_KEY,
      JSON.stringify({ enabled: nextEnabled, volume: nextVolume }),
    ).catch(() => setErrorMessage('Music settings could not be saved.'));
  }, []);

  const setEnabled = useCallback((nextEnabled: boolean) => {
    updateEnabled(nextEnabled);
    persist(nextEnabled, volumeRef.current);
  }, [persist]);

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = Math.max(0, Math.min(1, nextVolume));
    volumeRef.current = safeVolume;
    updateVolume(safeVolume);
    persist(enabled, safeVolume);
  }, [enabled, persist]);

  const value = useMemo<MusicContextValue>(() => ({
    enabled,
    volume,
    currentTrackId,
    currentTrackTitle: MUSIC_TRACKS[currentTrackId].title,
    errorMessage,
    playTrack: setRequestedTrack,
    setEnabled,
    setVolume,
  }), [currentTrackId, enabled, errorMessage, setEnabled, setVolume, volume]);

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used inside MusicProvider');
  return context;
}
