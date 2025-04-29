import { copySalesUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { env } from "@/env.mjs";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { openLink } from "@/lib/open-link";
import { timeout } from "@/lib/timeout";
import { SalesPrintProps } from "@/utils/sales-print-utils";
import { salesFormUrl } from "@/utils/sales-utils";
import { Copy } from "lucide-react";
import QueryString from "qs";

import { ToastAction } from "@gnd/ui/toast";

import { revalidateTable } from "./(clean-code)/data-table/use-infinity-data-table";
import { Menu } from "./(clean-code)/menu";

interface Props {
    type: SalesType;
    onOpenMenu;

    slug;
}
export function MenuItemSalesCopy(props: Props) {
    const loader = useLoadingToast();
    const { type, slug, onOpenMenu } = props;
    async function copyAs(as: SalesType) {
        loader.loading("Copying...");
        const orderId = slug;
        const result = await copySalesUseCase(orderId, as);

        if (result.link) {
            loader.success(`Copied as ${as}`, {
                duration: 3000,
                action: (
                    <ToastAction
                        onClick={(e) => {
                            openLink(
                                salesFormUrl(as, result.data?.slug),
                                {},
                                true,
                            );
                        }}
                        altText="edit"
                    >
                        Edit
                    </ToastAction>
                ),
            });
            revalidateTable();
            onOpenMenu?.(false);
        }
    }
    return (
        <Menu.Item
            Icon={Copy}
            SubMenu={
                <>
                    <Menu.Item
                        onClick={(e) => {
                            e.preventDefault();
                            copyAs("order");
                        }}
                        icon="orders"
                    >
                        Order
                    </Menu.Item>
                    <Menu.Item
                        onClick={(e) => {
                            e.stopPropagation();
                            copyAs("quote");
                        }}
                        icon="estimates"
                    >
                        Quote
                    </Menu.Item>
                </>
            }
        >
            Copy As
        </Menu.Item>
    );
}
