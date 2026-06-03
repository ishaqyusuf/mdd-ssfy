"use client";

import type {
    ColumnOrderState,
    ColumnSizingState,
    VisibilityState,
} from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { updateTableSettingsAction } from "@/actions/update-table-settings-action";
import {
    mergeWithDefaults,
    normalizeColumnOrder,
    TABLE_SETTINGS_COOKIE,
    type TableId,
    type TableSettings,
} from "@/utils/table-settings";

interface UseTableSettingsProps {
    tableId: TableId;
    initialSettings?: Partial<TableSettings>;
    columnIds?: string[];
    showColumnDividers?: boolean;
}

interface UseTableSettingsReturn {
    columnVisibility: VisibilityState;
    setColumnVisibility: Dispatch<SetStateAction<VisibilityState>>;
    columnSizing: ColumnSizingState;
    setColumnSizing: Dispatch<SetStateAction<ColumnSizingState>>;
    columnOrder: ColumnOrderState;
    setColumnOrder: Dispatch<SetStateAction<ColumnOrderState>>;
    showColumnDividers: boolean;
    setShowColumnDividers: Dispatch<SetStateAction<boolean>>;
}

export function useTableSettings({
    tableId,
    initialSettings,
    columnIds,
    showColumnDividers: defaultShowColumnDividers,
}: UseTableSettingsProps): UseTableSettingsReturn {
    const settings = mergeWithDefaults(initialSettings, tableId);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        settings.columns,
    );
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
        settings.sizing,
    );
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
        columnIds
            ? normalizeColumnOrder(settings.order, columnIds)
            : settings.order,
    );
    const [showColumnDividers, setShowColumnDividers] = useState<boolean>(
        defaultShowColumnDividers ?? settings.showColumnDividers ?? false,
    );
    const isInitialMount = useRef(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const persistSettings = useCallback(
        (
            visibility: VisibilityState,
            sizing: ColumnSizingState,
            order: ColumnOrderState,
            columnDividers: boolean,
        ) => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(async () => {
                const existingCookie = document.cookie
                    .split("; ")
                    .find((row) => row.startsWith(`${TABLE_SETTINGS_COOKIE}=`));
                let allSettings: Record<string, Partial<TableSettings>> = {};

                if (existingCookie) {
                    try {
                        allSettings = JSON.parse(
                            decodeURIComponent(
                                existingCookie.split("=")[1] ?? "{}",
                            ),
                        );
                    } catch {
                        allSettings = {};
                    }
                }

                allSettings[tableId] = {
                    columns: visibility,
                    sizing,
                    order,
                    showColumnDividers: columnDividers,
                };

                await updateTableSettingsAction({
                    key: TABLE_SETTINGS_COOKIE,
                    data: allSettings,
                });
            }, 300);
        },
        [tableId],
    );

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        persistSettings(
            columnVisibility,
            columnSizing,
            columnOrder,
            showColumnDividers,
        );
    }, [
        columnVisibility,
        columnSizing,
        columnOrder,
        showColumnDividers,
        persistSettings,
    ]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return {
        columnVisibility,
        setColumnVisibility,
        columnSizing,
        setColumnSizing,
        columnOrder,
        setColumnOrder,
        showColumnDividers,
        setShowColumnDividers,
    };
}
