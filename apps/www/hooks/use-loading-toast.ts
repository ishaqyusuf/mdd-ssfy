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

    return {
        setToastData,
        toastId,
        display(
            data: Pick<
                Toast,
                "description" | "title" | "duration" | "variant" | "action"
            >,
        ) {
            setToastData(data as any);
        },
    };
}
