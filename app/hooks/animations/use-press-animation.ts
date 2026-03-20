import { useRef } from "react";
import { Animated, GestureResponderEvent } from "react-native";

export type PressAnimationConfig = {
  pressDepth?: number;
  bounciness?: number;
  disabled?: boolean;
  skipAnimation?: boolean;
};

export function usePressAnimation({
  pressDepth = 5,
  bounciness = 12,
  disabled = false,
  skipAnimation = false,
}: PressAnimationConfig = {}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const shouldAnimate = !disabled && !skipAnimation;

  const handlePressIn = (_event: GestureResponderEvent) => {
    if (shouldAnimate) {
      Animated.spring(translateY, {
        toValue: pressDepth,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    }
  };

  const handlePressOut = (_event: GestureResponderEvent) => {
    if (shouldAnimate) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness,
      }).start();
    }
  };

  return { translateY, handlePressIn, handlePressOut };
}
