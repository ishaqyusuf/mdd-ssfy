"use client";

import type { SalesFinanceRow } from "@/components/tables-2/sales-finance/columns";
import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

type SalesFinanceTableState = {
	columns: Column<SalesFinanceRow, unknown>[];
	setColumns: (columns: Column<SalesFinanceRow, unknown>[]) => void;
	showColumnDividers: boolean;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
};

export const useSalesFinanceTableStore = create<SalesFinanceTableState>(
	(set) => ({
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
				return { showColumnDividers: nextValue };
			}),
		bindShowColumnDividers: (value, setter) =>
			set({
				showColumnDividers: value,
				showColumnDividersSetter: setter,
			}),
	}),
);
