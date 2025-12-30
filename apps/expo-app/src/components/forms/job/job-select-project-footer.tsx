// apps/expo-app/src/components/forms/job/job-select-project-footer.tsx
import { Text } from "@/components/ui/text";

import { View } from "@/components/ui/view";
import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { TouchableOpacity } from "react-native";
import colors from "@/components/ui/colors";

export function JobSelectProjectFooter({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  // const bgColor = isDark ? colors.background.dark : colors.background.light;

  return (
    <View className="absolute bottom-0 left-0 w-full">
      <LinearGradient
        colors={
          isDark
            ? ["#00000000", "#000000CC", "#000000"]
            : ["#FFFFFF00", "#FFFFFFCC", "#FFFFFF"]
        }
        // colors={[`${bgColor}00`, `${bgColor}CC`, bgColor]}
        locations={[0, 0.2, 0.6]}
        className="w-full h-32"
      />
      <View
        className="p-4 pt-0"
        // style={{ backgroundColor: bgColor }}
      >
        <TouchableOpacity
          onPress={onContinue}
          className="w-full bg-primary h-14 rounded-full active:scale-[0.98] transition-transform flex-row items-center justify-center gap-2"
        >
          <Text className="text-black font-bold text-lg">Continue</Text>
          <Icon name="ArrowRight" className="text-black" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
