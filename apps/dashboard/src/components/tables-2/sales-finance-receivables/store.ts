"use client";

import type { SalesFinanceReceivableRow } from "@/components/tables-2/sales-finance-receivables/columns";
import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

type SalesFinanceReceivablesTableState = {
	columns: Column<SalesFinanceReceivableRow, unknown>[];
	setColumns: (columns: Column<SalesFinanceReceivableRow, unknown>[]) => void;
	showColumnDividers: boolean;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
};

export const useSalesFinanceReceivablesTableStore =
	create<SalesFinanceReceivablesTableState>((set) => ({
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
	}));
