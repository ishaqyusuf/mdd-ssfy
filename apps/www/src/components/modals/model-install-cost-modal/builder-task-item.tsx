import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useModelInstallConfigContext } from "@/hooks/use-model-install-config";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Select } from "@gnd/ui/namespace";

type BuilderTask =
    RouterOutputs["community"]["getModelBuilderTasks"]["builderTasks"][number];

interface Props {
    task?: BuilderTask;
    sideBarMode?: boolean;
}

export function BuilderTaskItem({ task, sideBarMode }: Props) {
    const { setParams, selectedBuilderTaskId } =
        useCommunityInstallCostParams();
    const { dataV2: data } = useModelInstallConfigContext();

    if (sideBarMode) {
        return (
            <div className="grid gap-1">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                    Builder Task
                </p>
                <Select.Root
                    value={
                        selectedBuilderTaskId
                            ? String(selectedBuilderTaskId)
                            : undefined
                    }
                    onValueChange={(value) => {
                        setParams({
                            selectedBuilderTaskId: Number(value),
                        });
                    }}
                >
                    <Select.Trigger className="w-full">
                        <Select.Value placeholder="Select task" />
                    </Select.Trigger>
                    <Select.Content>
                        {data?.builderTasks?.map((builderTask) => (
                            <Select.Item
                                key={builderTask.id}
                                value={String(builderTask.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <span>{builderTask.taskName}</span>
                                    <span className="text-muted-foreground text-xs">
                                        ({builderTask.addonPercentage}%)
                                    </span>
                                </div>
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
            </div>
        );
    }

    if (!task) return null;

    const itemsCount = task?.installTaskCount;

    return (
        <button
            key={task.id}
            onClick={() =>
                setParams({
                    selectedBuilderTaskId: task.id,
                })
            }
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${
                selectedBuilderTaskId === task.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted text-foreground"
            }`}
        >
            <span className="truncate">{task.taskName}</span>
            {itemsCount > 0 && (
                <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedBuilderTaskId === task.id
                            ? "bg-white/20 text-white"
                            : "bg-primary/10 text-primary"
                    }`}
                >
                    {itemsCount}
                </span>
            )}
        </button>
    );
}
