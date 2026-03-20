import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import React, { forwardRef, useRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

type Props = PressableProps & {
  children: React.ReactNode;
  color?: keyof typeof colors;
  size?: keyof typeof sizes;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const colors = {
  grape: "bg-indigo-500",
  peach: "bg-peach",
  mint: "bg-green-500",
  raspberry: "bg-pink-500",
  orange: "bg-orange",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  muted: "bg-white/50",
  ghost: "bg-transparent",
  charcoal: "bg-charcoal",
};

const shadows = {
  grape: "bg-indigo-600",
  peach: "bg-darkPeach",
  mint: "bg-green-600",
  raspberry: "bg-pink-600",
  orange: "bg-darkOrange",
  blue: "bg-blue-600",
  yellow: "bg-yellow-600",
  charcoal: "bg-black",
  muted: "bg-transparent",
  ghost: "bg-transparent",
};

const sizes = {
  sm: { padding: "py-2 px-6", text: "text-base" },
  md: { padding: "py-4 px-8", text: "text-lg" },
  lg: { padding: "py-5 px-10", text: "text-xl" },
};

export default forwardRef(function Button(
  {
    children,
    color = "grape",
    size = "md",
    disabled,
    buttonStyle,
    textStyle,
    ...props
  }: Props,
  ref: React.Ref<View>,
) {
  const { trigger } = useHaptics();
  const translateY = useRef(new Animated.Value(0)).current;
  const isSpecial = color === "ghost" || color === "muted";
  const isDisabled = disabled || false;

  const handlePressIn = (event: any) => {
    if (!isDisabled && !isSpecial) {
      Animated.spring(translateY, {
        toValue: 5,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    }
    props.onPressIn?.(event);
    trigger("impactLight");
  };

  const handlePressOut = (event: any) => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 12,
    }).start();
    props.onPressOut?.(event);
  };

  return (
    <View style={[tw`relative`, { paddingBottom: 5 }]}>
      {!isSpecial && (
        <View
          style={[
            tw.style(shadows[color], `rounded-3xl absolute inset-0`),
            { top: 5 },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ translateY }] }}>
        <Pressable
          {...props}
          disabled={isDisabled}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            tw.style(
              `rounded-3xl w-full ${sizes[size].padding}`,
              colors[color],
              isDisabled && ``,
              pressed && isSpecial && ``,
            ),
            buttonStyle,
          ]}
        >
          <Text
            style={[
              tw.style(
                `text-center font-gabarito font-medium ${sizes[size].text} uppercase tracking-widest`,
                isSpecial ? "text-ink" : "text-white",
              ),
              textStyle,
            ]}
          >
            {children}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});
