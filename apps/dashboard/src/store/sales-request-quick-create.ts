import { create } from "zustand";

type SalesRequestQuickCreateState = {
	isOpen: boolean;
	open: () => void;
	setOpen: (isOpen: boolean) => void;
};

export const useSalesRequestQuickCreateStore =
	create<SalesRequestQuickCreateState>()((set) => ({
		isOpen: false,
		open: () => set({ isOpen: true }),
		setOpen: (isOpen) => set({ isOpen }),
	}));
