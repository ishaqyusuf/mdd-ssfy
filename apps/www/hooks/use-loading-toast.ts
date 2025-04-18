import { useEffect, useState } from "react";

import { useToast } from "@gnd/ui/use-toast";

type Toast = Parameters<ReturnType<typeof useToast>["update"]>[1];
export function useLoadingToast() {
    const { toast, dismiss, update } = useToast();
    const [toastData, setToastData] = useState<Toast>(null);
    const [toastId, setToastId] = useState(null);
    useEffect(() => {
        if (!toastData) return;
        if (!toastId) {
            const { id } = toast(toastData);
            setToastData(null);
            setToastId(id);
        } else {
            update(toastId, toastData);
            setToastData(null);
        }
    }, [toastId, toastData]);
    type Data = Pick<
        Toast,
        "description" | "title" | "duration" | "variant" | "action"
    >;
    const ctx = {
        setToastData,
        toastId,
        clearToastId() {
            setToastId(null);
        },
        error(description, data: Data = {}) {
            ctx.display({
                description,
                duration: 1500,
                variant: "error",
                ...data,
            });
            ctx.clearToastId();
        },
        success(description, data: Data = {}) {
            ctx.display({
                description,
                duration: 1500,
                variant: "success",
                ...data,
            });
            ctx.clearToastId();
        },
        display(data: Data) {
            setToastData(data as any);
        },
    };
    return ctx;
}
