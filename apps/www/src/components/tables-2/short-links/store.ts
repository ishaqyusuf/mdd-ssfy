"use client";

import type { Column, RowSelectionState, Updater } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { ShortLinkRow } from "./columns";

interface ShortLinksTableState {
	columns: Column<ShortLinkRow, unknown>[];
	setColumns: (columns: Column<ShortLinkRow, unknown>[]) => void;
	rowSelection: RowSelectionState;
	setRowSelection: (updater: Updater<RowSelectionState>) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useShortLinksTableStore = create<ShortLinksTableState>((set) => ({
	columns: [],
	rowSelection: {},
	showColumnDividers: false,
	setColumns: (columns) => set({ columns }),
	setRowSelection: (updater) =>
		set((state) => ({
			rowSelection:
				typeof updater === "function" ? updater(state.rowSelection) : updater,
		})),
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
