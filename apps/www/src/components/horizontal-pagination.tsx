"use client";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";

interface HorizontalPaginationProps {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    onScrollLeft: () => void;
    onScrollRight: () => void;
    className?: string;
}

export function HorizontalPagination({
    canScrollLeft,
    canScrollRight,
    onScrollLeft,
    onScrollRight,
    className,
}: HorizontalPaginationProps) {
    return (
        <div className={cn("flex items-center space-x-2", className)}>
            <Button
                variant="outline"
                size="sm"
                disabled={!canScrollLeft}
                className="size-6 p-0"
                onClick={onScrollLeft}
            >
                <Icons.ChevronLeft
                    className={cn("size-3.5", canScrollLeft && "text-primary")}
                />
                <span className="sr-only">Scroll left</span>
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={!canScrollRight}
                className="size-6 p-0"
                onClick={onScrollRight}
            >
                <Icons.ChevronRight
                    className={cn("size-3.5", canScrollRight && "text-primary")}
                />
                <span className="sr-only">Scroll right</span>
            </Button>
        </div>
    );
}
