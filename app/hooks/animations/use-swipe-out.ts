// hooks/animations/use-swipe-out.ts
import { useRef } from "react";
import { Animated, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export function useSwipeOut({ duration = 220 }: { duration?: number } = {}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const reset = () => {
    translateX.setValue(0);
    translateY.setValue(0);
    opacity.setValue(1);
    rotate.setValue(0);
  };

  // Toss card off to the left. Stays hidden after — no reset — so content
  // can be swapped invisibly before calling triggerEntrance.
  const triggerExit = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SCREEN_WIDTH * 1.2,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration * 0.75,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  // Slide new card in from the right. Call after content has been updated.
  // Card is already opacity 0 from the exit — no flash.
  const triggerEntrance = () => {
    translateX.setValue(SCREEN_WIDTH * 1.2);
    translateY.setValue(0);
    rotate.setValue(0);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.75,
        delay: duration * 0.1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Subtle fade + upward drift for focus-based stagger.
  const triggerFocusEntrance = (delay = 0) => {
    translateX.setValue(0);
    rotate.setValue(0);
    translateY.setValue(8);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotateInterpolated = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-12deg"],
  });

  const animatedStyle = {
    transform: [{ translateX }, { translateY }, { rotate: rotateInterpolated }],
    opacity,
  };

  return { animatedStyle, triggerExit, triggerEntrance, triggerFocusEntrance, reset };
}
