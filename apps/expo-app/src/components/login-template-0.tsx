import { shouldUsePasswordMaskTypography } from "@/components/login-password-style";
import { LoginQuickAccess } from "@/components/login-quick-access";
import { SafeArea } from "@/components/safe-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input-2";
import { Label } from "@/components/ui/label";
import { useZodForm } from "@/components/use-zod-form";
import { useAuthContext } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-color";
import { mobileSignIn } from "@/lib/mobile-auth";
import { type SignInSchema, signInSchema } from "@/lib/schemas/auth";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { Controller } from "react-hook-form";
import type { TextStyle } from "react-native";
import { Alert, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const SPLASH_LOGO = require("@assets/icons/splash-logo.png");
const TEMPLATE_0_KEYBOARD_BOTTOM_OFFSET = 96;

export function LoginTemplate0() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useZodForm(signInSchema, {
    defaultValues: {
      email: process.env.EXPO_PUBLIC_EMAIL?.split(",")?.[0] ?? "",
      password: process.env.EXPO_PUBLIC_TOK ?? "",
    },
  });

  const auth = useAuthContext();
  const colors = useColors();
  const textInputStyle: TextStyle = {
    backgroundColor: "transparent",
    color: colors.foreground,
  };
  const passwordDotsStyle: TextStyle = {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 6,
    lineHeight: 28,
  };

  const { mutate: loginMutation, isPending } = useMutation({
    mutationFn: mobileSignIn,
    onSuccess(data) {
      auth.onLogin(data);
    },
    onError(error) {
      Alert.alert(
        "Sign In Failed",
        error instanceof Error ? error.message : "Unable to signin",
      );
    },
    meta: {
      toastTitle: {
        error: "Unable to complete",
        loading: "Processing...",
        success: "Done!.",
      },
    },
  });

  const signIn = (data: SignInSchema) => {
    loginMutation(data);
  };

  return (
    <SafeArea>
      <View className="relative flex-1 bg-background">
        <KeyboardAwareScrollView
          bottomOffset={TEMPLATE_0_KEYBOARD_BOTTOM_OFFSET}
          disableScrollOnKeyboardHide
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 20,
            paddingBottom: 96,
          }}
        >
          <View className="mb-8 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-card">
                <Image
                  source={SPLASH_LOGO}
                  contentFit="contain"
                  style={{ height: 34, width: 34 }}
                />
              </View>
              <View>
                <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">
                  GND Millwork
                </Text>
                <Text className="text-xl font-black text-foreground">
                  ProDesk
                </Text>
              </View>
            </View>
            <ThemeToggle />
          </View>

          <View className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <View className="mb-6">
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Icon name="Lock" className="text-primary" size={24} />
              </View>
              <Text className="text-3xl font-black text-card-foreground">
                Welcome back
              </Text>
              <Text className="mt-2 text-sm leading-5 text-muted-foreground">
                Sign in to manage jobs, dispatch work, and review field updates.
              </Text>
            </View>

            <View className="gap-y-4">
              <View>
                <Label style={{ color: colors.foreground }}>Email</Label>
                <Controller
                  control={form.control}
                  name="email"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <View className="mt-2">
                      <View className="flex-row items-center rounded-2xl border border-border bg-background px-3">
                        <Icon
                          name="Mail"
                          className="text-muted-foreground"
                          size={18}
                        />
                        <Input
                          placeholder="name@company.com"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          placeholderTextColor={colors.mutedForeground}
                          cursorColor={colors.primary}
                          selectionColor={colors.primary}
                          style={textInputStyle}
                          className="h-14 flex-1 border-0 bg-transparent px-3 shadow-none"
                        />
                      </View>
                      {error && (
                        <Text className="mt-1 text-xs font-medium text-destructive">
                          {error.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>

              <View>
                <Label style={{ color: colors.foreground }}>Password</Label>
                <Controller
                  control={form.control}
                  name="password"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <View className="mt-2">
                      <View className="flex-row items-center rounded-2xl border border-border bg-background px-3">
                        <Icon
                          name="Lock"
                          className="text-muted-foreground"
                          size={18}
                        />
                        <Input
                          placeholder="Password"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          secureTextEntry={!isPasswordVisible}
                          textContentType="password"
                          placeholderTextColor={colors.mutedForeground}
                          cursorColor={colors.primary}
                          selectionColor={colors.primary}
                          style={[
                            textInputStyle,
                            shouldUsePasswordMaskTypography({
                              value,
                              isPasswordVisible,
                            }) && passwordDotsStyle,
                          ]}
                          className="h-14 flex-1 border-0 bg-transparent px-3 shadow-none"
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
                          className="h-11 w-11 items-center justify-center rounded-xl active:bg-muted/60"
                        >
                          <Icon
                            name={isPasswordVisible ? "EyeOff" : "Eye"}
                            className="text-muted-foreground"
                            size={20}
                          />
                        </Pressable>
                      </View>
                      {error && (
                        <Text className="mt-1 text-xs font-medium text-destructive">
                          {error.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>
            </View>

            <Button
              onPress={form.handleSubmit(signIn)}
              className="mt-7 h-14 rounded-2xl"
              size="lg"
              disabled={isPending}
            >
              {isPending ? (
                <View className="pointer-events-none animate-spin">
                  <Icon name="Loader2" className="text-primary-foreground" />
                </View>
              ) : (
                <Icon name="ArrowRight" className="text-primary-foreground" />
              )}
              <Text className="font-bold text-primary-foreground">
                {isPending ? "Signing in..." : "Sign in"}
              </Text>
            </Button>
          </View>

          <View className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
            <View className="flex-row gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="ShieldCheck" className="text-primary" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  Secure operator access
                </Text>
                <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                  Authorized team members only. Contact your admin if your
                  account needs access.
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>
        <LoginQuickAccess
          onSelectEmail={(email) => form.setValue("email", email)}
        />
      </View>
    </SafeArea>
  );
}
