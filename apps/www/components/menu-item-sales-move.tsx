import Link from "next/link";
import {
    copySalesUseCase,
    moveOrderUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { env } from "@/env.mjs";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { openLink } from "@/lib/open-link";
import { timeout } from "@/lib/timeout";
import { SalesPrintProps } from "@/utils/sales-print-utils";
import { salesFormUrl } from "@/utils/sales-utils";
import { Copy, Move } from "lucide-react";
import QueryString from "qs";

import { ToastAction } from "@gnd/ui/toast";

import { revalidateTable } from "./(clean-code)/data-table/use-infinity-data-table";
import { Menu } from "./(clean-code)/menu";

interface Props {
    type: SalesType;
    onOpenMenu;

    slug;
}
export function MenuItemSalesMove(props: Props) {
    const loader = useLoadingToast();
    const { type, slug, onOpenMenu } = props;
    async function _moveSales(e) {
        e.preventDefault();
        loader.loading("Moving...");
        const orderId = slug;
        const to = type == "order" ? "quote" : "order";
        const result = await moveOrderUseCase(orderId, to);

        if (result.link) {
            loader.success(`Moved to ${to}`, {
                duration: 3000,
                action: (
                    <ToastAction altText="Open" asChild>
                        <Link href={result.link}>Open</Link>
                    </ToastAction>
                ),
            });
            revalidateTable();
            onOpenMenu?.(false);
        }
    }
    return (
        <Menu.Item onClick={_moveSales} Icon={Move}>
            {type == "order" ? "Move to Quote" : "Move to Sales"}
        </Menu.Item>
    );
}
