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

import { SafeArea } from "@/components/safe-area";

export default function SignIn() {
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
      onSuccess(data) {
        console.log({ data });
        auth.onLogin(data);
      },
      onError(error) {
        console.log(error);
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
    <SafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-background relative"
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
            <View className="p-4 bg-primary/10 rounded-full">
              <Icon name="Lock" className="size-48 text-primary" />
            </View>

            <Text className="text-foreground text-4xl font-bold mt-6">
              Welcome Back
            </Text>
            <Text className="text-muted-foreground text-lg mt-2">
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
                      <Text className="text-destructive mt-1">
                        {error.message}
                      </Text>
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
                      className="tracking-widest"
                    />
                    {error && (
                      <Text className="text-destructive mt-1">
                        {error.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <TouchableOpacity className="self-end mt-2">
              <Text className="text-primary font-medium">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {!testEmails?.length || (
            <View className="flex flex-wrap flex-row">
              {testEmails.map((email, i) => (
                <Button
                  key={i}
                  className="w-1/2"
                  onPress={() => form.setValue("email", email)}
                >
                  <Text className="text-primary-foreground">{email}</Text>
                </Button>
              ))}
            </View>
          )}

          <Button
            onPress={form.handleSubmit(signIn)}
            className="mt-8"
            size="lg"
            variant="destructive"
          >
            {!isPending || (
              <View className="pointer-events-none animate-spin">
                <Icon name="Loader2" className="text-destructive-foreground" />
              </View>
            )}
            <Text className="text-destructive-foreground">Sign In</Text>
          </Button>

          <View className="mt-12 items-center">
            <Text className="text-center text-muted-foreground">
              Or sign in with
            </Text>

            <View className="flex-row justify-center space-x-6 mt-4">
              <TouchableOpacity className="h-14 w-14 bg-muted items-center justify-center rounded-full">
                <Text className="text-foreground text-2xl font-bold">G</Text>
              </TouchableOpacity>

              <TouchableOpacity className="h-14 w-14 bg-muted items-center justify-center rounded-full">
                <Text className="text-foreground text-2xl font-bold">A</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-muted-foreground">
              {"Don't"} have an account?{" "}
            </Text>
            <TouchableOpacity>
              <Text className="text-primary font-bold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}
