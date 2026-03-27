import { Heart, Zap, Leaf, Cross } from "lucide-react-native";

export const ActionTypes = {
  ATTENTION: {
    title: "Attention",
    description: "Being mentally/emotionally present, not distracted",
    lightColor: "attention-surface",
    color: "blue",
    darkColor: "attention-main",
    darkerColor: "attention-ink",
    icon: (props?: any) => <Leaf {...props} />,
    iconName: "leaf",
    buttonColor: "blue",
  },
  AFFECTION: {
    title: "Affection",
    description: "Physical and verbal expressions of love",
    lightColor: "affection-surface",
    color: "pink",
    darkColor: "affection-main",
    darkerColor: "affection-ink",
    icon: (props?: any) => <Heart {...props} />,
    iconName: "heart",
    buttonColor: "pink",
  },
  INITIATIVE: {
    title: "Initiative",
    description: "Planning dates, handling tasks, taking on mental load",
    lightColor: "initiative-surface",
    color: "yellow",
    darkColor: "initiative-main",
    darkerColor: "initiative-ink",
    icon: (props?: any) => <Zap {...props} />,
    iconName: "bolt",
    buttonColor: "yellow",
  },
  REPAIR: {
    title: "Repair",
    description: "Emotional skills + reconnecting after conflict",
    lightColor: "repair-surface",
    color: "lime",
    darkColor: "repair-main",
    darkerColor: "repair-ink",
    icon: (props?: any) => <Cross {...props} />,
    iconName: "wrench",
    buttonColor: "lime",
  },
} as const;

export type ActionType = (typeof ActionTypes)[keyof typeof ActionTypes];
