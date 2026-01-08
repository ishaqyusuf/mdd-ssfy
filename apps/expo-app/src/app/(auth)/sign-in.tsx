import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import React from "react";
import { Controller } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useZodForm } from "@/components/use-zod-form";
import { signInSchema } from "@/lib/schemas/auth";
import { Input } from "@/components/ui/input-2";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/ui/icon";
import { Loader2 } from "lucide-react-native";
import { Roles } from "@gnd/utils/constants";
import { Var } from "@/components/variant";

export default function SignIn() {
  const { colorScheme } = useColorScheme();

  const form = useZodForm(signInSchema, {
    defaultValues: {
      email: process.env.EXPO_PUBLIC_EMAIL?.split(",")?.[0]!,
      password: process.env.EXPO_PUBLIC_TOK,
    },
  });
  const testEmails = process.env.EXPO_PUBLIC_EMAIL?.split(",");
  const auth = useAuthContext();
  const { mutate: loginMutation, isPending } = useMutation(
    _trpc.user.login.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        // if (
        //   (["1099 Contractor", "Punchout"] as Roles[]).includes(
        //     data.role.name as any
        //   )
        // ) {
        auth.onLogin(data);
        // } else
        //   Alert.alert(
        //     "Sign In Failed",
        //     `App feature not available for ${data.role.name}`
        //   );
      },
      onError(error, variables, onMutateResult, context) {
        Alert.alert("Sign In Failed", "Unable to signin");
      },
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
  const signIn = async (data) => {
    loginMutation(data);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 relative"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex justify-end flex-row">
          <ThemeToggle />
        </View>
        <View className="items-center mb-12">
          <View className="p-4 bg-blue-600/10 dark:bg-blue-500/20 rounded-full">
            <MaterialIcons
              name="lock-outline"
              size={48}
              color={colorScheme === "dark" ? "#60A5FA" : "#2563EB"}
            />
          </View>
          <Text className="text-foreground text-4xl font-bold mt-6">
            Welcome Back
          </Text>
          <Text className="text-muted-foreground text-lg mt-2">
            Sign in to continue
          </Text>
        </View>
        <View className="gap-y-4">
          {/* <Text>{process.env.EXPO_PUBLIC_BASE_URL}</Text> */}
          <View>
            <Label>Email</Label>
            <Controller
              control={form.control}
              name="email"
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }) => (
                <View className="mt-2">
                  <Input
                    placeholder="Email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    className="font-semibold h-12"
                  />
                  {error && (
                    <Text className="text-red-500 mt-1">{error.message}</Text>
                  )}
                </View>
              )}
            />
          </View>
          <View>
            <Label>Password</Label>
            <Controller
              control={form.control}
              name="password"
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }) => (
                <View className="mt-2">
                  <Input
                    placeholder="Password"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry
                    textContentType="password"
                    className="font-semibold h-12"
                  />
                  {error && (
                    <Text className="text-red-500 mt-1">{error.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          <TouchableOpacity className="self-end mt-2">
            <Text className="text-blue-600 dark:text-blue-400 font-medium">
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>
        <Var />
        {!testEmails?.length || (
          <View className="flex flex-wrap flex-row">
            {testEmails.map((email, i) => (
              <Button
                key={i}
                className="w-1/2"
                // variant={"outline"}
                onPress={(e) => {
                  form.setValue("email", email);
                }}
              >
                <Text>{email}</Text>
              </Button>
            ))}
          </View>
        )}
        <Button
          onPress={form.handleSubmit(signIn)}
          className="mt-8"
          size="lg"
          variant={"destructive"}

          // loading={isLoading}
        >
          {!isPending || (
            <View className="pointer-events-none animate-spin">
              <Icon name="Loader2" className="text-white" />
            </View>
          )}
          <Text className="text-destructive-foreground">Sign In</Text>
        </Button>

        <View className="mt-12 items-center">
          <Text className="text-center text-gray-500 dark:text-gray-400">
            Or sign in with
          </Text>
          <View className="flex-row justify-center space-x-6 mt-4">
            <TouchableOpacity className="h-14 w-14 bg-gray-200/60 dark:bg-gray-800/60 items-center justify-center rounded-full">
              <Text className="text-gray-900 dark:text-white text-2xl font-bold">
                G
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="h-14 w-14 bg-gray-200/60 dark:bg-gray-800/60 items-center justify-center rounded-full">
              <Text className="text-gray-900 dark:text-white text-2xl font-bold">
                A
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-500 dark:text-gray-400">
            {"Don't"} have an account?{" "}
          </Text>
          <TouchableOpacity>
            <Text className="text-blue-600 dark:text-blue-400 font-bold">
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
