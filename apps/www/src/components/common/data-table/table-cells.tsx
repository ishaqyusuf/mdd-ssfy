"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ProgressStatus from "@/components/_v1/progress-status";
import { DateFormats, formatDate } from "@/lib/use-day";
import { catchError, cn, formatCurrency } from "@/lib/utils";
import { PrimitiveDivProps } from "@/types/type";
import { toast } from "sonner";

import { Button, ButtonProps, buttonVariants } from "@gnd/ui/button";
import { DropdownMenuShortcut } from "@gnd/ui/dropdown-menu";

import { MenuItem } from "../../_v1/data-table/data-table-row-actions";
import { Icons } from "../../_v1/icons";

interface Props {
    children?;
    className?: string;
}
function Cell({
    children,
    href,
    ...rest
}: { children?; href? } & PrimitiveDivProps) {
    if (href)
        return (
            <div {...rest}>
                <Link className="hover:underline" href={href}>
                    {children}
                </Link>
            </div>
        );
    return <div {...rest}>{children}</div>;
}
function Primary({ children, className }: Props) {
    return <div className={cn("font-semibold", className)}>{children}</div>;
}
function Medium({ children, className }: Props) {
    return <div className={cn("font-medium", className)}>{children}</div>;
}
function Secondary({ children, className }: Props) {
    return (
        <div className={cn("text-muted-foreground", className)}>{children}</div>
    );
}
function Date({
    children,
    className,
    format = "MM/DD/YY",
}: Props & {
    format?: DateFormats;
}) {
    return <div className={cn(className)}>{formatDate(children)}</div>;
}
function Money({
    value,
    validOnly,
    className,
}: {
    value?;
    validOnly?;
    className?: string;
}) {
    if (!value) value = 0;
    if (!value && validOnly) return null;
    return (
        <span className={cn(className)}>{formatCurrency.format(value)}</span>
    );
}
function DeleteRow({
    action,
    data,
    disabled,
    menu,
    deleteKey = "id",
}: {
    action;
    data;
    disabled?: boolean;
    menu?: Boolean;
    deleteKey?: string;
}) {
    const [confirm, setConfirm] = useState(false);
    const [isPending, startTransition] = useTransition();
    const Icon = confirm ? Icons.Warn : isPending ? Icons.spinner : Icons.trash;
    function _delete(e) {
        e.preventDefault();
        if (!confirm) {
            setConfirm(true);
            setTimeout(() => {
                setConfirm(false);
            }, 3000);
            return;
        }
        setConfirm(false);
        startTransition(async () => {
            toast.promise(
                async () => {
                    if (action) {
                        await action(data[deleteKey]);
                    }
                    // revalidatePath("");
                },
                {
                    loading: `Deleting`, // ${row.type} #${row.orderId}`,
                    success(data) {
                        return "Deleted Successfully";
                    },
                    error: "Unable to completed Delete Action",
                },
            );
        });
    }
    if (!menu)
        return (
            <Button
                variant="outline"
                disabled={isPending || disabled}
                className="flex h-8 w-8 p-0 text-red-500 hover:text-red-600"
                onClick={_delete}
            >
                <Icon
                    className={`${
                        isPending ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4"
                    }`}
                />
                <span className="sr-only">Delete</span>
            </Button>
        );
    return (
        <MenuItem
            disabled={isPending || disabled}
            className="text-red-500 hover:text-red-600"
            onClick={_delete}
        >
            <Icon
                className={`mr-2 ${
                    isPending ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4"
                }`}
            />
            {confirm ? "Sure?" : isPending ? "Deleting" : "Delete"}
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </MenuItem>
    );
}
function Btn({
    icon,
    onClick,
    disabled,
    children,
    className,
    ...props
}: {
    icon?: keyof typeof Icons;
    onClick?;
    disabled?: boolean;
    children?;
} & ButtonProps) {
    const Icon = Icons[icon as any];
    return (
        <Button
            variant="outline"
            disabled={disabled}
            className={cn("flex h-8 px-2", !children && "w-8 px-0", className)}
            onClick={onClick}
            {...props}
        >
            {Icon && <Icon className={cn("h-4 w-4", children && "mr-2")} />}
            {children}
        </Button>
    );
}
function NewBtn({ onClick, link }: { onClick?; link? }) {
    if (link)
        return (
            <Link aria-label="Create new row" href={link}>
                <div
                    className={cn(
                        buttonVariants({
                            size: "sm",
                            className: "h-8",
                        }),
                    )}
                >
                    <Icons.add className="mr-2 h-4 w-4" aria-hidden="true" />
                    New
                </div>
            </Link>
        );
    return (
        <Button size="sm" onClick={onClick} className="h-8">
            <Icons.add className="mr-2 h-4 w-4" aria-hidden="true" />
            New
        </Button>
    );
}
function BatchDelete({ table, action, selectedIds }) {
    const [isPending, startTransition] = useTransition();
    function deleteRowsAction(e) {
        toast.promise(Promise.all(selectedIds.map((id) => action(id))), {
            loading: "Deleting...",
            success: () => {
                table.toggleAllPageRowsSelected(false);
                return "Deleted Successfully";
            },
            error(err: unknown) {
                table.toggleAllPageRowsSelected(false);
                return catchError(err);
            },
        });
    }
    return (
        <Button
            aria-label="Delete selected rows"
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={(event) => {
                startTransition(() => {
                    table.toggleAllPageRowsSelected(false);
                    deleteRowsAction(event);
                });
            }}
            disabled={isPending}
        >
            <Icons.trash className="mr-2 h-4 w-4" aria-hidden="true" />
            Delete
        </Button>
    );
}

export let TableCol = Object.assign(Cell, {
    Primary,
    Medium,
    NewBtn,
    Btn,
    Secondary,
    Status: ProgressStatus,
    Money,
    Date,
    BatchDelete,
    DeleteRow,
});
