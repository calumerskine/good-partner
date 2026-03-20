// hooks/animations/use-mount-animation.ts
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export type MountAnimationConfig = {
  fromOpacity?: number;
  fromScale?: number;
  fromTranslateY?: number;
  duration?: number;
  delay?: number;
};

export function useMountAnimation({
  fromOpacity = 0,
  fromScale = 0.95,
  fromTranslateY = 0,
  duration = 300,
  delay = 0,
}: MountAnimationConfig = {}) {
  const opacity = useRef(new Animated.Value(fromOpacity)).current;
  const scale = useRef(new Animated.Value(fromScale)).current;
  const translateY = useRef(new Animated.Value(fromTranslateY)).current;

  useEffect(() => {
    const animations = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      ...(fromTranslateY !== 0
        ? [
            Animated.timing(translateY, {
              toValue: 0,
              duration,
              delay,
              useNativeDriver: true,
            }),
          ]
        : []),
    ]);
    animations.start();
  }, []);

  const animatedStyle = {
    opacity,
    transform: [{ scale }, { translateY }],
  };

  return { animatedStyle };
}
