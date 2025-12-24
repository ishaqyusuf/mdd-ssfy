import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { getBaseUrl } from "./base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(), //"http://localhost:8081", // Base URL of your Better Auth backend.

  plugins: [
    expoClient({
      scheme: "gndprodesk",
      storagePrefix: "gndprodesk",
      storage: SecureStore,
    }),
  ],
});
