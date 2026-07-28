"use client";

import type { Column, Updater } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { PaymentPortalJobRow } from "./columns";

interface PaymentPortalJobsTableState {
	columns: Column<PaymentPortalJobRow, unknown>[];
	setColumns: (columns: Column<PaymentPortalJobRow, unknown>[]) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: Updater<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const usePaymentPortalJobsTableStore =
	create<PaymentPortalJobsTableState>((set) => ({
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
