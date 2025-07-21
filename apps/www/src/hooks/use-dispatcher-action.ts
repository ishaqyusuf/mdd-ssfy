import {} from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { redirect } from "next/navigation";
import { createSalesAssignment } from "@/actions/create-sales-assignment";
import { createSalesDispatch } from "@/actions/create-sales-dispatch-action";
import { createSalesDispatchItems } from "@/actions/create-sales-dispatch-items-action";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import {
    SalesProgressFallback,
    salesProgressFallBackAction,
} from "@/actions/sales-progress-fallback";
import { submitSalesAssignment } from "@/actions/submit-sales-assignment";
import { useDispatch } from "@/components/sheets/sales-overview-sheet/context";
import { timeout } from "@/lib/timeout";
import { sum } from "@/lib/utils";
import { qtyMatrixDifference } from "@/utils/sales-control-util";
import { useSession } from "next-auth/react";
import z from "zod";

import { useLoadingToast } from "./use-loading-toast";
import { useSalesOverviewQuery } from "./use-sales-overview-query";

export function useDispatcherAction() {
    const ctx = useDispatch();
    const { form } = ctx;
    const { openForm, setOpenForm } = ctx;
    const onCancel = () => {
        setOpenForm(false);
    };
    const queryCtx = useSalesOverviewQuery();
    const session = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const [dispatching, startDispatching] = useTransition();
    const loader = useLoadingToast();
    return {
        handleDispatch: (formData: z.infer<typeof ctx.formSchema>) => {
            loader.loading("Creating dispatch...", {
                variant: "progress",
                progress: 5,
            });
            return startDispatching(async () => {
                let fallBackData: SalesProgressFallback = {
                    dispatchId: null,
                    submissionIds: [],
                    assignmentIds: [],
                    salesId: ctx?.data?.id,
                    salesUid: ctx?.data?.orderUid,
                    dispatchItemIds: [],
                };
                const dispatchables = ctx.data?.dispatchables
                    .map((item) => {
                        const itemData = formData?.itemData?.items?.[item.uid];
                        let qty = itemData?.qty;
                        let handle = false;
                        if (qty?.lh || qty?.rh) {
                            qty.qty = sum([qty.lh, qty.rh]);
                            handle = true;
                        }
                        return {
                            item,
                            itemData,
                            qty,
                        };
                    })
                    .filter((a) => a?.qty?.qty);
                try {
                    const dispatch = await createSalesDispatch({
                        deliveryDate: formData.delivery?.deliveryDate,
                        deliveryMode: formData?.delivery?.deliveryMode,
                        orderId: ctx.data?.id,
                        driverId: Number(formData?.delivery?.driverId) || null,
                        status: formData?.delivery?.status,
                    });
                    fallBackData.dispatchId = dispatch.id;

                    loader.description("Dispatch Created!", {
                        progress: dispatchables?.length ? 7 : 90,
                    });

                    // let itemProgress = 70
                    let itemProgress = Math.floor(70 / dispatchables.length);
                    // await Promise.all(
                    // dispatchables?.map(
                    let index = -1;
                    for (const dispatchable of dispatchables)
                        await (async ({ item, itemData, qty }) => {
                            index++;

                            const chunkProgress = Math.floor(itemProgress / 4);
                            const baseProgress = 7 + index * itemProgress;
                            loader.loading(
                                `Preparing dispatch items... ${index + 1} of ${dispatchables.length}`,
                                {
                                    progress: baseProgress + chunkProgress * 1,
                                },
                            );
                            const handle = qty.lh || qty.rh;
                            const baseTitle = `Creating dispatch item [${item.title} - ${qty.qty}]`;
                            loader.description(`${baseTitle} | 10%`);
                            const createDispatchItem = async (
                                qty,
                                submissionId,
                            ) => {
                                const resp = await createSalesDispatchItems({
                                    deliveryId: dispatch.id,
                                    deliveryMode: dispatch.deliveryMode,
                                    orderId: dispatch.salesOrderId,
                                    status: dispatch.status as any,
                                    items: {
                                        ".": {
                                            qty,
                                            available: qty,
                                            itemUid: item.uid,
                                            orderItemId: item.itemId,
                                            submissionId: submissionId,
                                            status: dispatch.status as any,
                                            totalItemQty: item.totalQty,
                                        },
                                    },
                                });
                                loader.description(`${baseTitle} | 100%`);
                                // fallBackData.dispatchItemIds.push(resp.)
                            };
                            const createAssignment = async (qty) => {
                                // loader.description(
                                //     `Creating assignment... [${item.title} - ${qty.qty}]`,
                                // );

                                loader.description(`${baseTitle} | 20%`);
                                const resp = await createSalesAssignment({
                                    itemsTotal: item.totalQty,
                                    qty,
                                    pending: qty,
                                    itemUid: item.uid,
                                    salesId: ctx.data?.id,
                                    salesDoorId: item.doorId,
                                    salesItemId: item.itemId,
                                    unitLabor: item.unitLabor,
                                });
                                loader.description(`${baseTitle} | 40%`);

                                fallBackData.assignmentIds.push(resp.id);

                                return resp.id;
                            };
                            const submitAssigments = async (
                                qty,
                                assignmentId,
                            ) => {
                                loader.description(`${baseTitle} | 50%`);
                                // loader.description(
                                //     `Submitting assignment... [${item.title} - ${qty.qty}]`,
                                // );
                                const resp = await submitSalesAssignment({
                                    assignmentId,
                                    qty,
                                    pending: qty,
                                    itemUid: item.uid,
                                    salesId: ctx.data?.id,
                                    itemId: item.itemId,
                                    submittedById: session?.data?.user?.id,
                                });
                                loader.description(`${baseTitle} | 60%`);

                                fallBackData.submissionIds.push(resp.id);
                                return resp.id;
                            };
                            // await Promise.all(
                            //     item.dispatchStat.map(
                            for (const ds of item.dispatchStat)
                                await (async (ds) => {
                                    if (qty.qty == 0) return;
                                    await timeout(1500);
                                    const pickQty = { ...ds.available };
                                    const remaining = qtyMatrixDifference(
                                        qty,
                                        ds.available,
                                    );
                                    if (handle) {
                                        if (remaining.lh >= 0) {
                                            qty.lh = remaining.lh;
                                        } else {
                                            qty.lh = 0;
                                            pickQty.lh = qty.lh;
                                        }
                                        if (remaining.rh >= 0) {
                                            qty.rh = remaining.rh;
                                        } else {
                                            qty.rh = 0;
                                            pickQty.rh = qty.rh;
                                        }
                                        pickQty.qty = sum([
                                            pickQty.rh,
                                            pickQty.lh,
                                        ]);
                                        qty.qty = sum([qty.rh, qty.lh]);
                                    } else {
                                        if (remaining.qty >= 0) {
                                            qty.qty = remaining.qty;
                                        } else {
                                            qty.qty = 0;
                                            pickQty.qty = qty.qty;
                                        }
                                    }
                                    // loader.description(
                                    //     `Creating dispatch item [${item.title} - ${qty.qty}]`,
                                    // );
                                    if (pickQty.qty) {
                                        loader.description(
                                            `${baseTitle} | 60%`,
                                        );
                                        await createDispatchItem(
                                            pickQty,
                                            ds.submissionId,
                                        );
                                    }
                                })(ds);
                            if (qty.qty) {
                                const assignmentId =
                                    await createAssignment(qty);
                                const submitId = await submitAssigments(
                                    qty,
                                    assignmentId,
                                );

                                loader.description(`${baseTitle} | 60%`);
                                await createDispatchItem(qty, submitId);
                            }
                            // ),
                            // );
                            return item;
                        })(dispatchable);

                    // ),
                    // );
                    loader.description("Finalizing....", {
                        progress: 98,
                    });
                    if (fallBackData.dispatchId)
                        await resetSalesStatAction(
                            fallBackData.salesId,
                            fallBackData.salesUid,
                        );
                    // throw new Error("BREAK!");
                    loader.success("Completed!");
                    setOpenForm(false);
                    queryCtx._refreshToken();
                } catch (error) {
                    loader.error("Unable to complete", {
                        description: error?.message,
                    });
                    await salesProgressFallBackAction(fallBackData);
                }
            });
        },
    };
}
