"use client";

import { Icons } from "@gnd/ui/icons";

import { IHomeTask } from "@/types/community";

import {
    _completeUnitTaskProduction,
    _startUnitTaskProduction,
    _stopUnitTaskProduction,
} from "@/app-deps/(v1)/_actions/community-production/prod-actions";
import Btn from "../btn";
import {} from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";

export default function UnitTaskProductionAction({
    task,
}: {
    task: IHomeTask;
}) {
    const isCompleted = !!task.producedAt;
    const isStarted = !!task.prodStartedAt && !isCompleted;

    return (
        <>
            {!isStarted && !isCompleted ? (
                <ActionButton
                    itemId={task.id}
                    _action={_startUnitTaskProduction}
                    color="blue"
                    Icon={Icons.Play}
                />
            ) : null}
            {isStarted || isCompleted ? (
                <ActionButton
                    itemId={task.id}
                    _action={_stopUnitTaskProduction}
                    color="red"
                    Icon={Icons.StopCircle}
                />
            ) : null}
            {!isCompleted ? (
                <ActionButton
                    itemId={task.id}
                    _action={async (id) => {
                        if (!isStarted) {
                            await _startUnitTaskProduction(id, {
                                suppressNotification: true,
                            });
                        }
                        await _completeUnitTaskProduction(id, {
                            completedFromIdle: !isStarted,
                        });
                    }}
                    color="green"
                    Icon={Icons.Check}
                />
            ) : null}
        </>
    );
}
function ActionButton({ itemId, disabled, Icon, color, _action }) {
    const [loading, startTransition] = useTransition();
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    return (
        <Btn
            disabled={disabled}
            isLoading={loading}
            onClick={() =>
                startTransition(async () => {
                    await _action(itemId);
                    await Promise.all([
                        queryClient.invalidateQueries({
                            queryKey:
                                trpc.community.getUnitProductions.infiniteQueryKey(),
                        }),
                        queryClient.invalidateQueries({
                            queryKey:
                                trpc.community.getUnitProductionSummary.queryKey(),
                        }),
                    ]);
                    toast.success("Action Successful");
                    router.refresh();
                })
            }
            className={cn(
                "p-2 h-8 w-8",
                `bg-${color}-500 hover:bg-${color}-600`
            )}
            size="icon"
        >
            <Icon className="size-4" />
        </Btn>
    );
}
