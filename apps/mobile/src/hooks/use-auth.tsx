import {
  deleteSessionProfile,
  deleteToken,
  getSessionProfile,
  getToken,
  setSessionProfile,
  setToken,
} from "@/lib/session-store";
import { useRouter } from "expo-router";
import { createContext, useContext, useState } from "react";

type AuthContextProps = ReturnType<typeof useCreateAuthContext>;
export const AuthContext = createContext<AuthContextProps>(undefined as any);
export const AuthProvider = AuthContext.Provider;
export const useCreateAuthContext = () => {
  const [profile, setProfile] = useState(getSessionProfile());
  const [token, _setToken] = useState(getToken());
  const router = useRouter();
  return {
    profile,
    token,
    onLogin(data) {
      _setToken(data.token);
      const { can, ...rest } = data;
      setSessionProfile(rest);
      setProfile(getSessionProfile());
      setToken(data.token);
      router.push("/");
    },
    onLogout() {
      deleteToken();
      deleteSessionProfile();
      setProfile(null as any);

      _setToken(null);
      // router.replace("/");
      router.replace("/");
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
