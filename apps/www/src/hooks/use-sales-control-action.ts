import { useEffect, useId } from "react";
import {
    _createSalesAssignmentAction,
    createSalesAssignmentAction,
} from "@/actions/create-sales-assignment";
import { createSalesDispatchAction } from "@/actions/create-sales-dispatch-action";
import { createSalesDispatchItemsAction } from "@/actions/create-sales-dispatch-items-action";
import {
    createAssignmentSchema,
    createSalesDispatchItemsSchema,
    createSalesDispatchSchema,
    createSubmissionSchema,
} from "@/actions/schema";
import { submitSalesAssignmentAction } from "@/actions/submit-sales-assignment";
import { generateRandomString } from "@/lib/utils";
import { Qty } from "@/utils/sales-control-util";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import z from "zod";

import { useLoadingToast } from "./use-loading-toast";
import { useSalesOverviewQuery } from "./use-sales-overview-query";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { sum } from "@gnd/utils";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { qtyMatrixDifference } from "@sales/utils/sales-control";

type SubmitSchema = z.infer<typeof createSubmissionSchema>;
type SalesDispatch = z.infer<typeof createSalesDispatchSchema>;
type SalesDispatchItem = z.infer<typeof createSalesDispatchItemsSchema>;
interface Props {
    onFinish?;
}
interface FormData {
    actionIds: string[];
    currentActionId: string;
    nextTriggerUID?: string;
    error?: string;
    actions: {
        assignmentActions: {
            [itemUid in string]: {
                assignmentId: number;
                status?: string;
                uid: string;
                meta?: any;
                submitTok: string;
            };
        };
        submissionMeta: {
            [itemUid in string]: SubmitSchema;
        };
        submissionActions: {
            [itemUid in string]: {
                meta: SubmitSchema;
                status: "success" | "error";
            };
        };
        dispatch?: Partial<SalesDispatch>;
        dispatchItems: {
            [itemUid in string]: {
                // submissionId?: number;
                dispatchId?: number;
                // note?: string;
                // qty?: Qty;
                // status?;
                // orderItemId?;
                // itemUid?;
            } & SalesDispatchItem["items"][number];
        };
    };
    fallbacks: {
        [k in "submission" | "dispatch" | "assignment" | "dispatchItem"]: {
            [id in any]: boolean;
        };
    };
}
interface PackProps {
    qty: Qty;
    dispatchId;
    dispatchable: RouterOutputs["dispatch"]["dispatchOverview"]["dispatchItems"][number]["dispatchable"];
    salesId;
    note?: string;
}
export function useSalesControlAction({ onFinish }) {
    const form = useForm<FormData>({
        defaultValues: {
            actions: null,
            fallbacks: {
                dispatch: {},
                submission: {},
                assignment: {},
                dispatchItem: {},
            },
        },
    });
    const loader = useLoadingToast();
    const createSubmission = useAction(submitSalesAssignmentAction, {
        onSuccess(args) {
            form.setValue(
                `fallbacks.submission.${args.data.submissionId}`,
                true,
            );
            const auid = `${args.input.assignmentId}_${args.input?.itemUid}`;

            form.setValue(
                `actions.submissionActions.${auid}.status`,
                "success",
            );

            loader.display({
                title: "Creating Submission",
            });
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 150);
        },
        onError(e) {
            console.log({
                type: "Submittion",
                e,
            });
            loader.error(`Failed to create submission`);
        },
    });
    const createDispatch = useAction(createSalesDispatchAction, {
        onSuccess(args) {
            form.setValue("actions.dispatch.id", args.data.id);
            form.setValue(`fallbacks.dispatch.${args.data.id}`, true);
            loader.display({
                title: "Creating Submission",
            });
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 150);
        },
        onError(e) {
            console.log({
                type: "Dispatch",
                e,
            });
            loader.error(`Failed to create dispatch`);
        },
    });
    const createAssignment = useAction(createSalesAssignmentAction, {
        onSuccess(args) {
            form.setValue(
                `actions.assignmentActions.${args.input?.itemUid}.assignmentId`,
                args.data?.assignmentId,
            );
            form.setValue(
                `actions.assignmentActions.${args.input?.itemUid}.status`,
                "success",
            );
            form.setValue(
                `actions.submissionActions.${args.input?.token}_${args.input?.itemUid}`,
                // `actions.submissionActions.${args.data?.assignmentId}_${args.input?.itemUid}`,
                {
                    status: null,
                    meta: {
                        assignmentId: args.data?.assignmentId,
                        qty: args.input.qty,
                        pending: args.input.pending,
                    },
                },
            );
            loader.display({
                title: "Creating Assignment",
                // description: `Created`,
            });
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 150);
        },
        onError(e) {
            console.log({
                type: "Assignment",
                e,
            });
            loader.error(`Failed to create assignment`);
        },
    });
    const createDispatchItem = useAction(createSalesDispatchItemsAction, {
        onSuccess(args) {
            Object.values(args.input.items).map((item) => {
                form.setValue(
                    `actions.dispatchItems.${item.itemUid}.status`,
                    "queue",
                );
            });

            loader.display({
                title: "Creating Assignment",
                // description: `Created`,
            });
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 150);
        },
        onError(e) {
            console.log({
                type: "Dispatch Item",
                e,
            });
            loader.error(`Failed to create dispatch item.`);
        },
    });

    const queryCtx = useSalesOverviewQuery();
    const [error, currentActionId, actions, nextTriggerUID] = form.watch([
        "error",
        "currentActionId",
        "actions",
        "nextTriggerUID",
    ]);
    useEffect(() => {
        if (!nextTriggerUID) {
            if (actions) {
                loader.success("Submission completed.");
                queryCtx.salesQuery.assignmentSubmissionUpdated();
                onFinish?.();
            }
            return;
        }
        if (error) {
            loader.error(error);
            queryCtx.salesQuery.assignmentSubmissionUpdated();
            onFinish?.();
            return;
        }
        const entry = Object.entries(actions.assignmentActions).find(
            ([uid, data]) => !data.assignmentId,
        );
        if (entry?.[1]) {
            if (actions.dispatch)
                loader.loading("Preparing items for dispatch");
            else loader.loading("Creating Assingments");
            const [uid, itemData] = entry;
            createAssignment.execute({
                ...itemData.meta,
                token: itemData.submitTok,
            });
            return;
        }
        const submissionEntry = Object.entries(actions.submissionActions).find(
            ([uid, data]) => !data.status,
        );
        if (submissionEntry?.[1]) {
            const [uid, itemData] = submissionEntry;

            const [tok, itemUid] = uid?.split("_");
            const submissionMeta = actions.submissionMeta?.[itemUid];

            if (!submissionMeta) {
                form.setValue("error", "Unable to create submission");
                setTimeout(() => {
                    form.setValue("nextTriggerUID", generateRandomString());
                }, 100);
            } else {
                if (actions.dispatch)
                    loader.loading("Preparing items for dispatch");
                else loader.loading("Submitting Assignments");
                createSubmission.execute({
                    ...itemData.meta,
                    ...submissionMeta,
                });
            }
            return;
        }
        const deliveryData = actions.dispatch;
        if (!deliveryData) {
            form.setValue("nextTriggerUID", null);
            return;
        }
        if (!deliveryData.id) {
            loader.loading("Creating dispatch...");
            createDispatch.execute({
                ...deliveryData,
            });
        } else {
            const deliveryItems = Object.entries(actions.dispatchItems)
                .filter(([uid, data]) => !data.status)
                .filter(([uid, data], index) => index < 10);

            if (deliveryItems.length == 0) {
                form.setValue("nextTriggerUID", null);
                return;
            }
            loader.loading("Creating dispatch items");
            createDispatchItem.execute({
                deliveryId: deliveryData.id,
                // deliveryMode: deliveryData.deliveryMode,
                orderId: deliveryData.orderId,
                status: deliveryData.status || "queue",
                items: Object.fromEntries(deliveryItems),
            });
        }
    }, [nextTriggerUID]);
    const session = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const ctx = {
        form,
        async start() {
            const _actions = { ...actions };
            // setTimeout(() => {
            //     form.setValue("nextTriggerUID", generateRandomString());
            // }, 200);
            // object for each key value
            for (const [key, value] of Object.entries(
                _actions.assignmentActions,
            )) {
                if (value?.assignmentId) continue;
                if (_actions.dispatch)
                    loader.loading("Preparing items for dispatch");
                else loader.loading("Creating Assingments");
                const res = await _createSalesAssignmentAction({
                    ...value.meta,
                });
                _actions.assignmentActions[key].assignmentId = res.assignmentId;
            }
        },
        loader,
        currentActionId,
        emptyActions(): Partial<FormData["actions"]> {
            return {
                assignmentActions: {},
                dispatchItems: {},
                submissionActions: {},
                submissionMeta: {},
                dispatch: {},
            };
        },
        executing:
            !!currentActionId || createAssignment.isExecuting || !!actions,
        packItem(props: PackProps) {
            const { qty, salesId, dispatchId, dispatchable } = props;
            const data = ctx.emptyActions();
            //  const itemData = formData?.itemData?.items?.[item.uid];
            // let qty = itemData?.qty;
            let handle = false;
            if (qty?.lh || qty?.rh) {
                qty.qty = sum([qty.lh, qty.rh]);
                handle = true;
            }
            dispatchable.dispatchStat?.map((ds) => {
                if (qty.qty == 0) return;
                const pickQty = { ...ds.available };
                const remaining = qtyMatrixDifference(qty as any, ds.available);
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
                    pickQty.qty = sum([pickQty.rh, pickQty.lh]);
                    qty.qty = sum([qty.rh, qty.lh]);
                } else {
                    if (remaining.qty >= 0) {
                        qty.qty = remaining.qty;
                    } else {
                        qty.qty = 0;
                        pickQty.qty = qty.qty;
                    }
                }
                if (pickQty.qty)
                    data.dispatchItems[generateRandomString()] = {
                        submissionId: ds.submissionId,
                        qty: pickQty,
                        status: null,
                        dispatchId,
                        note: props.note,
                        orderItemId: props.dispatchable.itemId,
                        itemUid: props.dispatchable.uid,
                        totalItemQty:
                            props.dispatchable.analytics?.stats?.qty?.qty,
                    };
            });
            if (qty.qty) {
                const tok = generateRandomString(5);
                data.assignmentActions[dispatchable.uid] = {
                    meta: {
                        qty,
                        pending: qty,
                        itemUid: dispatchable.uid,
                        itemsTotal: dispatchable.totalQty.qty,
                        salesId,
                        salesDoorId: dispatchable.doorId,
                        salesItemId: dispatchable.itemId,
                    } as z.infer<typeof createAssignmentSchema>,
                    uid: dispatchable.uid,
                    assignmentId: null as any,
                    submitTok: tok,
                };
                // if (!data.submissionActions[item.uid]) {
                data.submissionMeta[dispatchable.uid] = {
                    itemUid: dispatchable.uid,
                    itemId: dispatchable.itemId,
                    salesId,
                    submittedById: session?.data?.user?.id,
                };
                data.submissionActions[`${tok}_${dispatchable.uid}`] = {
                    status: null,
                    meta: {
                        qty: qty,
                        pending: qty,
                        assignmentId: null,
                    } as SubmitSchema,
                };
                // }
                data.dispatchItems[dispatchable.uid] = {
                    submissionId: null,
                    qty,
                    status: null,
                    dispatchId,
                    note: props.note,
                    orderItemId: props.dispatchable.itemId,
                    itemUid: props.dispatchable.uid,
                    totalItemQty: props.dispatchable.analytics?.stats?.qty?.qty,
                } as SalesDispatchItem["items"][number];
            }
            data.dispatch = {
                id: dispatchId,
                orderId: salesId,
            };
            console.log(data);

            ctx.form.reset({
                nextTriggerUID: null,
                actions: data,
            });
            ctx.loader.loading("Creating dispatch item...");
            ctx.start();
        },
    };
    return ctx;
}
