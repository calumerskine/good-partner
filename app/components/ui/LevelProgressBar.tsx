import tw from "@/lib/tw";
import { MotiView } from "moti";
import { Text, View } from "react-native";

type LevelProgressBarProps = {
  progress: number;
  label?: string;
  xpText?: string;
  height?: number;
  animated?: boolean;
};

export default function LevelProgressBar({
  progress,
  label,
  xpText,
  height = 8,
  animated = true,
}: LevelProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View>
      {(label || xpText) && (
        <View style={tw`flex-row justify-between items-center mb-1.5`}>
          {label && (
            <Text style={tw`text-xs font-gabarito font-medium text-white/80`}>
              {label}
            </Text>
          )}
          {xpText && (
            <Text style={tw`text-xs font-gabarito text-white/70`}>
              {xpText}
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          tw`rounded-full overflow-hidden`,
          { height, backgroundColor: "rgba(255,255,255,0.3)" },
        ]}
      >
        {animated ? (
          <MotiView
            from={{ width: "0%" }}
            animate={{ width: `${Math.round(clampedProgress * 100)}%` }}
            transition={{ type: "timing", duration: 800, delay: 300 }}
            style={[
              tw`h-full rounded-full`,
              { backgroundColor: "white" },
            ]}
          />
        ) : (
          <View
            style={[
              tw`h-full rounded-full`,
              { backgroundColor: "white", width: `${Math.round(clampedProgress * 100)}%` },
            ]}
          />
        )}
      </View>
    </View>
  );
}
