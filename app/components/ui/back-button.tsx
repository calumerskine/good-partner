import tw from "@/lib/tw";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useRef } from "react";
import { Animated, Pressable, View } from "react-native";

type Props = {
  onPress?: () => void;
};

export default function BackButton({ onPress }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(translateY, {
      toValue: 5,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 12,
    }).start();
  };

  return (
    <View style={[tw`relative`, { paddingBottom: 5 }]}>
      <View
        style={[tw`bg-slate-300 rounded-full absolute inset-0`, { top: 5 }]}
      />
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {
            router.back();
            onPress?.();
          }}
          style={tw`bg-slate-200 rounded-full p-2`}
        >
          <ArrowLeft size={20} style={tw`text-ink`} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
