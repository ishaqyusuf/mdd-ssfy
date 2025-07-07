"use client";

import { IHomeTask } from "@/types/community";
import { Check, Play, StopCircle } from "lucide-react";

import {
    _completeUnitTaskProduction,
    _startUnitTaskProduction,
    _stopUnitTaskProduction,
} from "@/app/(v1)/_actions/community-production/prod-actions";
import Btn from "../btn";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function UnitTaskProductionAction({
    task,
}: {
    task: IHomeTask;
}) {
    return (
        <>
            <ActionButton
                itemId={task.id}
                disabled={task.prodStartedAt != null}
                _action={_startUnitTaskProduction}
                color="blue"
                Icon={Play}
            ></ActionButton>
            <ActionButton
                itemId={task.id}
                disabled={task.prodStartedAt == null}
                _action={_stopUnitTaskProduction}
                color="red"
                Icon={StopCircle}
            ></ActionButton>
            <ActionButton
                disabled={task.prodStartedAt == null}
                itemId={task.id}
                _action={_completeUnitTaskProduction}
                color="green"
                Icon={Check}
            ></ActionButton>
        </>
    );
}
function ActionButton({ itemId, disabled, Icon, color, _action }) {
    const [loading, startTransition] = useTransition();

    return (
        <Btn
            disabled={disabled}
            isLoading={loading}
            onClick={() =>
                startTransition(async () => {
                    await _action(itemId);
                    toast.success("Action Successful");
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
