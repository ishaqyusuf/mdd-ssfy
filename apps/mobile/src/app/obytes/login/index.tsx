import { Inputs } from "@/components/obytes/inputs";
import { LoginForm } from "@/components/obytes/login-form";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Typography } from "@/components/obytes/typography";
import { Button } from "@/components/ui/button";
import { FocusAwareStatusBar } from "@/components/ui/focus-aware-status-bar";
import { Buttons } from "@/components/obytes/buttons";
import { ScrollView } from "react-native";

export default function Login() {
  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView>
        <ThemedView className="space-y-4 px-4 flex-col">
          <LoginForm />
        </ThemedView>
      </ScrollView>
    </>
  );
}
