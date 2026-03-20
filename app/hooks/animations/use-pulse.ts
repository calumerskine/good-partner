// hooks/animations/use-pulse.ts
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export type PulseConfig = {
  minScale?: number;
  maxScale?: number;
  duration?: number;
  autoStart?: boolean;
};

export function usePulse({
  minScale = 1.0,
  maxScale = 1.08,
  duration = 800,
  autoStart = true,
}: PulseConfig = {}) {
  const scale = useRef(new Animated.Value(minScale)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const start = () => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration,
          useNativeDriver: true,
        }),
      ]),
    );
    loopRef.current = loop;
    loop.start();
  };

  const stop = () => {
    loopRef.current?.stop();
    loopRef.current = null;
    scale.setValue(minScale);
  };

  useEffect(() => {
    if (autoStart) start();
    return () => {
      loopRef.current?.stop();
    };
  }, []);

  const animatedStyle = { transform: [{ scale }] };

  return { animatedStyle, start, stop };
}
