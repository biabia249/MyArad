import { Animated, Pressable, type PressableProps } from 'react-native';
import { useEffect, useState, type ComponentProps } from 'react';
import { useButtonSound } from './button-sound';
import { useReducedMotion } from './motion-provider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SoundPressable({ onPress, onPressIn, onPressOut, onHoverIn, onHoverOut, disabled, style, ...props }: ComponentProps<typeof Pressable>) {
  const play = useButtonSound();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const animation = Animated.timing(scale, {
      toValue: pressed && !disabled && !reducedMotion ? 0.97 : 1,
      duration: reducedMotion ? 0 : pressed ? 100 : 160,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [pressed, disabled, reducedMotion, scale]);
  const handlePress: PressableProps['onPress'] = event => {
    if (disabled) return;
    play();
    onPress?.(event);
  };
  return <AnimatedPressable {...props} disabled={disabled} onPress={handlePress}
    onPressIn={event => { setPressed(true); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); onPressOut?.(event); }}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    style={[typeof style === 'function' ? style({ pressed: pressed && !disabled, hovered }) : style,
      pressed && !disabled && { opacity: .82 }, { transform: [{ scale }] }]} />;
}
