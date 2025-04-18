import { useTransition } from "react";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";

export function GeneralFooter({ data }) {
    const [loading, startTransition] = useTransition();
    async function reset() {
        startTransition(async () => {
            try {
                const resp = await resetSalesStatAction(data?.orderNo);
                toast.success("Reset complete");
            } catch (error) {
                toast.error("Unable to complete");
            }
        });
    }
    return (
        <div className="fixed bottom-0 right-[1/2] p-2 py-8">
            <span>abc</span>
            <Button onClick={reset} disabled={loading}>
                Reset
            </Button>
        </div>
    );
}
