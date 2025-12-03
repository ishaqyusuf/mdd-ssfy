import * as SecureStore from "expo-secure-store";

const key = "session_token";

export const getToken = () => SecureStore.getItem(key);
export const deleteToken = () => SecureStore.deleteItemAsync(key);
export const setToken = (v: string) => SecureStore.setItem(key, v);

const profileKey = "session_profile";

interface Profile {
  can?;
  role?: { id; name };
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
  JSON.parse(SecureStore.getItem(profileKey) || "{}") as Profile;
export const setSessionProfile = (data: Profile) =>
  SecureStore.setItem(profileKey, JSON.stringify(data));

export const deleteSessionProfile = () =>
  SecureStore.deleteItemAsync(profileKey);
