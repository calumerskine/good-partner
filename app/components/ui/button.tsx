import tw from "@/lib/tw";
import { forwardRef } from "react";
import {
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
  size?: "sm" | "md" | "lg";
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const colors = {
  grape: "bg-grape",
  peach: "bg-peach",
  mint: "bg-mint",
  raspberry: "bg-raspberry",
  orange: "bg-orange",
  blue: "bg-blue",
  yellow: "bg-yellow",
  muted: "bg-white/50",
  ghost: "bg-transparent",
};

const sizes = {
  sm: {
    padding: "py-2 px-6",
    text: "text-lg",
  },
  md: {
    padding: "py-4 px-8",
    text: "text-xl",
  },
  lg: {
    padding: "py-5 px-10",
    text: "text-2xl",
  },
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
  const isGhost = color === "ghost";
  const isMuted = color === "muted";
  const isDisabled = disabled || false;

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        tw.style(
          `rounded-xl w-full ${sizes[size].padding}`,
          colors[color],
          isDisabled && tw`opacity-50`,
          pressed && !isDisabled && tw`opacity-80`,
          !isGhost && !isDisabled && tw`shadow-md`,
        ),
        buttonStyle,
      ]}
      ref={ref}
    >
      <Text
        style={[
          tw.style(
            `text-center font-gabarito font-bold ${sizes[size].text}`,
            isMuted || isGhost ? "text-white" : "text-white",
            isDisabled && tw`opacity-70`,
          ),
          textStyle,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
});
