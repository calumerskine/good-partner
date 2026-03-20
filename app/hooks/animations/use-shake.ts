// hooks/animations/use-shake.ts
import { useRef } from "react";
import { Animated } from "react-native";

export type ShakeConfig = {
  intensity?: number;
  duration?: number;
};

export function useShake({ intensity = 10, duration = 60 }: ShakeConfig = {}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const trigger = () => {
    translateX.setValue(0);
    Animated.sequence([
      Animated.timing(translateX, {
        toValue: intensity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -intensity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: intensity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animatedStyle = { transform: [{ translateX }] };

  return { animatedStyle, trigger };
}
