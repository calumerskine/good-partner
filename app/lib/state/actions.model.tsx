import { Wrench, Heart, Zap, Leaf } from "lucide-react-native";

export const ActionTypes = {
  ATTENTION: {
    title: "Attention",
    description: "Being mentally/emotionally present, not distracted",
    lightColor: "lightBlue",
    color: "blue",
    darkColor: "darkBlue",
    darkerColor: "darkerBlue",
    icon: (props?: any) => <Leaf {...props} />,
    iconName: "leaf",
    buttonColor: "blue",
  },
  AFFECTION: {
    title: "Affection",
    description: "Physical and verbal expressions of love",
    lightColor: "lightRaspberry",
    color: "pink",
    darkColor: "darkRaspberry",
    darkerColor: "darkerRaspberry",
    icon: (props?: any) => <Heart {...props} />,
    iconName: "heart",
    buttonColor: "pink",
  },
  INITIATIVE: {
    title: "Initiative",
    description: "Planning dates, handling tasks, taking on mental load",
    lightColor: "lightYellow",
    color: "yellow",
    darkColor: "darkYellow",
    darkerColor: "darkerYellow",
    icon: (props?: any) => <Zap {...props} />,
    iconName: "bolt",
    buttonColor: "yellow",
  },
  REPAIR: {
    title: "Repair",
    description: "Emotional skills + reconnecting after conflict",
    lightColor: "lightMint",
    color: "green",
    darkColor: "darkMint",
    darkerColor: "darkerMint",
    icon: (props?: any) => <Wrench {...props} />,
    iconName: "wrench",
    buttonColor: "green",
  },
} as const;

export type ActionType = (typeof ActionTypes)[keyof typeof ActionTypes];
