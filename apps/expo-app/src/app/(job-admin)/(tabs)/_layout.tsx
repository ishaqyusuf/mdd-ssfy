import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, Stack } from "expo-router";
import {
  BottomTabBarButtonProps,
  useBottomTabBarHeight,
} from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import {
  NativeTabs,
  Label,
  Icon as NtIcon,
} from "expo-router/unstable-native-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
} from "react-native";

import { BlurView } from "expo-blur";
import { Icon } from "@/components/ui/icon";
import { useColors } from "@/hooks/use-color";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export default function TabLayout() {
  const theme = useColors();

  const translateY = useRef(new Animated.Value(0)).current;
  // return (
  //   <NativeTabs  minimizeBehavior="onScrollDown">
  //     <NativeTabs.Trigger name="index" disablePopToTop>
  //       <Label>Home</Label>
  //       <NtIcon sf="house.fill" drawable="custom_android_drawable" />
  //     </NativeTabs.Trigger>
  //     <NativeTabs.Trigger name="settings">
  //       <Label>Settings</Label>
  //     </NativeTabs.Trigger>
  //   </NativeTabs>
  // );
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
  // return (
  //   <Tabs
  //     screenOptions={{
  //       tabBarActiveTintColor: "#3b82f6", // primary
  //       tabBarInactiveTintColor: "#9ca3af", // muted
  //       tabBarStyle: {
  //         position: "absolute",
  //         bottom: 0,
  //         left: 0,
  //         right: 0,
  //         backgroundColor: theme.background, // card bg
  //         borderTopColor: theme.border, // border
  //         borderTopWidth: 1,
  //         height: 70,
  //         paddingBottom: 6,
  //         paddingTop: 8,
  //         zIndex: 50,
  //         transform: [{ translateY }],
  //       },
  //       tabBarLabelStyle: {
  //         fontSize: 10,
  //         fontWeight: "500",
  //       },
  //       headerShown: false,
  //     }}
  //   >
  //     <Tabs.Screen
  //       name="index"
  //       initialParams={{ scrollAnimatedValue: translateY }}
  //       options={{
  //         tabBarLabel: () => null,
  //         tabBarIcon: (props) => (
  //           <TabBarIcon icon="home" label="Home" {...props} />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="jobs"
  //       options={{
  //         tabBarLabel: () => null,
  //         tabBarIcon: (props) => (
  //           <TabBarIcon icon="jobs" label="Jobs" {...props} />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="analytics"
  //       options={{
  //         tabBarLabel: () => null,
  //         tabBarIcon: (props) => (
  //           <TabBarIcon icon="analytics" label="Analytics" {...props} />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="settings"
  //       options={{
  //         tabBarLabel: () => null,
  //         tabBarIcon: (props) => (
  //           <TabBarIcon icon="settings" label="Settings" {...props} />
  //         ),
  //       }}
  //     />
  //   </Tabs>
  // );
  // return (
  //   <Tabs
  //     screenOptions={{
  //       tabBarActiveTintColor: "#ff00c3",
  //       tabBarInactiveTintColor: "#727272",
  //       tabBarBadgeStyle: {
  //         backgroundColor: "#000000",
  //         color: "#fff",
  //       },
  //       tabBarButton: HapticTab,
  //       tabBarBackground: TabBarBackground,
  //       tabBarStyle: Platform.select({
  //         ios: {
  //           // Use a transparent background on iOS to show the blur effect
  //           position: "absolute",
  //         },
  //         default: {},
  //       }),
  //       tabBarPosition: "bottom",
  //       // tabBarVariant: "",
  //       animation: "shift",
  //     }}
  //   >
  //     <Tabs.Screen
  //       name="index"
  //       options={{
  //         headerShown: false,
  //         title: "Home",
  //         tabBarIcon: ({ color }) => (
  //           <FontAwesome size={28} name="home" color={color} />
  //         ),
  //       }}
  //     />
  //     <Tabs.Screen
  //       name="settings"
  //       options={{
  //         title: "Settings",
  //         headerShown: false,
  //         tabBarIcon: ({ color }) => (
  //           <FontAwesome size={28} name="cog" color={color} />
  //         ),
  //       }}
  //     />
  //   </Tabs>
  // );
}

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
function TabBarIcon({
  icon,
  label,
  focused,
}: {
  icon: string;
  label: string;
  // color: string;
  focused?;
}) {
  return (
    <View className="items-center justify-center">
      <Icon
        name={icon as any}
        size={24}
        className={cn(
          focused ? "text-primary fill-primary" : "text-muted-foreground"
        )}
        strokeWidth={2}
      />
      <Text
        className={`text-[10px] mt-1 font-medium ${
          focused ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
export const SpecialTabButton = () => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Special Tab Button");
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.button}
      activeOpacity={0.85}
    >
      <Ionicons name="add-circle" size={30} color="#fff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: -20,
    left: "50%",
    transform: [{ translateX: -40 }],
    backgroundColor: "#4F46E5",
    borderRadius: 24,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
  },
});

function TabBarBackground() {
  return (
    <BlurView
      // System chrome material automatically adapts to the system's theme
      // and matches the native tab bar appearance on iOS.
      tint="systemChromeMaterial"
      intensity={60}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
