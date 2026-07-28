"use client";

import {
    PointerSensor,
    type DragEndEvent,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

export function useTableDnd<TData>(table: Table<TData>) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const currentOrder = table
                .getAllLeafColumns()
                .map((column) => column.id);
            const oldIndex = currentOrder.indexOf(active.id as string);
            const newIndex = currentOrder.indexOf(over.id as string);

            if (oldIndex !== -1 && newIndex !== -1) {
                table.setColumnOrder(
                    arrayMove(currentOrder, oldIndex, newIndex),
                );
            }
        },
        [table],
    );

    return { sensors, handleDragEnd };
}
