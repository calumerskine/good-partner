// components/ui/pressable-card.tsx
import { usePressAnimation } from "@/hooks/animations";
import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import { Href, Link } from "expo-router";
import React from "react";
import { Animated, Pressable, StyleProp, View, ViewStyle } from "react-native";

const PRESS_DEPTH = 10;

type PressableCardProps = {
  children: React.ReactNode;
  color?: string;
  shade?: number;
  onPress?: () => void;
  href?: Href;
  pressDepth?: number;
  showShadow?: boolean;
  style?: StyleProp<ViewStyle>;
  fillHeight?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "none";
};

function clampShade(shade: number): number {
  return Math.max(100, Math.min(800, shade));
}

function getColorClasses(color: string, shade: number) {
  if (color === "ghost") {
    return { faceClass: "bg-transparent", shadowClass: null, isSpecial: true };
  }
  if (color === "muted") {
    return { faceClass: "bg-white/50", shadowClass: null, isSpecial: true };
  }
  if (color === "white") {
    return {
      faceClass: "bg-white",
      shadowClass: "bg-gray-100",
      isSpecial: false,
    };
  }
  const s = clampShade(shade);
  const shadowShade = Math.min(s + 100, 900);
  return {
    faceClass: `bg-${color}-${s}`,
    shadowClass: `bg-${color}-${shadowShade}`,
    isSpecial: false,
  };
}

export default function PressableCard({
  children,
  color = "white",
  shade = 100,
  onPress,
  href,
  pressDepth = PRESS_DEPTH,
  showShadow = false,
  style,
  fillHeight = false,
  disabled = false,
  accessibilityLabel,
  accessibilityRole,
}: PressableCardProps) {
  const { trigger } = useHaptics();
  const isInteractive = !!(href || onPress);
  const { faceClass, shadowClass, isSpecial } = getColorClasses(color, shade);

  const { translateY, handlePressIn, handlePressOut } = usePressAnimation({
    pressDepth,
    disabled,
    skipAnimation: isSpecial || !isInteractive,
  });

  if (__DEV__ && href && onPress) {
    console.warn(
      "PressableCard: both href and onPress provided — onPress will be ignored",
    );
  }

  const defaultRole = href ? "link" : onPress ? "button" : "none";
  const role = accessibilityRole ?? defaultRole;

  if (!isInteractive) {
    const shadow =
      showShadow && shadowClass ? (
        <View
          style={[
            tw.style(shadowClass, `rounded-2xl absolute inset-0`),
            { top: pressDepth },
          ]}
        />
      ) : null;
    return (
      <View
        style={[
          tw`relative`,
          showShadow && shadowClass ? { paddingBottom: pressDepth } : undefined,
          style,
        ]}
      >
        {shadow}
        <View
          style={[
            tw.style(`rounded-2xl overflow-hidden`, faceClass),
            { flex: 1 },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  const onPressIn = (event: any) => {
    handlePressIn(event);
    if (!disabled) trigger("impactLight");
  };

  const pressableEl = (
    <Pressable
      onPress={href ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={role === "none" ? undefined : role}
      style={
        fillHeight
          ? [tw.style(`rounded-2xl overflow-hidden`, faceClass), { flex: 1 }]
          : tw.style(`rounded-2xl overflow-hidden`, faceClass)
      }
    >
      {children}
    </Pressable>
  );

  return (
    <View style={[tw`relative`, { paddingBottom: pressDepth }, style]}>
      {shadowClass && (
        <View
          style={[
            tw.style(shadowClass, `rounded-2xl absolute inset-0`),
            { top: pressDepth },
          ]}
        />
      )}
      <Animated.View
        style={
          fillHeight
            ? [{ transform: [{ translateY }] }, { flex: 1 }]
            : { transform: [{ translateY }] }
        }
      >
        {href && !disabled ? (
          <Link href={href} asChild>
            {pressableEl}
          </Link>
        ) : (
          pressableEl
        )}
      </Animated.View>
    </View>
  );
}
