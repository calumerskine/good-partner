import tailwindConfig from "@/tailwind.config.js";

export const colors = (tailwindConfig.theme?.extend?.colors || {}) as Record<
  string,
  string
>;

export const getHexColor = (colorName: string): string => {
  return colors[colorName] || "#8E97FD";
};
