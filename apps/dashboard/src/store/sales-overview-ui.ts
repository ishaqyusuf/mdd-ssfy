import { create } from "zustand";
import { persist } from "zustand/middleware";

type SalesOverviewUiState = {
	expanded: boolean;
	setExpanded: (expanded: boolean) => void;
};

export const useSalesOverviewUi = create<SalesOverviewUiState>()(
	persist(
		(set) => ({
			expanded: false,
			setExpanded: (expanded) => set({ expanded }),
		}),
		{
			name: "sales-overview-ui",
			partialize: ({ expanded }) => ({ expanded }),
		},
	),
);
