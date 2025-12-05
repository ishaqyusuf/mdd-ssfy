import {
  deleteSessionProfile,
  deleteToken,
  getSessionProfile,
  getToken,
  setSessionProfile,
} from "@/lib/session-store";
import { useRouter } from "expo-router";
import { createContext, useContext, useState } from "react";

type AuthContextProps = ReturnType<typeof useCreateAuthContext>;
export const AuthContext = createContext<AuthContextProps>(undefined as any);
export const AuthProvider = AuthContext.Provider;
export const useCreateAuthContext = () => {
  const [profile, setProfile] = useState(getSessionProfile());
  const [token, setToken] = useState(getToken());
  const router = useRouter();
  return {
    profile,
    token,
    onLogin(data) {
      setToken(`${data.sessionId}|${data.user.id}`);
      const { can, ...rest } = data;
      setSessionProfile(rest);
      router.push("/");
      setProfile(getSessionProfile());
    },
    onLogout() {
      deleteToken();
      deleteSessionProfile();
      setProfile(null as any);
      setToken(null);
      // router.replace("/");
      router.push("/");
    },
  };
};
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within a AuthProvider");
  }
  return context;
};
