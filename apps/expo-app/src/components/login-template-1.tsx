import { LoginQuickAccess } from "@/components/login-quick-access";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { useZodForm } from "@/components/use-zod-form";
import { useAuthContext } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-color";
import { mobileSignIn } from "@/lib/mobile-auth";
import { type SignInSchema, signInSchema } from "@/lib/schemas/auth";
import { FontAwesome5 } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import type { TextStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Svg, { Path } from "react-native-svg";

const SPLASH_LOGO = require("@assets/icons/splash-logo.png");
const TEMPLATE_2_KEYBOARD_BOTTOM_OFFSET = 96;

export function LoginTemplate1() {
  const [isPending, setIsPending] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { width } = Dimensions.get("window");
  const form = useZodForm(signInSchema, {
    defaultValues: {
      email: process.env.EXPO_PUBLIC_EMAIL?.split(",")?.[0] ?? "",
      password: process.env.EXPO_PUBLIC_TOK ?? "",
    },
  });
  const auth = useAuthContext();
  const colors = useColors();
  const inputStyle: TextStyle = {
    backgroundColor: "transparent",
    color: "#ffffff",
  };
  const passwordDotsStyle: TextStyle = {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 7,
    lineHeight: 30,
  };

  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#000000").catch(() => null);
    NavigationBar.setButtonStyleAsync("light").catch(() => null);
    NavigationBar.setBackgroundColorAsync("#000000").catch(() => null);
    return () => {
      SystemUI.setBackgroundColorAsync(colors.background).catch(() => null);
    };
  }, [colors.background]);

  const { mutate: loginMutation, isPending: isCredentialPending } = useMutation(
    {
      mutationFn: mobileSignIn,
      onSuccess(data) {
        auth.onLogin(data);
      },
      onError(error) {
        Alert.alert(
          "Sign In Failed",
          error instanceof Error ? error.message : "Unable to sign in",
        );
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    },
  );

  function handleCredentialSignIn(data: SignInSchema) {
    loginMutation(data);
  }

  const handleGoogleSignIn = () => {
    setIsPending(true);
    // Simulate OAuth flow
    setTimeout(() => {
      setIsPending(false);
    }, 2000);
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="dark" backgroundColor="#ffffff" translucent />

      {/* Top Wavy White Section */}
      <View className="absolute top-0 w-full h-[45%] bg-white z-0">
        <Svg
          height="120"
          width={width}
          viewBox="0 0 1440 320"
          className="absolute bottom-0 translate-y-[99%]"
          preserveAspectRatio="none"
        >
          <Path
            fill="white"
            d="M0,224L60,197.3C120,171,240,117,360,122.7C480,128,600,192,720,208C840,224,960,192,1080,165.3C1200,139,1320,117,1380,106.7L1440,96L1440,0L0,0Z"
          />
        </Svg>
      </View>

      <View className="z-10 flex-1">
        <SafeArea>
          <KeyboardAwareScrollView
            bottomOffset={TEMPLATE_2_KEYBOARD_BOTTOM_OFFSET}
            disableScrollOnKeyboardHide
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "space-between",
              paddingBottom: 48,
              paddingHorizontal: 32,
              paddingTop: 32,
            }}
          >
            <View>
              {/* Header/Logo */}
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-black">
                  <Image
                    source={SPLASH_LOGO}
                    contentFit="contain"
                    style={{ height: 34, width: 34 }}
                  />
                </View>
                <View>
                  <Text className="text-black font-black text-xl">ProDesk</Text>
                </View>
              </View>

              {/* Title */}
              <View className="mt-[15vh] items-center">
                <Text className="text-5xl font-bold text-black tracking-tight text-center">
                  Sign In
                </Text>
              </View>
            </View>

            {/* Action Area */}
            <View className="w-full gap-4 mb-8">
              <View className="gap-3">
                <Controller
                  control={form.control}
                  name="email"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <View>
                      <View className="h-14 flex-row items-center rounded-[28px] border border-zinc-800 bg-[#111] px-4">
                        <Icon
                          name="Mail"
                          className="size-sm text-muted-foreground"
                          theme="dark"
                        />
                        <TextInput
                          placeholder="name@company.com"
                          placeholderTextColor="#71717a"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          cursorColor="#ffffff"
                          selectionColor="#ffffff"
                          style={[
                            {
                              height: "100%",
                              flex: 1,
                              paddingHorizontal: 12,
                              fontSize: 16,
                            },
                            inputStyle,
                          ]}
                        />
                      </View>
                      {error ? (
                        <Text className="mt-1 px-4 text-xs font-medium text-red-300">
                          {error.message}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />

                <Controller
                  control={form.control}
                  name="password"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <View>
                      <View className="h-14 flex-row items-center rounded-[28px] border border-zinc-800 bg-[#111] pl-4 pr-1">
                        <Icon
                          name="Lock"
                          className="size-sm text-muted-foreground"
                          theme="dark"
                        />
                        <TextInput
                          placeholder="Password"
                          placeholderTextColor="#71717a"
                          autoCapitalize="none"
                          autoCorrect={false}
                          secureTextEntry={!isPasswordVisible}
                          textContentType="password"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          cursorColor="#ffffff"
                          selectionColor="#ffffff"
                          style={[
                            {
                              height: "100%",
                              flex: 1,
                              paddingHorizontal: 12,
                              fontSize: 16,
                            },
                            inputStyle,
                            !isPasswordVisible && passwordDotsStyle,
                          ]}
                        />
                        <Pressable
                          accessibilityLabel={
                            isPasswordVisible
                              ? "Hide password"
                              : "Show password"
                          }
                          accessibilityRole="button"
                          accessibilityState={{ selected: isPasswordVisible }}
                          hitSlop={4}
                          onPress={() =>
                            setIsPasswordVisible((visible) => !visible)
                          }
                          className="h-11 w-11 items-center justify-center rounded-xl active:bg-zinc-800"
                        >
                          <Icon
                            name={isPasswordVisible ? "EyeOff" : "Eye"}
                            className="text-muted-foreground"
                            theme="dark"
                            size={20}
                          />
                        </Pressable>
                      </View>
                      {error ? (
                        <Text className="mt-1 px-4 text-xs font-medium text-red-300">
                          {error.message}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />

                <TouchableOpacity
                  onPress={form.handleSubmit(handleCredentialSignIn)}
                  disabled={isCredentialPending}
                  activeOpacity={0.8}
                  className="mt-2 h-14 w-full flex-row items-center justify-center gap-3 rounded-[28px] bg-white"
                >
                  {isCredentialPending ? (
                    <ActivityIndicator color="black" />
                  ) : (
                    <Icon name="ArrowRight" className="size-sm text-black" />
                  )}
                  <Text className="text-base font-bold text-black">
                    {isCredentialPending ? "Signing in..." : "Sign in"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-zinc-400 font-medium text-center">
                or Sign In with
              </Text>

              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={isPending}
                activeOpacity={0.8}
                className="w-full rounded-[32px] overflow-hidden"
              >
                {/* Fake gradient border wrapper using absolute views or simpler approach */}
                <View className="w-full bg-[#111] border border-zinc-800 rounded-[32px] px-6 py-4 flex-row items-center justify-center gap-3">
                  {isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <FontAwesome5 name="google" size={20} color="white" />
                  )}
                  <Text className="font-semibold text-white text-lg">
                    Sign in with Google
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
          <LoginQuickAccess
            variant="dark"
            onSelectEmail={(email) => form.setValue("email", email)}
          />
        </SafeArea>
      </View>
    </View>
  );
}
