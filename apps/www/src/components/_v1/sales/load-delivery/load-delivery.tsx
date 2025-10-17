"use client";

import { useEffect, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { useRouter } from "next/navigation";
import { _readyForDelivery } from "@/app/(v1)/(loggedIn)/sales/_actions/delivery/ready-for-delivery";
import { _startSalesDelivery } from "@/app/(v1)/(loggedIn)/sales/_actions/delivery/start-sales-delivery";
import Btn from "@/components/_v1/btn";
import PageHeader from "@/components/_v1/page-header";
import { useDataPage } from "@/lib/data-page-context";
import { openModal } from "@/lib/modal";
import { truckBackOrder } from "@/lib/sales/truck-backorder";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { ISalesOrder, ISalesOrderItem } from "@/types/sales";
import { IDataPage } from "@/types/type";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import OrderInspection from "./order-inspection";

export interface TruckLoaderForm {
    loader: {
        [orderSlug in string]: {
            items: ISalesOrderItem[];
            loadedItems: {
                [itemUid in string]: {
                    loadQty: string | number;
                    qty: number;
                    checked: boolean;
                };
            };
            truckLoadLocation: string;
            backOrders: {
                [itemUid in string]: {
                    backQty: number;
                    qty: number;
                    checked: boolean;
                    // loadQty: number;
                };
            };
            hasBackOrder?: Boolean;
        };
    };
    hasBackOrder?: Boolean;
    action: SalesInspectPageAction;
    truck;
}
export type SalesInspectPageAction = "ready" | "load" | "create";
export interface SalesDataPage {
    orders: ISalesOrder[];
    action: SalesInspectPageAction;
}
export default function LoadDelivery({ title }) {
    const [loadingTruck, startLoadingTruck] = useTransition();
    const dataPage = useDataPage<SalesDataPage>();

    const form = useForm<TruckLoaderForm>({
        defaultValues: {
            loader: {},
        },
    });
    useEffect(() => {
        setCurrentTab(dataPage?.data?.orders?.[0]?.slug);
    }, []);
    const router = useRouter();
    // useEffect(() => {},)
    function load() {
        startLoadingTruck(async () => {
            try {
                const data = truckBackOrder(form.getValues());
                data.action = dataPage?.data?.action;
                if (!data.hasBackOrder && dataPage.data?.action == "create") {
                    toast.error("No back order set");
                    return;
                }
                if (data.hasBackOrder) openModal("inspectBackOrder", data);
                else {
                    if (dataPage?.data?.action == "load") {
                        await _startSalesDelivery(data);
                        toast.success("Delivery Truck Loaded!");
                    } else {
                        await _readyForDelivery(data);
                        toast.success("Ready For Delivery!");
                    }
                    // router.replace("/sales/delivery");
                }
            } catch (error) {
                toast.error((error as Error).message);
            }
        });
    }
    const [currentTab, setCurrentTab] = useState<string>();
    useEffect(() => {
        let loader: any = {};
        dataPage?.data?.orders?.map((order) => {
            // loader[order.slug] = {};
            let orderLoader = {
                loadedItems: {},
                truckLoadLocation: "",
                items: [],
            };

            order?.items?.map((f) => {
                if (f.qty) {
                    orderLoader.loadedItems[f.meta.uid] = {
                        loadQty: f.qty,
                        qty: f.qty,
                        checked: true,
                    };
                }
            });
            orderLoader.items = order.items as any;
            loader[order.slug] = orderLoader;
        });
        form.reset({
            loader,
        });
        setCurrentTab(dataPage.data?.orders?.[0]?.slug);
    }, [dataPage]);
    function Tips({ color, info }) {
        return (
            <div className="inline-flex items-center space-x-2">
                <div className={cn(`h-3 w-6 rounded shadow `)}></div>
            </div>
        );
    }
    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between">
                <PageHeader title="Load Orders" />
                <div className="flex flex-1 justify-end space-x-2">
                    <Btn onClick={load} className="" isLoading={loadingTruck}>
                        {title}
                    </Btn>
                </div>
            </div>
            {dataPage?.data?.action == "ready" && (
                <div className="grid gap-2">
                    <Label>Truck Detail</Label>
                    <Input {...form.register(`truck`)} />
                </div>
            )}
            <Tabs
                className="grid w-full grid-cols-12 gap-2"
                defaultValue={currentTab}
            >
                <div className="col-span-3">
                    <TabsList className=" grid h-auto w-full justify-start max-sm:hidden">
                        {dataPage?.data?.orders?.map((order) => (
                            <TabsTrigger
                                key={order.slug}
                                className="flex flex-col"
                                value={order.slug}
                            >
                                <div className="">
                                    <p>{order.orderId}</p>
                                </div>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                {dataPage?.data?.orders?.map((order) => (
                    <TabsContent
                        key={order.slug}
                        className="col-span-9"
                        value={order.slug}
                    >
                        <OrderInspection form={form} order={order} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
