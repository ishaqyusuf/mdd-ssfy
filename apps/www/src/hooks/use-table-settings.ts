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
}

interface UseTableSettingsReturn {
    columnVisibility: VisibilityState;
    setColumnVisibility: Dispatch<SetStateAction<VisibilityState>>;
    columnSizing: ColumnSizingState;
    setColumnSizing: Dispatch<SetStateAction<ColumnSizingState>>;
    columnOrder: ColumnOrderState;
    setColumnOrder: Dispatch<SetStateAction<ColumnOrderState>>;
}

export function useTableSettings({
    tableId,
    initialSettings,
    columnIds,
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
    const isInitialMount = useRef(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const persistSettings = useCallback(
        (
            visibility: VisibilityState,
            sizing: ColumnSizingState,
            order: ColumnOrderState,
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

        persistSettings(columnVisibility, columnSizing, columnOrder);
    }, [columnVisibility, columnSizing, columnOrder, persistSettings]);

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
    };
}
