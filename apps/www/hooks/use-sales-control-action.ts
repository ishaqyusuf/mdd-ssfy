import { useEffect } from "react";
import { createSalesAssignmentAction } from "@/actions/create-sales-assignment";
import { createSubmissionSchema } from "@/actions/schema";
import { submitSalesAssignmentAction } from "@/actions/submit-sales-assignment";
import { generateRandomString } from "@/lib/utils";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import z from "zod";

import { useLoadingToast } from "./use-loading-toast";
import { useSalesOverviewQuery } from "./use-sales-overview-query";

type SubmitSchema = z.infer<typeof createSubmissionSchema>;
interface Props {
    onFinish?;
}
export function useSalesControlAction({ onFinish }) {
    const form = useForm<{
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
            dispatchItems: {
                [itemUid in string]: {};
            };
        };
    }>({
        defaultValues: {
            actions: null,
        },
    });
    const loader = useLoadingToast();
    const createSubmission = useAction(submitSalesAssignmentAction, {
        onSuccess(args) {
            const auid = `${args.input.assignmentId}_${args.input?.itemUid}`;
            console.log({ auid });
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
            console.log(e);
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
                `actions.submissionActions.${args.data?.assignmentId}_${args.input?.itemUid}`,
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
            console.log(e);
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
        if (entry) {
            const [uid, itemData] = entry;
            createAssignment.execute({
                ...itemData.meta,
            });
            return;
        }
        const submissionEntry = Object.entries(actions.submissionActions).find(
            ([uid, data]) => !data.status,
        );
        if (!submissionEntry) {
            form.setValue("nextTriggerUID", null);
            return;
        }

        const [uid, itemData] = submissionEntry;

        const [assignmentId, itemUid] = uid?.split("_");
        const submissionMeta = actions.submissionMeta?.[itemUid];

        if (!submissionMeta) {
            form.setValue("error", "Unable to create submission");
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 100);
        } else {
            createSubmission.execute({
                ...itemData.meta,
                ...submissionMeta,
            });
        }
    }, [nextTriggerUID]);
    return {
        form,
        currentActionId,
        executing:
            !!currentActionId || createAssignment.isExecuting || !!actions,
    };
}
