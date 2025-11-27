// import { createMMKV } from 'react-native-mmkv'
// import { StateStorage } from 'zustand/middleware'

// export const storage = createMMKV({
//   id: 'onboarding-storage',
// })

// export const zustandStorage: StateStorage = {
//   setItem: (name, value) => storage.set(name, value),
//   getItem: (name) => storage.getString(name) ?? null,
//   removeItem: (name) => storage.remove(name),
// }

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateStorage } from "zustand/middleware";

const STORAGE_PREFIX = "onboarding-storage:";

export const storage = {
  set: async (key: string, value: string) => {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  },
  getString: async (key: string) => {
    return await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
  },
  remove: async (key: string) => {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  },
};

export const zustandStorage: StateStorage = {
  setItem: async (name, value) => {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${name}`, value);
  },
  getItem: async (name) => {
    const value = await AsyncStorage.getItem(`${STORAGE_PREFIX}${name}`);
    return value ?? null;
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${name}`);
  },
};
