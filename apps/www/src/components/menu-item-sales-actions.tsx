import { SalesType } from "@sales/types";
import { SalesEmailMenuItem } from "./sales-email-menu-item";
import { MenuItemPrintAction } from "./menu-item-sales-print-action";
import { MenuItemSalesCopy } from "./menu-item-sales-copy";
import { MenuItemSalesMove } from "./menu-item-sales-move";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { copySalesUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { ToastAction } from "@gnd/ui/toast";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";

type Props = {
    slug: string;
    id: number;
    setMenuOpen?;
    type?: SalesType;
};

export function MenuItemSalesActions(props: Props) {
    const sq = useSalesQueryClient();
    const loader = useLoadingToast();
    async function copyAs(as: SalesType) {
        loader.loading("Copying...");
        // const orderId = slug;
        const result = await copySalesUseCase(props?.slug, as);
        try {
            if (as == "order")
                await resetSalesStatAction(result.id, props.slug);
        } catch (error) {}
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
            as == "order"
                ? sq.invalidate.salesList()
                : sq.invalidate.quoteList();
        }
    }
    return (
        <>
            <SalesEmailMenuItem salesId={props?.id} salesType={props?.type} />
            <MenuItemPrintAction
                salesId={props?.id}
                slug={props?.slug}
                onOpenMenu={props.setMenuOpen}
                type={props?.type}
            />
            <MenuItemPrintAction
                salesId={props?.id}
                slug={props?.slug}
                onOpenMenu={props.setMenuOpen}
                type={props?.type}
                pdf
            />
            <MenuItemSalesCopy
                slug={props?.slug}
                onOpenMenu={props.setMenuOpen}
                type={props?.type}
                copyAs={copyAs}
            />
            <MenuItemSalesMove
                slug={props?.slug}
                onOpenMenu={props.setMenuOpen}
                type={props?.type}
            />
        </>
    );
}
