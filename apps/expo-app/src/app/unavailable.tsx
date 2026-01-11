import { Icon } from "@/components/ui/icon";
import { useAuthContext } from "@/hooks/use-auth";
import React from "react";
import { Pressable, View, Text, Animated } from "react-native";

/**
 * AccessUnavailableScreen
 *
 * Displays a restricted access message for mobile users.
 * Uses a dark theme with semantic colors.
 */
export default function AccessUnavailableScreen() {
  const auth = useAuthContext();
  return (
    <Animated.ScrollView>
      <View className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-6 py-12 text-center selection:bg-primary/20">
        {/* Visual Section: Lock Icon with Glow */}
        <View className="relative mb-8 flex items-center justify-center">
          {/* Glow Effect */}
          <View className="absolute h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

          {/* Circle Container */}
          <View className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#1a2632] shadow-2xl ring-1 ring-white/5">
            {/* We use the image from the design as a background for authenticity, 
              but overlay the icon for sharpness if the image fails or for semantics */}
            <View
              className="absolute inset-0 rounded-full bg-cover bg-center opacity-80 mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBpKx2u2H_f67V2f79liXtBD7IgPxacpzkNKNLwpID6dYvFN3QLYORqhhFVcEglDBXlx-XUL3GACUR0Ba_WZJqUneTmYWQO6tg-axemXPilI6nWWt7xy8WezYa7yV-Cie5cNPdA4BkYOvZws006Fjzl0hQfjiuSU2g7lFubIaK2cDsLGdL2fkSsZovvOPGEb7g7-irTj9uxchXBvz2m-F_djlg8lre1nMsOp1nZMU7bPQrl3yAn8vuGGVR9Lbjcyioz_MnWcTFAW-Q")',
              }}
            />
            <Icon
              name="Lock"
              className="relative z-10 size-8 text-foreground drop-shadow-md"
            />
            {/* <Lock
            className="relative z-10 h-8 w-8 text-foreground/90 drop-shadow-md"
            strokeWidth={2.5}
          /> */}
          </View>
        </View>

        {/* Main Typography */}
        <Text className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Mobile Access Unavailable
        </Text>

        <Text className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
          It looks like {"you're"} signed in with an account type that {"isn't"}{" "}
          supported on the mobile app yet.
        </Text>

        {/* Info Warning Box */}
        <View className="mb-8 flex max-w-sm flex-row items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-4 text-left shadow-sm">
          <Icon
            name="Info"
            className="size-4 mt-0.5 h-5 w-5 shrink-0 text-primary"
          />
          {/* <Info
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          strokeWidth={2}
        /> */}
          <Text className="text-xs leading-relaxed text-muted-foreground">
            This app is currently designed for{" "}
            <Text className="font-semibold text-foreground">Installers</Text>{" "}
            and <Text className="font-semibold text-foreground">Admins</Text>{" "}
            only. Please access your dashboard via our website.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex w-full max-w-xs flex-col gap-4">
          {/* Primary Action */}
          <Pressable
            onPress={(e) => {
              auth.onLogout();
            }}
            className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background flex-row"
          >
            <Icon name="LogOut" className="size-6" />
            {/* <LogOut
            className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2.5}
          /> */}
            <Text className="text-foreground"> Log Out</Text>
          </Pressable>

          {/* Secondary Action */}
          <Pressable className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline focus:outline-none">
            <Text>Contact Support</Text>
          </Pressable>
        </View>
      </View>
    </Animated.ScrollView>
  );
}
