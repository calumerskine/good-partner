import { usePressAnimation } from "@/hooks/animations";
import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import React, { forwardRef } from "react";
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

const PRESS_DEPTH = 5;

const sizes = {
  sm: { padding: "py-2 px-6", text: "text-base" },
  md: { padding: "py-4 px-8", text: "text-lg" },
  lg: { padding: "py-5 px-10", text: "text-xl" },
};

type Props = PressableProps & {
  children: React.ReactNode;
  color?: string;
  size?: keyof typeof sizes;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default forwardRef(function Button(
  {
    children,
    color = "indigo",
    size = "md",
    disabled,
    buttonStyle,
    textStyle,
    ...props
  }: Props,
  ref: React.Ref<View>,
) {
  const { trigger } = useHaptics();
  const isSpecial = color === "ghost" || color === "muted";
  const isDisabled = disabled || false;

  const { translateY, handlePressIn, handlePressOut } = usePressAnimation({
    pressDepth: PRESS_DEPTH,
    disabled: isDisabled,
    skipAnimation: isSpecial,
  });

  const faceClass = isSpecial
    ? color === "muted"
      ? "bg-white/50"
      : "bg-transparent"
    : `bg-${color}-400`;

  const shadowClass = isSpecial ? null : `bg-${color}-500`;

  const onPressIn = (event: any) => {
    handlePressIn(event);
    props.onPressIn?.(event);
    if (!isDisabled) trigger("impactLight");
  };

  const onPressOut = (event: any) => {
    handlePressOut(event);
    props.onPressOut?.(event);
  };

  return (
    <View style={[tw`relative`, { paddingBottom: PRESS_DEPTH }]}>
      {shadowClass && (
        <View
          style={[
            tw.style(shadowClass, `rounded-3xl absolute inset-0`),
            { top: PRESS_DEPTH },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ translateY }] }}>
        <Pressable
          {...props}
          ref={ref}
          disabled={isDisabled}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            tw.style(
              `rounded-3xl w-full ${sizes[size].padding}`,
              faceClass,
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
