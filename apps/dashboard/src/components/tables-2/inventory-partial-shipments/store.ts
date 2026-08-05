"use client";

import type { Column, RowSelectionState, Updater } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { InventoryPartialShipmentRow } from "./columns";

interface InventoryPartialShipmentsTableState {
	rowSelection: RowSelectionState;
	setRowSelection: (updater: Updater<RowSelectionState>) => void;
	columns: Column<InventoryPartialShipmentRow, unknown>[];
	setColumns: (columns: Column<InventoryPartialShipmentRow, unknown>[]) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: Updater<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
}

export const useInventoryPartialShipmentsTableStore =
	create<InventoryPartialShipmentsTableState>((set) => ({
		columns: [],
		rowSelection: {},
		setRowSelection: (updater) =>
			set((state) => ({
				rowSelection:
					typeof updater === "function" ? updater(state.rowSelection) : updater,
			})),
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
