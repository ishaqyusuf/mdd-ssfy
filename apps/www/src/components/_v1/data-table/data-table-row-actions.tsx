"use client";

import { useTransition } from "@/utils/use-safe-transistion";

import { useRouter } from "next/navigation";
import { typedMemo } from "@/lib/hocs/typed-memo";
import { useBool } from "@/lib/use-loader";

import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenuItem,
    type DropdownMenuItemProps,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@gnd/ui/dropdown-menu";

import { type IconKeys, Icons } from "../icons";
import LinkableNode from "../link-node";

type MenuItemProps = {
    link?;
    href?;
    Icon?;
    SubMenu?;
    _blank?: boolean;
    icon?: IconKeys;
} & DropdownMenuItemProps; // PrimitiveDivProps &
function RowActionMenuItem({
    link,
    href,
    children,
    Icon,
    SubMenu,
    onClick,
    _blank,
    icon,
    ...props
}: MenuItemProps) {
    if (!Icon && icon) Icon = Icons[icon];
    if (SubMenu)
        return (
            <DropdownMenuSub {...props}>
                <DropdownMenuSubTrigger>
                    {Icon && (
                        <Icon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                    )}
                    {children}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>{SubMenu}</DropdownMenuSubContent>
            </DropdownMenuSub>
        );
    const Frag = () => (
        <DropdownMenuItem
            {...props}
            onClick={link || href ? null : (onClick as any)}
        >
            {Icon && (
                <Icon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            )}
            {children}
        </DropdownMenuItem>
    );
    if (link || href)
        return (
            <LinkableNode _blank={_blank} href={link || href}>
                <Frag />
            </LinkableNode>
        );
    return <Frag />;
}
export const MenuItem = RowActionMenuItem;
interface DeleteRowActionProps {
    row?: any;
    action;
    deleteKey?;
    menu?: boolean;
    disabled?: boolean;
    noRefresh?: boolean;
    noToast?: boolean;
    loadingText?: string;
}

export const DeleteRowAction = typedMemo(
    ({
        row,
        action,
        menu,
        noRefresh,
        deleteKey = "id",
        disabled,
        noToast,
        loadingText,
    }: DeleteRowActionProps) => {
        const [isPending, startTransition] = useTransition();
        const router = useRouter();
        const confirm = useBool();
        async function deleteOrder(e) {
            e.preventDefault();
            if (!confirm.bool) {
                confirm.setBool(true);
                setTimeout(() => {
                    confirm.setBool(false);
                }, 3000);
                return;
            }
            confirm.setBool(false);
            startTransition(async () => {
                if (noToast) {
                    if (action) {
                        await action(row?.[deleteKey]);
                        if (!noRefresh) router.refresh();
                    }
                } else
                    toast.promise(
                        async () => {
                            if (action) {
                                await action(row?.[deleteKey]);
                                if (!noRefresh) router.refresh();
                            }
                            // revalidatePath("");
                        },
                        {
                            loading: loadingText || "Deleting...",
                            success(data) {
                                return "Deleted Successfully";
                            },
                            error: "Unable to completed Delete Action",
                        },
                    );
            });
        }

        const Icone: any = confirm.bool
            ? Icons.Info
            : isPending
              ? Icons.spinner
              : Icons.Trash;
        if (!menu)
            return (
                <Button
                    variant="outline"
                    disabled={isPending || disabled}
                    className="flex h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    onClick={deleteOrder}
                >
                    <Icone
                        className={`${
                            isPending ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4"
                        }`}
                    />
                    <span className="sr-only">Delete</span>
                </Button>
            );
        return (
            <DropdownMenuItem
                disabled={isPending || disabled}
                className="text-red-500 hover:text-red-600"
                onClick={deleteOrder}
            >
                <Icone
                    className={`mr-2 ${
                        isPending ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4"
                    }`}
                />
                {confirm.bool ? "Sure?" : isPending ? "Deleting" : "Delete"}
                <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
        );
    },
);
