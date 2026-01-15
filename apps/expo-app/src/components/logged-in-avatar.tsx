import { useAuthContext } from "@/hooks/use-auth";
import { getNameInitials } from "@gnd/utils";
import { Text, View } from "react-native";

export function LoggedInAvatar() {
  const auth = useAuthContext();
  return (
    <View className="relative">
      <View className="h-11 w-11 rounded-full bg-muted items-center justify-center border-2 border-card shadow-sm overflow-hidden">
        <Text className="text-lg font-bold text-muted-foreground">
          {getNameInitials(auth?.profile?.user?.name)}
        </Text>
      </View>
      <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
    </View>
  );
}
