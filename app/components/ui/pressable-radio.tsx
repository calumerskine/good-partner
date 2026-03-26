// components/ui/pressable-radio.tsx
import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";

const PRESS_DEPTH = 14;
const DEEP_FACTOR = 1.2;
const PRESS_IN_MS = 300;
const PRESS_OUT_MS = 300;

type PressableRadioProps = {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  color?: string;
  showColor?: boolean;
  shade?: number;
  pressDepth?: number;
  deepFactor?: number;
  style?: StyleProp<ViewStyle>;
  fillHeight?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

function clampShade(shade: number): number {
  return Math.max(100, Math.min(800, shade));
}

function getColorClasses(color: string, shade: number) {
  if (color === "white") {
    return { faceClass: "bg-white", shadowClass: "bg-gray-200" };
  }
  const s = clampShade(shade);
  const shadowShade = Math.min(s + 100, 900);
  return {
    faceClass: `bg-${color}-${s}`,
    shadowClass: `bg-${color}-${shadowShade}`,
  };
}

export default function PressableRadio({
  children,
  selected,
  onPress,
  color = "indigo",
  showColor = false,
  shade = 400,
  pressDepth = PRESS_DEPTH,
  deepFactor = DEEP_FACTOR,
  style,
  fillHeight = false,
  disabled = false,
  accessibilityLabel,
}: PressableRadioProps) {
  const { trigger } = useHaptics();
  const translateY = useRef(
    new Animated.Value(selected ? pressDepth : 0),
  ).current;
  const [pressing, setPressing] = useState(false);

  // Always-current ref so gesture callbacks read the live selected value
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Captured at press-in so callbacks always know the starting state
  const selectedAtPressStart = useRef(selected);
  // Set by onPress; tells the deferred snap-back in onPressOut to do nothing
  const wasValidPress = useRef(false);
  // Prevents the external-sync effect from conflicting with an active gesture
  const isGestureActive = useRef(false);

  const animateTo = (toValue: number, duration: number) => {
    Animated.timing(translateY, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Sync resting position when selected changes externally (e.g. controlled reset)
  useEffect(() => {
    if (!isGestureActive.current) {
      animateTo(selected ? pressDepth : 0, PRESS_OUT_MS);
    }
  }, [selected, pressDepth]);

  const handlePressIn = () => {
    if (disabled) return;
    isGestureActive.current = true;
    wasValidPress.current = false;
    selectedAtPressStart.current = selectedRef.current;
    setPressing(true);
    trigger("impactLight");
    animateTo(
      selectedRef.current ? pressDepth * deepFactor : pressDepth,
      PRESS_IN_MS,
    );
  };

  // onPress only fires on a confirmed tap — not when the gesture becomes a scroll.
  // In RN, onPressOut fires before onPress in the same JS tick, so we handle the
  // toggle here and let the deferred snap-back in onPressOut become a no-op.
  const handlePress = () => {
    wasValidPress.current = true;
    const nextSelected = !selectedAtPressStart.current;
    animateTo(nextSelected ? pressDepth : 0, PRESS_OUT_MS);
    onPress();
  };

  const handlePressOut = () => {
    if (disabled) return;
    isGestureActive.current = false;
    setPressing(false);
    // Defer so onPress (which fires in the same JS tick) can set wasValidPress first.
    // If no onPress fires (scroll/cancel), snap back to the starting position.
    setTimeout(() => {
      if (!wasValidPress.current) {
        animateTo(selectedAtPressStart.current ? pressDepth : 0, PRESS_OUT_MS);
      }
    }, 0);
  };

  const shouldShowColor = showColor ? selected || pressing : false;
  const { faceClass, shadowClass } = getColorClasses(color, shade);

  const activeFaceClass = shouldShowColor ? faceClass : "bg-white";
  const activeShadowClass = shouldShowColor ? shadowClass : "bg-gray-200";
  const maxDepth = pressDepth * deepFactor;

  return (
    <Animated.View style={[tw`relative`, { paddingBottom: maxDepth }, style]}>
      {/* Shadow */}
      <Animated.View
        style={[
          tw.style(activeShadowClass, `rounded-2xl absolute inset-0`),
          { top: maxDepth },
        ]}
      />
      {/* Face */}
      <Animated.View
        style={[
          fillHeight
            ? [{ transform: [{ translateY }] }, { flex: 1 }]
            : { transform: [{ translateY }] },
          tw.style(),
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPress={handlePress}
          onPressOut={handlePressOut}
          disabled={disabled}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          style={
            fillHeight
              ? [
                  tw.style(`rounded-2xl overflow-hidden`, activeFaceClass),
                  { flex: 1 },
                ]
              : tw.style(`rounded-2xl overflow-hidden`, activeFaceClass)
          }
        >
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
