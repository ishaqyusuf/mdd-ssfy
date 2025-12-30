// apps/expo-app/src/components/forms/job/job-select-project-footer.tsx
import { Text, View, TouchableOpacity } from "react-native";
import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/use-color";

export function JobSelectProjectFooter({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const colors = useColors();

  return (
    <View className="absolute bottom-0">
      {/* <View className="absolute bottom-0 left-0 w-full"> */}
      <LinearGradient
        colors={[
          `${colors.background}00`,
          `${colors.background}CC`,
          colors.background,
        ]}
        locations={[0, 0.2, 0.6]}
        // style={{ width: "100%", height: 128 }}
      />
      <View style={{ backgroundColor: colors.background }}>
        <View className="p-4 pt-0">
          <TouchableOpacity
            onPress={onContinue}
            className="w-full bg-primary h-14 rounded-full flex-row items-center justify-center gap-2"
          >
            <Text className="text-primary-foreground font-bold text-lg">
              Continue
            </Text>
            <Icon
              name="ArrowRight"
              className="text-primary-foreground"
              size={20}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
