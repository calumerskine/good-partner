import { type ActionType } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { XP_PER_COMPLETION, getLevelForXp } from "@/lib/xp";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import Button from "../ui/button";

const CIRCLE_SIZE = 140;
const CIRCLE_STROKE = 8;
const RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ANIMATION = {
  INITIAL_DELAY: 150,
  ICON_SIZE: 112,
  ICON_BG_OPACITY: 0.3,
  ICON_SCALE_DAMPING: 12,
  ICON_SCALE_STIFFNESS: 200,
  SPARKLE_COUNT: 6,
  SPARKLE_SIZE: 8,
  SPARKLE_START_DELAY: 1200,
  SPARKLE_DURATION: 1600,
  SPARKLE_SPREAD: 100,
  PROGRESS_START_DELAY: 1000,
  PROGRESS_DURATION: 1000,
  PROGRESS_OPACITY: 0.2,
  XP_ROLL_START_DELAY: 800,
  XP_ROLL_DURATION: 400,
  XP_TEXT_DELAY: 800,
  XP_TEXT_DURATION: 300,
  HEADER_SCALE_DELAY: 200,
  HEADER_SCALE_DURATION: 300,
  BUTTON_APPEAR_DELAY: 1000,
  BUTTON_APPEAR_DURATION: 300,
  CONFETTI_DELAY: 600,
  CONFETTI_COUNT: 80,
  CONFETTI_ORIGIN_Y: -20,
} as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function getHexColor(colorName: string): string {
  const colors: Record<string, string> = {
    grape: "#8E97FD",
    darkGrape: "#6E78E8",
    darkerGrape: "#5A67D8",
    lightBlue: "#9CD8EC",
    blue: "#6FC3DF",
    darkBlue: "#3FA9C9",
    darkerBlue: "#2B7A8B",
    lightRaspberry: "#FCD1E8",
    raspberry: "#F895C2",
    darkRaspberry: "#E66AAE",
    darkerRaspberry: "#D4559E",
    lightMint: "#B1E3CD",
    mint: "#7FD9B8",
    darkMint: "#2BAB7C",
    darkerMint: "#1E7A5B",
    peach: "#FFCC90",
    lightYellow: "#FCE2B4",
    yellow: "#F6C86B",
    darkYellow: "#E9AA0A",
    darkerYellow: "#C98908",
    charcoal: "#2E3130",
    orange: "#FF9E23",
    background: "#F6F3E6",
    mediumGrey: "#D4D1C3",
  };
  return colors[colorName] || "#9CD8EC";
}

function Sparkles({ color }: { color: string }) {
  const positions = [
    { x: -ANIMATION.SPARKLE_SPREAD, y: -30 },
    { x: ANIMATION.SPARKLE_SPREAD, y: -20 },
    { x: -40, y: ANIMATION.SPARKLE_SPREAD },
    { x: 45, y: ANIMATION.SPARKLE_SPREAD - 15 },
    { x: -ANIMATION.SPARKLE_SPREAD - 5, y: 10 },
    { x: ANIMATION.SPARKLE_SPREAD + 5, y: -40 },
  ];

  return (
    <View style={tw`absolute w-40 h-40 items-center justify-center`}>
      {positions.map((pos, i) => (
        <MotiView
          key={i}
          from={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
          transition={{
            delay: ANIMATION.SPARKLE_START_DELAY + i * 80,
            duration: ANIMATION.SPARKLE_DURATION / 2,
            repeat: 1,
            easing: Easing.out(Easing.ease),
          }}
          style={[
            tw`absolute rounded-full`,
            {
              backgroundColor: color,
              width: ANIMATION.SPARKLE_SIZE,
              height: ANIMATION.SPARKLE_SIZE,
              left: 70 + pos.x,
              top: 70 + pos.y,
            },
          ]}
        />
      ))}
    </View>
  );
}

function AnimatedProgressIcon({
  icon,
  lightColor,
}: {
  icon: string;
  lightColor: string;
}) {
  const hexColor = getHexColor(lightColor);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      ANIMATION.PROGRESS_START_DELAY,
      withTiming(1, {
        duration: ANIMATION.PROGRESS_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={tw`relative items-center justify-center`}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={tw`absolute`}>
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          stroke={hexColor}
          strokeWidth={CIRCLE_STROKE}
          fill="transparent"
          opacity={0.2}
        />
        <AnimatedCircle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          stroke={hexColor}
          strokeWidth={CIRCLE_STROKE}
          fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
        />
      </Svg>
      <Sparkles color={hexColor} />
      <MotiView
        from={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          damping: ANIMATION.ICON_SCALE_DAMPING,
          stiffness: ANIMATION.ICON_SCALE_STIFFNESS,
        }}
        style={[
          tw`rounded-full items-center justify-center`,
          {
            width: ANIMATION.ICON_SIZE,
            height: ANIMATION.ICON_SIZE,
            backgroundColor:
              hexColor +
              String(Math.round(ANIMATION.ICON_BG_OPACITY * 255)).padStart(
                2,
                "0",
              ),
          },
        ]}
      >
        <Text style={tw`text-5xl`}>{icon}</Text>
      </MotiView>
    </View>
  );
}

function AnimatedXPCounter({
  amount,
  title,
  color,
}: {
  amount: number;
  title: string;
  color: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const targetValue = amount;

  useEffect(() => {
    const delayTimeout = setTimeout(() => {
      const duration = ANIMATION.XP_ROLL_DURATION;
      const startTime = Date.now();
      const startValue = 0;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(
          startValue + (targetValue - startValue) * easedProgress,
        );

        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, ANIMATION.XP_ROLL_START_DELAY);

    return () => clearTimeout(delayTimeout);
  }, [targetValue]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        delay: ANIMATION.XP_ROLL_START_DELAY - 100,
        duration: 200,
      }}
    >
      <Text
        style={tw`text-charcoal/70 font-gabarito font-medium text-xl text-center`}
      >
        You earned{" "}
        <Text style={{ color: getHexColor(color) }}>{displayValue}</Text> XP in{" "}
        {title}!
      </Text>
    </MotiView>
  );
}

function LevelProgress({
  previousXp,
  newXp,
  color,
}: {
  previousXp: number;
  newXp: number;
  color: string;
}) {
  const prevLevel = getLevelForXp(previousXp);
  const newLevel = getLevelForXp(newXp);
  const isLevelUp = prevLevel.level !== newLevel.level;

  if (newLevel.isMaxLevel && prevLevel.isMaxLevel) {
    return null;
  }

  // Show progress within the NEW level
  const displayLevel = newLevel;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: ANIMATION.XP_TEXT_DELAY + 200, duration: 300 }}
      style={tw`w-full px-4`}
    >
      <View style={tw`flex-row justify-between items-center mb-1.5`}>
        <Text style={tw`text-charcoal/60 font-gabarito font-medium text-sm`}>
          {displayLevel.title}{" "}
        </Text>
        <Text style={tw`text-charcoal/40 font-gabarito text-sm`}>
          {displayLevel.isMaxLevel
            ? "Max Level"
            : `${displayLevel.currentLevelXp} / ${displayLevel.xpForNextLevel}`}
        </Text>
      </View>
      <View
        style={[
          tw`rounded-full overflow-hidden`,
          { height: 6, backgroundColor: "rgba(0,0,0,0.08)" },
        ]}
      >
        <MotiView
          from={{
            width: isLevelUp
              ? "0%"
              : `${Math.round(prevLevel.progress * 100)}%`,
          }}
          animate={{ width: `${Math.round(displayLevel.progress * 100)}%` }}
          transition={{
            type: "timing",
            duration: 800,
            delay: ANIMATION.XP_TEXT_DELAY + 400,
          }}
          style={[
            tw`h-full rounded-full`,
            { backgroundColor: getHexColor(color) },
          ]}
        />
      </View>
    </MotiView>
  );
}

