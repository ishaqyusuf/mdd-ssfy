import { ICan, Roles } from "@gnd/utils/constants";
import * as SecureStore from "expo-secure-store";

export const SESSION_KEY = "gnd_prodesk";
export type SectionKey = "jobs" | "dispatch" | "installer" | "driver";
export type CurrentSection = {
  isJobs: boolean;
  isInstaller: boolean;
  isDispatch: boolean;
  isDriver: boolean;
};

export const getToken = () => {
  return SecureStore.getItem(SESSION_KEY);
  // try {
  // } catch (error) {
  //   consoleLog("TOKEN LOAD ERROR", error);
  // }
  // return null;
};
export const deleteToken = () => SecureStore.deleteItemAsync(SESSION_KEY);
export const setToken = (v: string) => SecureStore.setItem(SESSION_KEY, v);

const profileKey = "session_profile";

export interface Profile {
  can?: ICan;
  role?: { id: number; name: Roles };
  sessionId: string;
  token: string;
  sections?: SectionKey[];
  currentSection?: CurrentSection;
  user: {
    id: number;
    name: string;
    email: string;
    phoneNo: string;
  };
}
export const getSessionProfile = () =>
  JSON.parse(SecureStore.getItem(profileKey)!) as Profile;
export const setSessionProfile = (data: Profile) =>
  SecureStore.setItem(profileKey, JSON.stringify(data));

export const deleteSessionProfile = () =>
  SecureStore.deleteItemAsync(profileKey);
