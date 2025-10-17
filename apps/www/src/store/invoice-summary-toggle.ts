"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthStore {
    hidden: boolean;

    toggle: () => void;
}

export const useSalesSummaryToggle = create<AuthStore>()(
    persist(
        (set, get) => ({
            hidden: false,

            toggle: () => {
                set((state) => ({ hidden: !state.hidden }));
            },
        }),
        {
            name: "sales-summary-toggle",
        },
    ),
);

