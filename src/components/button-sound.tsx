import { createAudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';

const ButtonSoundContext = createContext<() => void>(() => {});

export function ButtonSoundProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  useEffect(() => {
    // Effects run on the device/browser, never during web server rendering.
    const player = createAudioPlayer(require('../../assets/sounds/button-tap.wav'));
    playerRef.current = player;
    return () => {
      playerRef.current = null;
      player.remove();
    };
  }, []);
  const play = useCallback(() => {
    // Feedback must never delay or prevent the button's action.
    try {
      const player = playerRef.current;
      if (!player?.isLoaded) return;
      void player.seekTo(0).then(() => {
        if (playerRef.current === player) player.play();
      }).catch(() => {});
    } catch { /* Audio may be unavailable or muted on the device. */ }
  }, []);
  return <ButtonSoundContext value={play}>{children}</ButtonSoundContext>;
}

export const useButtonSound = () => useContext(ButtonSoundContext);
