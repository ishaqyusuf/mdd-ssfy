import { cn } from "@gnd/ui/cn";

import { IconKeys, Icons } from "./_v1/icons";

interface Props {
    children?;
    empty?: boolean;
    title?: string;
    description?: string;
    icon?: IconKeys;
    className?: string;
}
export function EmptyState(props: Props) {
    if (!props.empty) return props.children;
    let Icon = Icons[props.icon || "Transactions2"];
    return (
        <div
            className={cn(
                "flex h-[calc(100vh-300px)] items-center justify-center",
                props.className,
            )}
        >
            <div className="flex flex-col items-center">
                <Icon className="mb-4" />
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">
                        {props.title || "No results"}
                    </h2>
                    <p className="text-sm text-[#606060]">
                        {props.description ||
                            "You have not created any data yet"}
                    </p>
                </div>
            </div>
        </div>
    );
}
