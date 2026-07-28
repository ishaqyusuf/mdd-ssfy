"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type TestEmailModeStore = {
	enabled: boolean;
	setEnabled: (enabled: boolean) => void;
	toggle: () => void;
};

export const useTestEmailMode = create<TestEmailModeStore>()(
	persist(
		(set) => ({
			enabled: false,
			setEnabled: (enabled) => set({ enabled }),
			toggle: () => set((state) => ({ enabled: !state.enabled })),
		}),
		{
			name: "test-email-mode",
		},
	),
);
