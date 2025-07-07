import React from "react";
import { Icons } from "@/components/_v1/icons";
import { cn } from "@/lib/utils";
import { PrimitiveDivProps } from "@/types/type";
import { cva, VariantProps } from "class-variance-authority";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { Separator } from "@gnd/ui/separator";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@gnd/ui/sheet";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";

import { Kbd } from "../kbd";
import { useInfiniteDataTable } from "./use-data-table";

import "./overview-sheet-style.css";

// import { SheetHeader } from "@gnd/ui/sheet";
interface Props {
    // title?: string;
    // titleClassName?: string;
    children?: React.ReactNode;
}
export default function TableItemOverviewSheet({
    children,
}: // title,
// titleClassName,
Props) {
    const { table, selectedRow, refresh, checkMode } = useInfiniteDataTable();

    const selectedRowKey =
        Object.keys(table.getState().rowSelection)?.[0] || undefined;

    if (!selectedRowKey || !selectedRow || checkMode) return null;
    return (
        <Sheet
            // modal={false}
            open={!!selectedRowKey}
            onOpenChange={(e) => {
                if (!e) refresh.init();
                table.toggleAllRowsSelected(false);
            }}
        >
            <SheetContent hideClose className="overview-sheet-content">
                <SheetDescription className="sr-only">
                    Selected row details
                </SheetDescription>
                {/* <div className="p-4"> */}
                {children}
                {/* </div> */}
            </SheetContent>
        </Sheet>
    );
}
interface TableSheetHeaderProps {
    titleClassName?;
    title;
    rowChanged?;
}
export function SecondaryTabSheet({
    titleClassName = "",
    title,
    onBack,
    children = null,
}) {
    return (
        <SheetHeader className=" overview-sheet-header">
            <div className="flex gap-2">
                <SheetTitle
                    className={cn(
                        titleClassName,
                        "flex-1 truncate text-left uppercase",
                    )}
                >
                    {title}
                </SheetTitle>
                <div className="flex h-7 items-center gap-1">
                    {children}
                    <Separator orientation="vertical" className="mx-1" />

                    <Button
                        onClick={onBack}
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                    >
                        <Icons.chevronRight className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>
            </div>
        </SheetHeader>
    );
}
export function TableSheetHeader({
    titleClassName,
    title,
    rowChanged,
}: TableSheetHeaderProps) {
    const { table, selectedRow } = useInfiniteDataTable();
    const selectedRowKey =
        Object.keys(table.getState().rowSelection)?.[0] || undefined;

    const index = table
        .getCoreRowModel()
        .flatRows.findIndex((row) => row.id === selectedRowKey);

    const nextId = React.useMemo(
        () => table.getCoreRowModel().flatRows[index + 1]?.id,
        [index, table],
    );

    const prevId = React.useMemo(
        () => table.getCoreRowModel().flatRows[index - 1]?.id,
        [index, table],
    );
    const onPrev = React.useCallback(() => {
        if (prevId) {
            table.setRowSelection({ [prevId]: true });
            rowChanged?.();
        }
    }, [prevId, table]);

    const onNext = React.useCallback(() => {
        if (nextId) {
            table.setRowSelection({ [nextId]: true });
            rowChanged?.();
        }
    }, [nextId, table]);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (!selectedRowKey) return;

            if (e.key === "ArrowUp") {
                e.preventDefault();
                onPrev();
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                onNext();
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [selectedRowKey, onNext, onPrev]);
    return (
        <SheetHeader className="overview-sheet-header sticky top-0   bg-background">
            <div className="flex items-center justify-between gap-2">
                <SheetTitle
                    className={cn(
                        titleClassName,
                        "truncate text-left uppercase",
                    )}
                >
                    {title}
                </SheetTitle>
                <div className="flex h-7 items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={!prevId}
                                    onClick={onPrev}
                                >
                                    <ChevronUp className="h-5 w-5" />
                                    <span className="sr-only">Previous</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    Navigate <Kbd variant="outline">↑</Kbd>
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={!nextId}
                                    onClick={onNext}
                                >
                                    <ChevronDown className="h-5 w-5" />
                                    <span className="sr-only">Next</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    Navigate <Kbd variant="outline">↓</Kbd>
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* <Button size="icon" variant="outline" className="">
                                <Pencil className="h-5 text-muted-foreground w-5" />
                                <span className="sr-only">Close</span>
                            </Button> */}
                    <Separator orientation="vertical" className="mx-1" />
                    <SheetClose autoFocus={true} asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7">
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </SheetClose>
                </div>
            </div>
        </SheetHeader>
    );
}
const contentVariants = cva(``, {
    variants: {
        size: {
            sm: "w-full sm:w-[350px] lg:w-[350px]",
            md: "w-full lg:w-[500px]",
            lg: "w-full lg:w-[700px]",
            xl: "w-full lg:w-[900px]",
            "2xl": "",
        },
    },
    defaultVariants: {
        size: "md",
    },
});
interface SideSheetTabProps
    extends PrimitiveDivProps,
        VariantProps<typeof contentVariants> {
    // side?: SheetContentProps["side"];
}
export function SideSheetContent({}: SideSheetTabProps) {}
