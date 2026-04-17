import { useFormScrollContext } from "@/components/ui/form-scroll-view";
import tw from "@/lib/tw";
import { useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  TextStyle,
} from "react-native";

type InputProps = {
  name: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  style?: TextStyle;
  variant?: "default" | "outlined";
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "style">;

export default function Input({
  name,
  placeholder,
  value,
  onChangeText,
  style,
  variant = "default",
  onFocus: externalOnFocus,
  onBlur: externalOnBlur,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const formScroll = useFormScrollContext();

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    formScroll?.setFocusedInput(inputRef.current);
    externalOnFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    externalOnBlur?.(e);
  };

  if (variant === "outlined") {
    return (
      <TextInput
        ref={inputRef}
        id={name}
        testID={name}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.4)"
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          tw.style(
            `text-white font-gabarito text-lg px-6 py-4 w-full rounded-2xl border-2`,
            isFocused ? "border-grape bg-white/5" : "border-white/20",
          ),
          style,
        ]}
        {...rest}
      />
    );
  }

  return (
    <TextInput
      ref={inputRef}
      id={name}
      testID={name}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(0,0,0,0.4)"
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[
        tw.style(
          `text-black font-gabarito text-xl px-6 py-4 w-full rounded-xl`,
          isFocused ? "bg-white shadow-lg" : "bg-white/90",
        ),
        style,
      ]}
      {...rest}
    />
  );
}
