import { cn } from "@/lib/utils";
import { BlurView as ExpoBlurView } from "expo-blur";
import { useColorScheme } from "react-native";
export function BlurView({ children, className = "", intensity = 90 }) {
  const tint = useColorScheme();
  return (
    <ExpoBlurView
      tint={tint || "light"}
      className={cn(className)}
      intensity={intensity}
    >
      {children}
    </ExpoBlurView>
  );
}
