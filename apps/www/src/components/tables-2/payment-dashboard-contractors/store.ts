"use client";

import type { Column, Updater } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { PaymentDashboardContractorRow } from "./columns";

interface PaymentDashboardContractorsTableState {
	columns: Column<PaymentDashboardContractorRow, unknown>[];
	setColumns: (
		columns: Column<PaymentDashboardContractorRow, unknown>[],
	) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: Updater<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const usePaymentDashboardContractorsTableStore =
	create<PaymentDashboardContractorsTableState>((set) => ({
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