export default function SuccessScreen({
  category,
  previousXp,
  newXp,
  onNext,
}: {
  category: ActionType;
  previousXp: number;
  newXp: number;
  onNext: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const prevLevel = getLevelForXp(previousXp);
  const newLevel = getLevelForXp(newXp);
  const isLevelUp = prevLevel.level !== newLevel.level;
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (isLevelUp) {
      const timer = setTimeout(() => {
        setShowLevelUp(true);
      }, ANIMATION.XP_TEXT_DELAY + 1200);
      return () => clearTimeout(timer);
    }
  }, [isLevelUp]);

  return (
    <View style={tw`flex-1 items-center justify-between px-6`}>
      {showConfetti && (
        <ConfettiCannon
          count={ANIMATION.CONFETTI_COUNT}
          origin={{ x: 0, y: ANIMATION.CONFETTI_ORIGIN_Y }}
          autoStart
          autoStartDelay={ANIMATION.CONFETTI_DELAY}
          fadeOut
          fallSpeed={3000}
          colors={[
            getHexColor(category.color),
            getHexColor(category.darkColor),
            getHexColor(category.lightColor),
            getHexColor(category.darkerColor),
          ]}
          onAnimationEnd={() => setShowConfetti(false)}
        />
      )}

      {/* <View style={tw`flex-1`} /> */}

      <View style={tw`items-center gap-6 px-4 mt-36`}>
        <AnimatedProgressIcon
          icon={category.icon}
          lightColor={category.lightColor}
        />

        <MotiView
          style={tw`mt-16`}
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: ANIMATION.HEADER_SCALE_DELAY,
            duration: ANIMATION.HEADER_SCALE_DURATION,
          }}
        >
          <Text
            style={tw`text-charcoal font-gabarito font-black text-4xl text-center`}
          >
            Action complete!
          </Text>
        </MotiView>

        <AnimatedXPCounter
          amount={XP_PER_COMPLETION}
          title={category.title}
          color={category.darkColor}
        />

        <LevelProgress
          previousXp={previousXp}
          newXp={newXp}
          color={category.darkColor}
        />
      </View>

      {showLevelUp && (
        <>
          <ConfettiCannon
            count={120}
            origin={{ x: 0, y: ANIMATION.CONFETTI_ORIGIN_Y }}
            autoStart
            fadeOut
            fallSpeed={3000}
            colors={["#8E97FD", "#6FC3DF", "#FFD700", "#F895C2"]}
          />
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              damping: 10,
              stiffness: 150,
            }}
            style={tw`items-center mt-4`}
          >
            <Text
              style={tw`text-2xl font-gabarito font-black text-charcoal text-center`}
            >
              🌿 You reached {newLevel.title}!
            </Text>
          </MotiView>
        </>
      )}

      <View style={tw`flex-1`} />

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          delay: ANIMATION.BUTTON_APPEAR_DELAY,
          duration: ANIMATION.BUTTON_APPEAR_DURATION,
        }}
        style={tw`w-full`}
      >
        <Button
          onPress={() => {
            setShowConfetti(true);
            onNext();
          }}
        >
          Continue
        </Button>
      </MotiView>
    </View>
  );
}
