import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useModelInstallConfigContext } from "@/hooks/use-model-install-config";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { DropdownMenu, Sidebar } from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import {
    AlertTriangle,
    CheckCircle2,
    Settings,
    Trash2,
    XCircle,
} from "lucide-react";
import { useState } from "react";

interface Props {
    task: RouterOutputs["community"]["getModelBuilderTasks"]["builderTasks"][number];
    sideBarMode?: boolean;
    // data?: RouterOutputs["community"]["getModelBuilderTasks"];
}

export function BuilderTaskItem({ task, sideBarMode }: Props) {
    const { setParams, selectedBuilderTaskId } =
        useCommunityInstallCostParams();
    const { dataV2: data } = useModelInstallConfigContext();
    const itemsCount = task?.installTaskCount;
    const isActive = selectedBuilderTaskId === task.id;
    const [startDelete, setStartDelete] = useState(false);
    const confirmDeleteTask = () => {};
    if (startDelete)
        return (
            <div
                key={task.id}
                className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="text-sm font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle size={14} /> Delete this task?
                </div>
                <p className="text-xs text-muted-foreground">
                    This action will remove{" "}
                    <span className="font-semibold uppercase">
                        {task.taskName}
                    </span>
                    {" from "}
                    <span className="font-semibold uppercase">
                        {data?.builderName}
                    </span>
                </p>
                <div className="flex gap-2 mt-1">
                    <Button
                        variant="destructive"
                        size="xs"
                        disabled
                        onClick={confirmDeleteTask}
                        // className="flex-1 py-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded shadow-sm hover:bg-destructive/90"
                    >
                        Delete
                    </Button>
                    <Button
                        variant="outline"
                        size="xs"
                        onClick={(e) => setStartDelete(false)}
                        // className="flex-1 py-1.5 bg-background border border-border text-foreground text-xs font-bold rounded hover:bg-muted"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        );
    if (sideBarMode)
        return (
            <Sidebar.MenuItem className="group relative">
                <Sidebar.MenuButton
                    onClick={() =>
                        setParams({
                            selectedBuilderTaskId: task.id,
                        })
                    }
                    className={cn(
                        `w-full text-left px-4 py-3 rounded-lg text-sm font-medium stransition-all flex items-center justify-between group-hover:pr-10 h-auto ${
                            isActive
                                ? "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground"
                                : "hover:bg-muted text-foreground"
                        }`,
                    )}
                    // variant="outline"
                    // isActive
                >
                    <div>
                        <span>{task.taskName}</span>
                        <div
                            className={`flex white-space-no-wrap items-center gap-2 text-[10px] mt-0.5 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                            <span>Add-on: {task.addonPercentage}%</span>
                            <span>•</span>
                            {task.installable ? (
                                <span className="flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Install
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 opacity-70">
                                    <XCircle size={10} /> No Install
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex-1" />
                </Sidebar.MenuButton>
                <DropdownMenu>
                    <DropdownMenu.Trigger
                        asChild
                        className="sopacity-0 group-hover:opacity-100 absolute right-4 top-1/2 -translate-y-1/2"
                    >
                        <Button
                            variant="ghost"
                            className={cn(
                                isActive
                                    ? "text-primary-foreground"
                                    : "text-foreground",
                            )}
                            size="xs"
                        >
                            <Icons.MoreHoriz className="size-4" />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content className="w-[200px]">
                        <DropdownMenu.Label>Actions</DropdownMenu.Label>
                        <DropdownMenu.Item disabled>
                            <Settings size={14} className="mr-2" />
                            Update Add-on %
                        </DropdownMenu.Item>
                        <DropdownMenu.Item disabled>
                            <CheckCircle2 size={14} className="mr-2" />
                            Set{" "}
                            {task.installable
                                ? "Not Installable"
                                : "Installable"}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            onClick={(e) => setStartDelete(true)}
                            className="hover:bg-destructive/10 text-destructive"
                        >
                            <Trash2 size={14} className="mr-2" />
                            Delete Task
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu>
            </Sidebar.MenuItem>
        );
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

