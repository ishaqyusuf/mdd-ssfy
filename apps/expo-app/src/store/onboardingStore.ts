import { OnboardingState } from "@/types/onboarding/onboarding-types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./mmkv";

export const useOnboardingStore = create(
  persist<OnboardingState>(
    (set) => ({
      hasCompletedOnboarding: true,
      completeOnboarding: (hasCompletedOnboarding: boolean) =>
        set((state) => {
          return {
            ...state,
            hasCompletedOnboarding,
          };
        }),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
