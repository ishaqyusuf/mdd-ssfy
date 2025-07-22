import { resetSalesStatAction } from "@/actions/reset-sales-stat";
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
    copyAs;
}
export function MenuItemSalesCopy(props: Props) {
    const loader = useLoadingToast();
    const { type, slug, onOpenMenu } = props;

    return (
        <Menu.Item
            Icon={Copy}
            SubMenu={
                <>
                    <Menu.Item
                        onClick={(e) => {
                            e.preventDefault();
                            props?.copyAs("order");
                        }}
                        icon="orders"
                    >
                        Order
                    </Menu.Item>
                    <Menu.Item
                        onClick={(e) => {
                            e.stopPropagation();
                            props?.copyAs("quote");
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
