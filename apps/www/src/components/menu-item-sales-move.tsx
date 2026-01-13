import Link from "@/components/link";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { moveOrderUseCase } from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import { env } from "@/env.mjs";
import { useLoadingToast } from "@/hooks/use-loading-toast";

import { Copy, Move } from "lucide-react";

import { ToastAction } from "@gnd/ui/toast";

import { Menu } from "./(clean-code)/menu";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";

interface Props {
    type: SalesType;
    onOpenMenu;

    slug;
}
export function MenuItemSalesMove(props: Props) {
    const loader = useLoadingToast();
    const { type, slug, onOpenMenu } = props;
    const sq = useSalesQueryClient();
    async function _moveSales(e) {
        e.preventDefault();
        loader.loading("Moving...");
        const orderId = slug;
        const to = type == "order" ? "quote" : "order";
        const result = await moveOrderUseCase(orderId, to);
        if (to == "order") {
            await resetSalesStatAction(result.id, result.slug);
        }
        if (result.link) {
            loader.success(`Moved to ${to}`, {
                duration: 3000,
                action: (
                    <ToastAction altText="Open" asChild>
                        <Link href={result.link}>Open</Link>
                    </ToastAction>
                ),
            });
            sq.invalidate.salesList();
            sq.invalidate.quoteList();
            onOpenMenu?.(false);
        }
    }
    return (
        <Menu.Item onClick={_moveSales} Icon={Move}>
            {type == "order" ? "Move to Quote" : "Move to Sales"}
        </Menu.Item>
    );
}
