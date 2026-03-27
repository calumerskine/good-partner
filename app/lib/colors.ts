import tw from "@/lib/tw";

const fallback = "#8E97FD";

export const getHexColor = (name: string): string =>
  tw.color(name) ?? fallback;

type ColorSet = { surface: string; main: string; ink: string };
export const getCategoryColors = (category: string): ColorSet => ({
  surface: tw.color(`${category}-surface`) ?? fallback,
  main: tw.color(`${category}-main`) ?? fallback,
  ink: tw.color(`${category}-ink`) ?? fallback,
});
