import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { __revalidatePath } from "@/app/(v1)/_actions/_revalidate";
import { Menu } from "@/components/(clean-code)/menu";
import { _modal } from "@/components/common/modal/provider";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { copySalesUseCase } from "../../../use-case/sales-book-form-use-case";
import { salesOverviewStore } from "../store";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";

export function CopyMenuAction({}) {
    const ctx = salesOverviewStore();
    const salesQuery = useSalesQueryClient();

    async function copyAs(as: SalesType) {
        const orderId = ctx.overview.orderId;
        const result = await copySalesUseCase(orderId, as);

        if (result.link) {
            toast.success(`Copied as ${as}`, {
                action: {
                    label: "edit",
                    onClick(event) {
                        openLink(salesFormUrl(as, result.data?.slug), {}, true);
                    },
                },
            });
            as == "order"
                ? salesQuery.invalidate.salesList()
                : salesQuery.invalidate.quoteList();
        }
    }
    return (
        <Menu.Item
            Icon={Copy}
            SubMenu={
                <>
                    <Menu.Item onClick={() => copyAs("order")} icon="orders">
                        Order
                    </Menu.Item>
                    <Menu.Item onClick={() => copyAs("quote")} icon="estimates">
                        Quote
                    </Menu.Item>
                </>
            }
        >
            Copy As
        </Menu.Item>
    );
}
