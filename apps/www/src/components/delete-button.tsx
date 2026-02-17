import {
    invalidateQuery,
    RouteInput,
    Routes,
} from "@/hooks/use-invalidate-query";
import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/custom/icons";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { ComponentProps, useEffect, useState } from "react";

interface Props<R extends Routes> {
    route: R;
    input?: RouteInput<R>;
    onDelete?: () => void;
    disabled?: boolean;
    withText?: boolean;
    // size?: ComponentProps<typeof SubmitButton>["size"];
    size?: "xs" | "sm" | "lg";
}
export function DeleteButton<R extends Routes>(props: Props<R>) {
    const [ns, proc] = props.route.split(".") as [string, string];

    const [confirm, setConfirm] = useState(false);
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (confirm) {
            timeout = setTimeout(() => {
                setConfirm(false);
            }, 3000);
        }
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [confirm]);
    const { mutate: deleteItem, isPending: isDeleting } = useMutation(
        useTRPC()[ns][proc].mutationOptions({
            onSuccess() {
                // invalidateQuery(props.route, props.input);
                props?.onDelete();
            },
            onError(error, variables, onMutateResult, context) {
                console.log("Failed to delete item", {
                    error,
                    variables,
                    onMutateResult,
                    context,
                });
            },
            meta: {
                toastTitle: {
                    error: "Failed to delete item",
                    success: "Item deleted",
                    loading: "Deleting item...",
                    show: true,
                },
            },
        }),
    );
    const size = !props.withText
        ? props.size
            ? `icon-${props.size}`
            : "icon"
        : props.size || "sm";
    const Icon = confirm ? Icons.Warn : Icons.trash;
    return (
        <SubmitButton
            // variant="destructive"
            size={size as any}
            disabled={props.disabled || isDeleting}
            onClick={async () => {
                if (!confirm) {
                    setConfirm(true);
                    return;
                }
                deleteItem(props.input as any);
                invalidateQuery(props.route, props.input);
            }}
            className={cn(
                confirm
                    ? "text-orange-600 bg-orange-100 hover:bg-orange-200 focus:ring-orange-500/50"
                    : "text-destructive/80 bg-destructive/10 hover:bg-destructive/20 focus:ring-destructive/50",
            )}
            isSubmitting={isDeleting}
            variant={"secondary"}
        >
            <div className="flex gap-2 items-center">
                <Icon className="size-4" />
                {props.withText && "Delete"}
            </div>
        </SubmitButton>
    );
}

