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

type ColorMode = "never" | "selected" | "always";

type PressableRadioProps = {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  color?: string;
  colorMode?: ColorMode;
  shade?: number;
  pressDepth?: number;
  deepFactor?: number;
  style?: StyleProp<ViewStyle>;
  fillHeight?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

function clampShade(shade: number): number {
  return Math.max(100, Math.min(800, shade));
}

function getStateClasses(color: string, shade: number, isColored: boolean) {
  if (!isColored) {
    return {
      faceClass: "bg-gray-50",
      shadowClass: "bg-gray-200",
      faceBorderClass: "rounded-2xl border border-gray-200",
    };
  }
  const s = clampShade(shade);
  const shadowShade = Math.min(s + 0, 900);
  return {
    faceClass: `bg-${color}-${s}`,
    shadowClass: `bg-${color}-${shadowShade}`,
    faceBorderClass: `rounded-2xl border border-${color}-${shadowShade}`,
  };
}

export default function PressableRadio({
  children,
  selected,
  onPress,
  color = "indigo",
  colorMode = "never",
  shade = 400,
  pressDepth = PRESS_DEPTH,
  deepFactor = DEEP_FACTOR,
  style,
  fillHeight = false,
  disabled = false,
  accessibilityLabel,
  testID,
}: PressableRadioProps) {
  const { trigger } = useHaptics();
  const translateY = useRef(
    new Animated.Value(selected ? pressDepth : 0),
  ).current;
  const [forceSync, setForceSync] = useState(0);

  // Always-current ref so gesture callbacks read the live selected value
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Captured at press-in so callbacks always know the starting state
  const selectedAtPressStart = useRef(selected);
  // Set by onPress; tells the snap-back in onPressOut to do nothing
  const wasValidPress = useRef(false);

  const animateTo = (toValue: number, duration: number) => {
    Animated.timing(translateY, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Sync resting position whenever selected or pressDepth changes, or after a
  // press completes (forceSync). Nothing touches selected/forceSync during an
  // active gesture, so no isGestureActive guard is needed.
  useEffect(() => {
    animateTo(selected ? pressDepth : 0, PRESS_OUT_MS);
  }, [selected, pressDepth, forceSync]);

  const handlePressIn = () => {
    if (disabled) return;
    wasValidPress.current = false;
    selectedAtPressStart.current = selectedRef.current;
    trigger("impactLight");
    animateTo(
      selectedRef.current ? pressDepth * deepFactor : pressDepth,
      PRESS_IN_MS,
    );
  };

  // onPress only fires on a confirmed tap. setForceSync is called inline (not
  // deferred) so it batches with the parent's setState from onPress() — the
  // useEffect always runs with the final settled selected value.
  const handlePress = () => {
    wasValidPress.current = true;
    onPress();
    setForceSync((n) => n + 1);
  };

  const handlePressOut = () => {
    if (disabled) return;
    // Defer so onPress (which fires in the same JS tick) can set wasValidPress first.
    // If no onPress fires (scroll/cancel), snap back to the starting position.
    setTimeout(() => {
      if (!wasValidPress.current) {
        animateTo(selectedAtPressStart.current ? pressDepth : 0, PRESS_OUT_MS);
      }
    }, 0);
  };

  const isColored =
    colorMode === "always" || (colorMode === "selected" && selected);

  const { faceClass, shadowClass, faceBorderClass } = getStateClasses(
    color,
    shade,
    isColored,
  );

  const maxDepth = pressDepth * deepFactor;

  return (
    <Animated.View style={[tw`relative`, { paddingBottom: maxDepth }, style]}>
      {/* Shadow */}
      <Animated.View
        style={[
          tw.style(shadowClass, `rounded-2xl absolute inset-0`),
          { top: maxDepth },
        ]}
      />
      {/* Face */}
      <Animated.View
        style={[
          fillHeight
            ? [{ transform: [{ translateY }] }, { flex: 1 }]
            : { transform: [{ translateY }] },
          tw.style(faceBorderClass),
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
          testID={testID}
          style={
            fillHeight
              ? [
                  tw.style(`rounded-2xl overflow-hidden`, faceClass),
                  { flex: 1 },
                ]
              : tw.style(`rounded-2xl overflow-hidden`, faceClass)
          }
        >
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
