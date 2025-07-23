import Link from "@/components/link";
import { Menu } from "@/components/(clean-code)/menu";
import { _modal } from "@/components/common/modal/provider";
import { Move } from "lucide-react";

import { ToastAction } from "@gnd/ui/toast";
import { useToast } from "@gnd/ui/use-toast";

import { moveOrderUseCase } from "../../../use-case/sales-book-form-use-case";
import { salesOverviewStore } from "../store";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";

export function MoveMenuAction({}) {
    const ctx = salesOverviewStore();
    const type = ctx?.overview?.type;
    // const isDyke = ctx.overview.dyke;
    const { toast, dismiss, update } = useToast();
    const sq = useSalesQueryClient();
    async function _moveSales() {
        const to = type == "order" ? "quote" : "order";
        const { id } = toast({
            title: `Moving ${type} to ${to}`,
            duration: Number.POSITIVE_INFINITY,
            variant: "spinner",
        });
        const resp = await moveOrderUseCase(ctx.overview.orderId, to);

        sq.invalidate.salesList();
        sq.invalidate.quoteList();
        if (resp.error) {
            update(id, {
                variant: "destructive",
                title: resp.error,
                duration: 3000,
                id,
            });
            return;
        }
        _modal.close();
        update(id, {
            variant: "success",
            title: `Moved to ${to}`,
            id,
            duration: 6000,
            action: (
                <ToastAction altText="Open" asChild>
                    <Link href={resp.link}>Open</Link>
                </ToastAction>
            ),
        });
    }
    return (
        <Menu.Item onClick={_moveSales} Icon={Move}>
            {type == "order" ? "Move to Quote" : "Move to Sales"}
        </Menu.Item>
    );
}
