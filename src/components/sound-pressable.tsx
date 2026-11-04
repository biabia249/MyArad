import { Pressable, type PressableProps } from 'react-native';
import { type ComponentProps } from 'react';
import { useButtonSound } from './button-sound';

export function SoundPressable({ onPress, disabled, ...props }: ComponentProps<typeof Pressable>) {
  const play = useButtonSound();
  const handlePress: PressableProps['onPress'] = event => {
    if (disabled) return;
    play();
    onPress?.(event);
  };
  return <Pressable {...props} disabled={disabled} onPress={handlePress} />;
}
