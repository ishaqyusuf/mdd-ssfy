import { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { SalesPrintProps } from "@/utils/sales-print-utils";
import { Menu } from "@gnd/ui/custom/menu";
import { MessageCircle } from "lucide-react";
import { newSalesUrls } from "@/lib/sales";

interface Props {
    pdf?: boolean;
    type: SalesType;
    onOpenMenu?;
    // salesId;
    // slug?;
    share?: boolean;
    salesIds?: number[];
}
export function MenuItemPrintAction(props: Props) {
    const loader = useLoadingToast();
    const {
        type,
        // slug,
        pdf,
        onOpenMenu,
    } = props;
    async function print(e, params?: SalesPrintProps) {
        const sp = newSalesUrls();
        if (props.salesIds) {
            e.preventDefault();
            await sp.generateTokenSalesIds(
                props.salesIds,
                params?.mode || type,
            );
            if (props.share) {
                await sp.share(
                    `Hello! download your sales ${sp.shareUrl}`,
                    `+234 8186877306`,
                );
                return;
            }
            sp.openPrintLink(props.pdf);
            onOpenMenu?.(false);
            return;
        }
    }
    if (props.share) {
        return (
            <Menu.Item
                Icon={MessageCircle}
                onClick={(e) => {
                    print(e);
                }}
            >
                Share
            </Menu.Item>
        );
    }
    if (type == "quote")
        return (
            <Menu.Item
                icon={pdf ? "pdf" : "print"}
                onClick={(e) => {
                    print(e, {
                        mode: "quote",
                    });
                }}
            >
                {pdf ? "PDF" : "Print"}
            </Menu.Item>
        );
    return (
        <Menu.Item
            icon={pdf ? "pdf" : "print"}
            shortCut={!props.salesIds?.length || <>New</>}
            SubMenu={
                <>
                    <Menu.Item
                        icon="orders"
                        onClick={(e) => {
                            print(e, {
                                mode: "order-packing",
                                dispatchId: "all",
                            });
                        }}
                    >
                        Order & Packing
                    </Menu.Item>
                    <Menu.Item
                        icon="orders"
                        onClick={(e) => {
                            print(e);
                        }}
                    >
                        Order
                    </Menu.Item>
                    <Menu.Item
                        icon="production"
                        onClick={(e) => {
                            print(e, {
                                mode: "production",
                            });
                        }}
                    >
                        Production
                    </Menu.Item>
                </>
            }
        >
            {pdf ? "PDF" : "Print"}
        </Menu.Item>
    );
}
