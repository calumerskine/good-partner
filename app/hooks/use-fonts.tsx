import { ArchivoBlack_400Regular } from "@expo-google-fonts/archivo-black";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import { Karla_400Regular } from "@expo-google-fonts/karla";
import { useFonts as useExpoFonts } from "expo-font";
import { useEffect } from "react";
import GabaritoBlack from "../assets/fonts/Gabarito-Black.ttf";
import GabaritoBold from "../assets/fonts/Gabarito-Bold.ttf";
import GabaritoRegular from "../assets/fonts/Gabarito-Regular.ttf";

export function useFonts() {
  const [loaded, error] = useExpoFonts({
    ArchivoBlack: ArchivoBlack_400Regular,
    JetBrainsMono: JetBrainsMono_400Regular,
    Karla: Karla_400Regular,
    Gabarito: GabaritoRegular,
    GabaritoBold,
    GabaritoBlack,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return loaded;
}
