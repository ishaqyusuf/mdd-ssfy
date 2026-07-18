"use client";

import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { ShelfItemRow } from "./columns";

interface ShelfItemsTableState {
	columns: Column<ShelfItemRow, unknown>[];
	setColumns: (columns: Column<ShelfItemRow, unknown>[]) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useShelfItemsTableStore = create<ShelfItemsTableState>((set) => ({
	columns: [],
	showColumnDividers: false,
	setColumns: (columns) => set({ columns }),
	setShowColumnDividers: (updater) =>
		set((state) => {
			const nextValue =
				typeof updater === "function"
					? updater(state.showColumnDividers)
					: updater;

			state.showColumnDividersSetter?.(nextValue);

			return {
				showColumnDividers: nextValue,
			};
		}),
	bindShowColumnDividers: (value, setter) =>
		set({
			showColumnDividers: value,
			showColumnDividersSetter: setter,
		}),
}));
