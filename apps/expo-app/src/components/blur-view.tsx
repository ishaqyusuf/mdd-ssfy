import { cn } from "@/lib/utils";
import { View } from "react-native";
export function BlurView({ children, className = "", intensity = 90 }) {
  const tint = "light"; //useColorScheme();
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
