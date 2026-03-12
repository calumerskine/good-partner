import tailwindConfig from "@/tailwind.config.js";

export const colors = (tailwindConfig.theme?.extend?.colors || {}) as Record<
  string,
  string
>;

export const getHexColor = (colorName: string): string => {
  return colors[colorName] || "#8E97FD";
};

type ColorSet = { surface: string; main: string; ink: string };
export const getCategoryColors = (category: string): ColorSet => {
  return colors[category] as unknown as ColorSet;
};
