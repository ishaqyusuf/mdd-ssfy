import { useColorScheme } from "@/hooks/use-color";
import { cn } from "@/lib/utils";
import { BlurView as ExpoBlurView } from "expo-blur";
import { View } from "react-native";
type Props = {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
};
export function BlurView({ children, className = "", intensity = 90 }: Props) {
  const tint = useColorScheme()?.colorScheme;
  return (
    <ExpoBlurView
      tint={tint || "light"}
      intensity={intensity}
      className={cn("rounded-lg", className)}
    >
      {children}
    </ExpoBlurView>
  );
  return (
    <View
      // tint={tint || "light"}
      className={cn("bg-foreground/30", className)}
      // intensity={intensity}
    >
      {children}
    </View>
  );
}
