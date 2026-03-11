import LevelProgressBar from "@/components/ui/LevelProgressBar";
import { getLevelForXp } from "@/lib/xp";
import tw from "@/lib/tw";
import { MotiView } from "moti";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type XPHeroCardProps = {
  totalXp: number;
};

export default function XPHeroCard({ totalXp }: XPHeroCardProps) {
  const levelInfo = getLevelForXp(totalXp);

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 400 }}
      style={tw`mb-6`}
    >
      <LinearGradient
        colors={["#8E97FD", "#6FC3DF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw`rounded-2xl p-5`}
      >
        <View style={tw`flex-row items-center gap-4`}>
          <View
            style={[
              tw`w-12 h-12 rounded-full items-center justify-center`,
              { backgroundColor: "rgba(255,255,255,0.25)" },
            ]}
          >
            <Text style={tw`text-white font-gabarito font-black text-lg`}>
              {levelInfo.level}
            </Text>
          </View>

          <View style={tw`flex-1`}>
            <Text style={tw`text-white font-gabarito font-black text-2xl`}>
              {levelInfo.title}
            </Text>
            <Text style={tw`text-white/70 font-gabarito text-sm`}>
              {totalXp} XP total
            </Text>
          </View>
        </View>

        <View style={tw`mt-4`}>
          <LevelProgressBar
            progress={levelInfo.progress}
            label={levelInfo.isMaxLevel ? "Max Level" : `Level ${levelInfo.level}`}
            xpText={
              levelInfo.isMaxLevel
                ? "Complete!"
                : `${levelInfo.currentLevelXp} / ${levelInfo.xpForNextLevel}`
            }
          />
        </View>
      </LinearGradient>
    </MotiView>
  );
}
