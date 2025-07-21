import { createContext, useEffect } from "react";
import Link from "@/components/link";
import { Icons } from "@/components/_v1/icons";
import { SecondaryTabSheet } from "@/components/(clean-code)/data-table/item-overview-sheet";
import { Menu } from "@/components/(clean-code)/menu";
import { Progress } from "@/components/(clean-code)/progress";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { qtyDiff } from "../../../data-access/dto/sales-item-dto";
import { updateDispatchStatusUseCase } from "../../../use-case/sales-dispatch-use-case";
import { dispatchStatusList } from "../../../utils/contants";
import Badge from "../components/badge";
import { useItemProdViewContext } from "../production/use-hooks";

let context = null;
type Ctx = ReturnType<typeof useShippingOverviewCtx>;
const useShippingOverview = (): Ctx => {
    const ctx = useItemProdViewContext();

    return useShippingOverviewCtx(ctx);
};
const useShippingOverviewCtx = (
    ctx: ReturnType<typeof useItemProdViewContext>,
) => {
    // const ctx = useItemProdViewContext();
    // if (_) return _;
    if (context?.id == ctx?.mainCtx?.tabData?.payloadSlug)
        return context as typeof resp;
    const { mainCtx, item, payload } = ctx;
    const slug = mainCtx.tabData?.payloadSlug;
    const shippingOverview = mainCtx.overview?.shipping;
    const shipping = mainCtx.overview?.shipping?.list?.find(
        (ls) => ls.id == slug,
    );
    if (!shipping) {
        toast.error("Shipping not found");
        mainCtx.closeSecondaryTab();
        context = null;
        return null;
    }
    // let _items = shipping?.items?.map(shippingItem => {

    // })
    let items = shippingOverview.dispatchableItemList
        .map((item) => {
            const deliveries = shipping.items.filter(
                (i) =>
                    i.itemId == item.id &&
                    item.assignments.some((a) =>
                        a.submissions.some((s) => s.id == i.submissionId),
                    ),
            );

            const [d1, d2, ...rest] = deliveries;

            let qty = d2 ? qtyDiff(d1.qty, d2.qty, true) : d1?.qty;
            rest?.map((r) => {
                qty = qtyDiff(qty, r.qty, true);
            });

            return {
                item,
                deliveries,
                qty,
            };
        })
        .filter((data) => data.qty?.total);
    const resp = {
        shipping,
        items,
        id: slug,
        mainCtx,
    };
    context = resp;
    return resp;
};
const ShippingOverviewCtx = createContext<
    ReturnType<typeof useShippingOverviewCtx>
>(null as any);

export function ShippingOverview({}) {
    const ctx = useShippingOverview();
    const { mainCtx, shipping } = ctx;
    useEffect(() => {}, []);
    if (!ctx || !ctx?.shipping?.id) return null;
    async function updateProgress(progress) {
        try {
            const resp = await updateDispatchStatusUseCase(
                shipping.id,
                progress,
            );
            toast.success("Dispatch updated");
            ctx.mainCtx.refresh();
            // ctx.mainCtx.rowChanged();
        } catch (error) {
            toast.error(error.message);
        }
    }
    return (
        <ShippingOverviewCtx.Provider value={ctx}>
            <div className="secondary-tab flex flex-col">
                <SecondaryTabSheet
                    title={shipping.title}
                    onBack={() => {
                        mainCtx.closeSecondaryTab();
                        context = null;
                    }}
                >
                    <Button asChild size="sm" className="h-8">
                        <Link
                            href={`/printer/sales?slugs=${mainCtx.overview.orderId}&mode=packing list&dispatchId=${shipping.id}`}
                            target="_blank"
                        >
                            <Icons.print className="mr-2 size-4" />
                            <span>Print</span>
                        </Link>
                    </Button>
                </SecondaryTabSheet>
                <ScrollArea
                    // className="w-[600px] h-[80vh] flex flex-col"
                    className="o-scrollable-content-area"
                >
                    <div className="border-b p-4">
                        <div className="">
                            <Menu
                                Trigger={
                                    <Button variant="outline">
                                        <div className="flex items-center gap-2">
                                            <Label>Status:</Label>
                                            <Progress.Status>
                                                {shipping.status || "queue"}
                                            </Progress.Status>
                                        </div>
                                    </Button>
                                }
                            >
                                {dispatchStatusList.map((status) => (
                                    <Menu.Item
                                        key={status}
                                        onClick={() => updateProgress(status)}
                                    >
                                        <Progress.Status>
                                            {status}
                                        </Progress.Status>
                                    </Menu.Item>
                                ))}
                                {/* <Menu.Item>Queue</Menu.Item>
                                <Menu.Item>In Progress</Menu.Item>
                                <Menu.Item>Completed</Menu.Item>
                                <Menu.Item>Cancelled</Menu.Item> */}
                            </Menu>
                        </div>
                    </div>
                    <div className="sm:p-8s px-4">
                        {ctx.items?.map(({ item, qty, deliveries }, index) => (
                            <div
                                className="rounded border-b bg-white p-2"
                                key={index}
                            >
                                <div className="flex">
                                    <span className="text-sm font-semibold">
                                        {item.title}{" "}
                                    </span>
                                    <div className="flex-1"></div>
                                    <Badge
                                        value={item.swing}
                                        variant="secondary"
                                    />
                                    <Badge
                                        value={item.size}
                                        variant="secondary"
                                    />
                                </div>
                                <div>
                                    {qty.rh || qty.lh ? (
                                        <>
                                            <Badge
                                                variant="secondary"
                                                suffix="RH"
                                                value={qty.rh}
                                            />
                                            <Badge
                                                variant="secondary"
                                                suffix="LH"
                                                value={qty.lh}
                                            />
                                        </>
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            prefix="Qty"
                                            value={qty.qty}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </ShippingOverviewCtx.Provider>
    );
}
