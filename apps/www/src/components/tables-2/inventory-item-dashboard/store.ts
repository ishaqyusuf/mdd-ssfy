"use client";

import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { InventoryItemDashboardTableId } from "./types";

type AnyColumn = Column<unknown, unknown>;

type TableState = {
	columns: AnyColumn[];
	showColumnDividers: boolean;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
};

type InventoryItemDashboardTableState = {
	tables: Partial<Record<InventoryItemDashboardTableId, TableState>>;
	setColumns: (
		tableId: InventoryItemDashboardTableId,
		columns: AnyColumn[],
	) => void;
	setShowColumnDividers: (
		tableId: InventoryItemDashboardTableId,
		updater: SetStateAction<boolean>,
	) => void;
	bindShowColumnDividers: (
		tableId: InventoryItemDashboardTableId,
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
};

function getTableState(
	tables: Partial<Record<InventoryItemDashboardTableId, TableState>>,
	tableId: InventoryItemDashboardTableId,
): TableState {
	return (
		tables[tableId] ?? {
			columns: [],
			showColumnDividers: false,
		}
	);
}

export const useInventoryItemDashboardTableStore =
	create<InventoryItemDashboardTableState>((set) => ({
		tables: {},
		setColumns: (tableId, columns) =>
			set((state) => ({
				tables: {
					...state.tables,
					[tableId]: {
						...getTableState(state.tables, tableId),
						columns,
					},
				},
			})),
		setShowColumnDividers: (tableId, updater) =>
			set((state) => {
				const current = getTableState(state.tables, tableId);
				const nextValue =
					typeof updater === "function"
						? updater(current.showColumnDividers)
						: updater;

				current.showColumnDividersSetter?.(nextValue);

				return {
					tables: {
						...state.tables,
						[tableId]: {
							...current,
							showColumnDividers: nextValue,
						},
					},
				};
			}),
		bindShowColumnDividers: (tableId, value, setter) =>
			set((state) => ({
				tables: {
					...state.tables,
					[tableId]: {
						...getTableState(state.tables, tableId),
						showColumnDividers: value,
						showColumnDividersSetter: setter,
					},
				},
			})),
	}));
