import { createMMKV } from 'react-native-mmkv'
import { StateStorage } from 'zustand/middleware'

export const storage = createMMKV({
  id: 'onboarding-storage',
})

export const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
}
