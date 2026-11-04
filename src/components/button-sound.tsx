import { useAudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, type ReactNode } from 'react';

const ButtonSoundContext = createContext<() => void>(() => {});

export function ButtonSoundProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(require('../../assets/sounds/button-tap.wav'));
  const play = useCallback(() => {
    // Feedback must never delay or prevent the button's action.
    try {
      if (!player.isLoaded) return;
      void player.seekTo(0).then(() => player.play()).catch(() => {});
    } catch { /* Audio may be unavailable or muted on the device. */ }
  }, [player]);
  return <ButtonSoundContext value={play}>{children}</ButtonSoundContext>;
}

export const useButtonSound = () => useContext(ButtonSoundContext);
