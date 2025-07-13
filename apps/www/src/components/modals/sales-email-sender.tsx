import { useSalesEmailSender } from "@/hooks/use-sales-email-sender";
import { useTRPC } from "@/trpc/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Progress } from "@gnd/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export function SalesEmailSenderModal({}) {
    const { params, setParams } = useSalesEmailSender();
    const [progress, setProgress] = useState(0);

    const trpc = useTRPC();
    const opened =
        !!params.sendEmailSalesNos?.length ||
        !!params.sendEmailSalesIds?.length;
    const { data } = useQuery(
        trpc.emails.getSalesEmailMeta.queryOptions(
            {
                salesIds: params.sendEmailSalesIds?.length
                    ? params.sendEmailSalesIds
                    : undefined,
                salesNos: params.sendEmailSalesNos?.length
                    ? params.sendEmailSalesNos
                    : undefined,
            },
            {
                enabled: opened,
            },
        ),
    );
    const initialized = useRef(false);
    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            return;
        }
        if (!data) return;
    }, [data]);
    return (
        <Dialog open={opened}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sales Email</DialogTitle>
                    <DialogDescription>Loading Sales Data...</DialogDescription>
                </DialogHeader>
                <div>
                    <Progress value={progress} className="w-full h-0.5" />
                </div>
            </DialogContent>
        </Dialog>
    );
}

