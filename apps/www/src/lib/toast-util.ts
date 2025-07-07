import { toast } from "sonner";
import { timeout } from "./timeout";

export async function toastArrayAction<T>({
    items,
    serverAction,
    _error,
    loading,
}: {
    items: T[];
    serverAction;
    loading?(item: T);
    _error?(item: T);
    // error:(item);
}) {
    async function updateCosts(index) {
        //
        const item = items[index];
        // console.log(item);
        if (item)
            toast.promise(
                async () => {
                    await serverAction(item);
                    await timeout(1000);
                    return true;
                },
                {
                    error: _error?.(item) || "Error",
                    loading: loading?.(item) || "Loading",
                    success: (data) => {
                        updateCosts(index + 1);
                        return `Updated`;
                    },
                }
            );
    }
    await updateCosts(0);
}
