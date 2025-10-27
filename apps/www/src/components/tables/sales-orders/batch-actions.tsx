import {
    BatchAction,
    BatchBtn,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useMemo } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/custom/data-table/index";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { DropdownMenu } from "@gnd/ui/composite";
import { Menu } from "@gnd/ui/custom/menu";
import { generateToken } from "@/actions/token-action";
import { addDays } from "date-fns";
import { SalesPrintModes } from "@sales/constants";
import { SalesPdfToken } from "@gnd/utils/tokenizer";
import { openLink } from "@/lib/open-link";

export function BatchActions({}) {
    const ctx = useTable();
    const slugs = useMemo(() => {
        return ctx.selectedRows?.map((r) => (r.original as any)?.orderId);
    }, [ctx.selectedRows]);

    if (!ctx.selectedRows?.length) return null;
    const gen = async () => {
        const salesIds = ctx.selectedRows?.map((c) => c?.original?.id);
        const tok = await generateToken({
            salesIds,
            expiry: addDays(new Date(), 7).toISOString(),
            mode: "order" as SalesPrintModes,
        } satisfies SalesPdfToken);
        openLink(
            `/api/download/sales`,
            {
                token: tok,
                preview: true,
            },
            true
        );
    };
    return (
        <BatchAction>
            <BatchBtn
                icon="print"
                menu={
                    <>
                        <MenuItemPrintAction
                            slug={slugs.join(",")}
                            type="order"
                        />
                        <MenuItemPrintAction
                            slug={slugs.join(",")}
                            type="quote"
                            pdf
                        />
                        <DropdownMenu.Separator />
                        <DropdownMenu.Group>
                            <DropdownMenu.Label>V2</DropdownMenu.Label>
                            <Menu.Item
                                icon="print"
                                SubMenu={
                                    <>
                                        <Menu.Item
                                            onClick={(e) => {
                                                e.preventDefault();
                                                gen();
                                            }}
                                        >
                                            Customer Copy
                                        </Menu.Item>
                                    </>
                                }
                            >
                                Print
                            </Menu.Item>
                            <Menu.Item icon="pdf">PDF</Menu.Item>
                        </DropdownMenu.Group>
                    </>
                }
            >
                Print
            </BatchBtn>
            <BatchBtn
                icon="Email"
                menu={
                    <>
                        <SalesEmailMenuItem
                            asChild
                            salesType="order"
                            orderNo={slugs}
                        />
                    </>
                }
            >
                Email
            </BatchBtn>
            <BatchDelete
                onClick={async () => {
                    await deleteSalesByOrderIds(slugs);
                }}
            />
        </BatchAction>
    );
}

