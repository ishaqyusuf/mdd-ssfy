import { cn } from "@/lib/utils";
import { BlurView as ExpoBlurView } from "expo-blur";
export function BlurView({ children, className = "", intensity = 90 }) {
  const tint = "light"; //useColorScheme();
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
