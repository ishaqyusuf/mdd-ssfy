import { Image } from "expo-image";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeToggle } from "@/components/theme-toggle";
import { Logout } from "@/components/logout";
import { useAuthContext } from "@/hooks/use-auth";
import { PressableLink } from "../pressable-link";
import { Icon } from "../ui/icon";

export function InstallerDashboardHeader2() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const insets = useSafeAreaInsets();
  const auth = useAuthContext();
  const avatarUrl = null;
  return (
    <View
      style={{
        paddingTop: Platform.select({
          android: insets.top,
        }),
      }}
    >
      <View className="sticky top-0 z-30 bg-background px-5 py-4  flex-row items-center">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 rounded-full bg-muted flex items-center justify-center border-2 border-card">
            <Text className="text-xl font-bold text-muted-foreground">A</Text>
          </View>
          <View>
            <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {`${getGreeting()},`}
            </Text>
            <Text className="text-xl font-bold leading-none text-foreground">
              {auth?.profile?.user?.name}!
            </Text>
          </View>
        </View>
        <View className="flex-1" />
        {/* <TouchableOpacity className="h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center relative">
            <Icon name="Bell" className="text-foreground" size={24} />
            <View className="absolute top-3 right-3 h-2 w-2 bg-primary rounded-full border border-card" />
          </TouchableOpacity> */}
        {/* <ThemeToggle /> */}
        {/* <Logout /> */}
        <PressableLink href={"/settings"} className={"p-2 rounded-full"}>
          <Icon name="Settings" className="size-20" />
        </PressableLink>
      </View>
    </View>
  );
}
