import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { env } from "@/env.mjs";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { openLink } from "@/lib/open-link";
import { timeout } from "@/lib/timeout";
import { SalesPrintProps } from "@/utils/sales-print-utils";
import QueryString from "qs";

import { Menu } from "./(clean-code)/menu";

interface Props {
    pdf?: boolean;
    type: SalesType;
    onOpenMenu;
    salesId;
    slug;
}
export function MenuItemPrintAction(props: Props) {
    const loader = useLoadingToast();
    const { type, slug, salesId, pdf, onOpenMenu } = props;
    async function print(e, params?: SalesPrintProps) {
        const query = {
            slugs: slug,
            mode: type,
            preview: false,
            ...(params || {}),
        } as SalesPrintProps;
        if (!pdf) openLink(`/printer/sales`, query, true);
        else {
            e.preventDefault();
            loader.loading("Downloading...");
            const pdf = await fetch(
                `${
                    env.NEXT_PUBLIC_NODE_ENV == "production"
                        ? ""
                        : "https://gndprodesk.com"
                }/api/pdf/sales?${QueryString.stringify(query)}`,
            ).then((res) => res.json());
            const link = document.createElement("a");
            // link.href = pdf.url;
            const downloadUrl = pdf.url.replace(
                "/fl_attachment/",
                `/fl_attachment:${query.slugs}/`,
            ); //+ `/${query.slugs}.pdf`;

            link.href = downloadUrl;
            link.download = `${query.slugs}.pdf`;
            link.click();
            onOpenMenu?.(false);
        }
    }
    if (type == "quote")
        return (
            <Menu.Item
                icon={pdf ? "pdf" : "print"}
                onClick={(e) => {
                    print(e);
                }}
            >
                {pdf ? "PDF" : "Print"}
            </Menu.Item>
        );
    return (
        <Menu.Item
            icon={pdf ? "pdf" : "print"}
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
