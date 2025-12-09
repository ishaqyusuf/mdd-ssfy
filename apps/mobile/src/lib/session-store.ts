import { Roles } from "@gnd/utils/constants";
import * as SecureStore from "expo-secure-store";

export const SESSION_KEY = "session_token";

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

interface Profile {
  can?;
  role?: { id; name: Roles };
  sessionId;
  token;
  user: {
    id;
    name;
    email;
    phoneNo;
  };
}
export const getSessionProfile = () =>
  JSON.parse(SecureStore.getItem(profileKey)!) as Profile;
export const setSessionProfile = (data: Profile) =>
  SecureStore.setItem(profileKey, JSON.stringify(data));

export const deleteSessionProfile = () =>
  SecureStore.deleteItemAsync(profileKey);
