"use client";

import { cn } from "@gnd/ui/cn";
import { TableHead } from "@gnd/ui/table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

interface DraggableHeaderProps {
    id: string;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
}

export function DraggableHeader({
    id,
    children,
    className,
    style,
    disabled = false,
}: DraggableHeaderProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        disabled,
    });

    const dragStyle: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        ...style,
    };

    return (
        <TableHead
            ref={setNodeRef}
            className={cn(
                "group/header relative flex h-full select-none items-center border-t border-border px-4",
                "shadow-none outline-none ring-0 hover:shadow-none focus:shadow-none focus:outline-none focus:ring-0",
                isDragging && "z-50 border border-border bg-background",
                className,
            )}
            style={dragStyle}
        >
            <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
            {!disabled && (
                <GripVertical
                    size={14}
                    className="ml-1 flex-shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover/header:opacity-100 active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                />
            )}
        </TableHead>
    );
}
