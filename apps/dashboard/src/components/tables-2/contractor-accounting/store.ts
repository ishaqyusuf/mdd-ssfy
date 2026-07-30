"use client";

import type { ContractorAccountingRow } from "@/components/tables-2/contractor-accounting/columns";
import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

type ContractorAccountingTableState = {
	columns: Column<ContractorAccountingRow, unknown>[];
	setColumns: (columns: Column<ContractorAccountingRow, unknown>[]) => void;
	showColumnDividers: boolean;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
};

export const useContractorAccountingTableStore =
	create<ContractorAccountingTableState>((set) => ({
		columns: [],
		showColumnDividers: false,
		setColumns: (columns) => set({ columns }),
		setShowColumnDividers: (updater) =>
			set((state) => {
				const next =
					typeof updater === "function"
						? updater(state.showColumnDividers)
						: updater;
				state.showColumnDividersSetter?.(next);
				return { showColumnDividers: next };
			}),
		bindShowColumnDividers: (value, setter) =>
			set({
				showColumnDividers: value,
				showColumnDividersSetter: setter,
			}),
	}));
