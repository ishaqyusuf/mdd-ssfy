import { MaterialIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useColorScheme } from "nativewind";
import React from "react";
import { Controller, Form, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useZodForm } from "@/components/use-zod-form";
import { signInSchema, type SignInSchema } from "@/lib/schemas/auth";
import { Input } from "@/components/ui/input-2";

export default function SignIn() {
  const { colorScheme } = useColorScheme();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useZodForm(signInSchema, {
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signIn = async (data: SignInSchema) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_WEB_URL}/api/auth/callback/credentials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          message: "Invalid credentials",
        }));
        throw new Error(errorData.message || "Invalid credentials");
      }

      const result = await res.json();

      await SecureStore.setItemAsync(
        "token",
        result?.accessToken || result?.token
      );

      return true;
    } catch (error: any) {
      Alert.alert("Sign In Failed", error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-12">
          <View className="p-4 bg-blue-600/10 dark:bg-blue-500/20 rounded-full">
            <MaterialIcons
              name="lock-outline"
              size={48}
              color={colorScheme === "dark" ? "#60A5FA" : "#2563EB"}
            />
          </View>
          <Text className="text-gray-900 dark:text-white text-4xl font-bold mt-6">
            Welcome Back
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-lg mt-2">
            Sign in to continue
          </Text>
        </View>
        <View className="gap-y-4">
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
                    Icon={
                      <MaterialIcons
                        name="lock-outline"
                        size={20}
                        color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
                      />
                    }
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

        <Button
          onPress={form.handleSubmit(signIn)}
          className="mt-8"
          size="lg"
          variant={"destructive"}
          // loading={isLoading}
        >
          <Text>Sign In</Text>
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
            Don't have an account?{" "}
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
