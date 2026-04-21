import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { useAssets } from "expo-asset";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

type Props = {
  onNext: () => void;
};

export function WelcomeStep({ onNext }: Props) {
  const router = useRouter();
  const [starImage] = useAssets([require("@/assets/images/logo_min.png")]);

  return (
    <View style={tw`flex-1 items-center justify-between px-6 pt-0`}>
      {starImage?.[0]?.localUri ? (
        <Image source={{ uri: starImage[0].localUri }} style={tw`w-42 h-42`} />
      ) : null}
      {/* </View> */}

      <View style={tw`gap-6 flex-1 mt-12`}>
        <Text style={tw`text-4xl text-ink font-gabarito font-bold text-center`}>
          Welcome to
        </Text>
        <Text style={tw`text-4xl text-ink font-gabarito font-bold text-center`}>
          The Good Partner
        </Text>
        <Text
          style={tw`text-xl text-ink/80 font-gabarito text-center leading-relaxed px-6`}
        >
          Your partner in building stronger relationships through thoughtful
          actions
        </Text>
      </View>

      <View style={tw`w-full gap-4 pt-6 pb-8`}>
        <Button onPress={onNext}>Get Started</Button>
        <View style={tw`flex-row items-center justify-center gap-2`}>
          <Text style={tw`text-ink/80 font-gabarito text-base`}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={tw`text-indigo-400 font-gabarito font-bold text-base`}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
