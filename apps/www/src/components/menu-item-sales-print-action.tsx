import { generateToken } from "@/actions/token-action";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { env } from "@/env.mjs";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { openLink } from "@/lib/open-link";
import { timeout } from "@/lib/timeout";
import { SalesPrintProps } from "@/utils/sales-print-utils";
import { Menu } from "@gnd/ui/custom/menu";
import { SalesPdfToken } from "@gnd/utils/tokenizer";
import { SalesPrintModes } from "@sales/constants";
import { addDays } from "date-fns";
import QueryString from "qs";

interface Props {
    pdf?: boolean;
    type: SalesType;
    onOpenMenu?;
    // salesId;
    slug?;
    salesIds?: number[];
}
export function MenuItemPrintAction(props: Props) {
    const loader = useLoadingToast();
    const { type, slug, pdf, onOpenMenu } = props;
    async function print(e, params?: SalesPrintProps) {
        if (props.salesIds) {
            e.preventDefault();
            const tok = await generateToken({
                salesIds: props.salesIds,
                expiry: addDays(new Date(), 7).toISOString(),
                mode: "order" as SalesPrintModes,

                // mode: props.type
            } satisfies SalesPdfToken);
            openLink(
                `api/download/sales`,
                {
                    token: tok,
                    preview: true,
                },
                true
            );
            onOpenMenu?.(false);
            return;
        }
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
                }/api/pdf/sales?${QueryString.stringify(query)}`
            ).then((res) => res.json());
            const link = document.createElement("a");
            // link.href = pdf.url;
            const downloadUrl = pdf.url.replace(
                "/fl_attachment/",
                `/fl_attachment:${query.slugs}/`
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
