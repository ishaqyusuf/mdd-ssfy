import { Stack, usePathname } from "expo-router";
import { StyleSheet } from "react-native";

import { useAuthContext } from "@/hooks/use-auth";
import NotFound from "@/screens/not-found";

export default function NotFoundScreen() {
  const { token } = useAuthContext();
  const path = usePathname();
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <NotFound />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});
