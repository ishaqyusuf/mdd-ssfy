import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
export const auth = betterAuth({
  plugins: [expo()],
  emailAndPassword: {
    enabled: true, // Enable authentication using email and password.
  },
  trustedOrigins: [
    "gnd://",
    ...(process.env.NODE_ENV === "development"
      ? [
          "exp://*/*", // Trust all Expo development URLs
          "exp://10.0.0.*:*/*", // Trust 10.0.0.x IP range
          "exp://192.168.*.*:*/*", // Trust 192.168.x.x IP range
          "exp://172.*.*.*:*/*", // Trust 172.x.x.x IP range
          "exp://localhost:*/*", // Trust localhost
        ]
      : []),
  ],
});
