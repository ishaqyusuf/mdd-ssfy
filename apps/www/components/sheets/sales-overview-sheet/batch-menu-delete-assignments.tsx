import { useEffect, useMemo } from "react";
import { deleteSalesAssignmentAction } from "@/actions/delete-sales-assignment";
import { deleteSalesAssignmentSubmissionSchema } from "@/actions/schema";
import { Menu } from "@/components/(clean-code)/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString, sum } from "@/lib/utils";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import z from "zod";

import { Icons } from "@gnd/ui/icons";

import { useProduction } from "./production-tab";

interface Props {
    itemIds?: string[];
    setOpened?;
}
type DeleteSchema = z.infer<typeof deleteSalesAssignmentSubmissionSchema>;
export function BatchMenuDeleteAssignments({ itemIds, setOpened }: Props) {
    const prod = useProduction();
    const { qty, items } = useMemo(() => {
        const _items = prod.data?.items
            ?.filter((item) =>
                !itemIds ? true : itemIds?.includes(item.controlUid),
            )
            ?.map((item) => {
                const stats = item.analytics.stats;
                return {
                    uid: item.controlUid,
                    assignmentIds: item.analytics.assignment.ids,
                    itemId: item.itemId,
                    qty: stats?.prodAssigned?.qty,
                    deliveredQty: item.analytics.deliveredQty,
                    submitQty: item.analytics.submitQty,
                };
            });
        return {
            qty: sum(_items, "qty"),
            items: _items,
        };
    }, [prod.data, itemIds]);
    const loader = useLoadingToast();
    const deleteAssignments = useAction(deleteSalesAssignmentAction, {
        onSuccess(args) {
            form.setValue(
                `actions.${args.input?.assignmentId}.status`,
                "success",
            );
            loader.display({
                title: "Deleting Assignment Submissions",
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

    const form = useForm<{
        currentActionId: string;
        nextTriggerUID?: string;
        actions: {
            [assignmentId in string]: {
                status?: string;
                meta?: DeleteSchema;
            };
        };
    }>({
        defaultValues: {
            actions: null,
        },
    });
    const queryCtx = useSalesOverviewQuery();
    const [currentActionId, actions, nextTriggerUID] = form.watch([
        "currentActionId",
        "actions",
        "nextTriggerUID",
    ]);
    useEffect(() => {
        if (!nextTriggerUID) {
            if (actions) {
                loader.success("Submissions deleted.");
                queryCtx._refreshToken();
                setOpened(false);
            }
            return;
        }
        // const [uid, itemData] = Object.entries(actions).find(
        //     ([uid, dataItem]) => !itemData.assignmentId,
        const entry = Object.entries(actions).find(
            ([assignmentId, data]) => !data.status,
        );
        if (!entry) {
            form.setValue("nextTriggerUID", null);
            return;
        }
        const [assignmentId, { meta }] = entry;
        console.log(meta);
        deleteAssignments.execute({
            ...meta,
        });
    }, [nextTriggerUID]);
    async function deleteSubmits(e) {
        const deliveredQty = sum(items, "deliveredQty");
        const submitQty = sum(items, "submitQty");
        if (deliveredQty) {
            loader.error("Cannot perform action", {
                description:
                    "Some assignments have been submitted and registered to dispatch.",
            });
            return;
        }
        if (submitQty) {
            loader.error("Cannot perform action", {
                description: "Some assignments have been submitted.",
            });
            return;
        }
        e.preventDefault();
        const data = {};
        items?.map((item) => {
            item.assignmentIds.map((aid) => {
                data[String(aid)] = {
                    meta: {
                        assignmentId: aid,
                        itemUid: item.uid,
                    } as DeleteSchema,
                };
            });
        });
        form.setValue("actions", data);
        loader.display({
            description: "Deleting Submissions...",
            duration: Number.POSITIVE_INFINITY,
        });
        setTimeout(() => {
            form.setValue("nextTriggerUID", generateRandomString());
        }, 500);
    }
    return (
        <Menu.Item
            Icon={Icons.Delete}
            onClick={deleteSubmits}
            disabled={!qty || !!actions || !!nextTriggerUID}
            shortCut={`QTY: ${qty}`}
        >
            Delete Assignments
        </Menu.Item>
    );
}
