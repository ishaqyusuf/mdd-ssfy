import { useEffect } from "react";

import { Progress } from "@gnd/ui/progress";

import { ItemCardProps } from "./production-tab";

export function ItemProgressBar({ item }: ItemCardProps) {
    const stats = item?.analytics?.stats;

    return (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
            <ProgressItem
                label="Assigned"
                completed={stats?.prodAssigned?.qty}
                total={item.qty?.qty}
            />
            <ProgressItem
                label="Production"
                completed={stats?.prodCompleted?.qty}
                total={item.qty?.qty}
            />

            <ProgressItem
                label="Fulfilled"
                completed={stats?.dispatchCompleted?.qty}
                total={item.qty?.qty}
            />
        </div>
    );
}

interface ProgressItemProps {
    label: string;
    completed: number;
    total: number;
}

export function ProgressItem({ label, completed, total }: ProgressItemProps) {
    completed = completed || 0;
    const percentage = (completed / total) * 100;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase">{label}</span>
                <span className="text-xs text-gray-500">
                    {completed}/{total} ({percentage.toFixed(0)}%)
                </span>
            </div>
            <Progress value={percentage} className="h-2" />
        </div>
    );
}
