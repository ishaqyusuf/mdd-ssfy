import { useEffect, useId } from "react";
import { createSalesAssignmentAction } from "@/actions/create-sales-assignment";
import { createSalesDispatchAction } from "@/actions/create-sales-dispatch-action";
import { createSalesDispatchItemsAction } from "@/actions/create-sales-dispatch-items-action";
import {
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

type SubmitSchema = z.infer<typeof createSubmissionSchema>;
type SalesDispatch = z.infer<typeof createSalesDispatchSchema>;
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
                submissionId?: number;
                qty?: Qty;
                status?;
            };
        };
    };
    fallbacks: {
        [k in "submission" | "dispatch" | "assignment" | "dispatchItem"]: {
            [id in any]: boolean;
        };
    };
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
        onError(e) {},
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
        onError(e) {},
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
        onError(e) {},
    });
    const createDispatchItem = useAction(createSalesDispatchItemsAction, {
        onSuccess(args) {
            Object.values(args.input.items).map((item) => {
                form.setValue(
                    `actions.dispatchItems.${item.itemUid}.status`,
                    "success",
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
        onError(e) {},
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
                queryCtx._refreshToken();
                onFinish?.();
            }
            return;
        }
        if (error) {
            loader.error(error);
            queryCtx._refreshToken();
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
            // .map(([uid, data]) => data);
            if (deliveryItems.length == 0) {
                form.setValue("nextTriggerUID", null);
                return;
            }
            loader.loading("Creating dispatch items");
            createDispatchItem.execute({
                deliveryId: deliveryData.id,
                deliveryMode: deliveryData.deliveryMode,
                orderId: deliveryData.orderId,
                status: deliveryData.status,
                items: Object.fromEntries(deliveryItems),
            });
        }
    }, [nextTriggerUID]);
    return {
        form,
        start() {
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 200);
        },
        loader,
        currentActionId,
        emptyActions(): Partial<FormData["actions"]> {
            return {
                assignmentActions: {},
                dispatchItems: {},
                submissionActions: {},
                submissionMeta: {},
            };
        },

        executing:
            !!currentActionId || createAssignment.isExecuting || !!actions,
    };
}
