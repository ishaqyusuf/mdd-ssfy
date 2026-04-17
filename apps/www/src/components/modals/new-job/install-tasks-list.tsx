import { useJobFormContext } from "@/contexts/job-form-context";
import { useJobRole } from "@/hooks/use-job-role";
import { cn } from "@/lib/utils";
import { InputGroup } from "@gnd/ui/namespace";
import { Controller } from "react-hook-form";
import NumberFlow from "@number-flow/react";
import type { ReactNode } from "react";
import { MissingTasksConfig } from "./missing-tasks-config";

export function InstallTasksList({ form }) {
    const { defaultValues, state } = useJobFormContext();
    const jobRole = useJobRole();
    if (!defaultValues?.builderTaskId) return null;
    const tasks = defaultValues?.job?.tasks;
    if (!tasks?.length) return <MissingTasksConfig form={form} />;

    function ShowTaskQty({ children }: { children: ReactNode }) {
        if (!state.showTaskQty && !jobRole.isAdmin) return null;
        return <>{children}</>;
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Install Costs</h3>
            <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                        <tr>
                            <th className="px-4 py-3">Item</th>
                            <ShowTaskQty>
                                <th className="px-4 py-3 text-right">Rate</th>
                            </ShowTaskQty>
                            <th className="px-4 py-3 w-28 text-center">Qty</th>
                            <ShowTaskQty>
                                <th className="px-4 py-3 text-right">Total</th>
                            </ShowTaskQty>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tasks?.map((cost, index) => {
                            const maxQty = cost.maxQty || 0;

                            return (
                                <Controller
                                    control={form.control}
                                    name={`job.tasks.${index}.qty`}
                                    key={index}
                                    render={({
                                        field: { onChange, value },
                                        fieldState,
                                    }) => (
                                        <tr className="bg-card align-top">
                                            <td className="px-4 py-3 font-medium text-foreground uppercase">
                                                {cost.installCostModel.title}
                                                <ShowTaskQty>
                                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                                        Max: {maxQty}
                                                    </p>
                                                </ShowTaskQty>
                                            </td>
                                            <ShowTaskQty>
                                                <td className="px-4 py-3 text-right text-muted-foreground">
                                                    ${cost.rate.toFixed(2)}
                                                </td>
                                            </ShowTaskQty>
                                            <td className="px-4 py-2">
                                                <InputGroup
                                                    className={cn(
                                                        fieldState.error &&
                                                            "border-destructive",
                                                    )}
                                                >
                                                    <InputGroup.Input
                                                        type="number"
                                                        className="w-full bg-transparent text-center font-bold text-foreground outline-none p-0 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                                        value={value || ""}
                                                        min={0}
                                                        max={
                                                            jobRole.isAdmin
                                                                ? maxQty
                                                                : undefined
                                                        }
                                                        disabled={maxQty === 0}
                                                        onChange={(e) => {
                                                            onChange(
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            );
                                                        }}
                                                        placeholder="0"
                                                    />
                                                    <ShowTaskQty>
                                                        <InputGroup.Addon align="inline-end">
                                                            <span className="text-muted-foreground">
                                                                {` / ${maxQty} `}
                                                            </span>
                                                        </InputGroup.Addon>
                                                    </ShowTaskQty>
                                                </InputGroup>
                                                {fieldState.error?.message ? (
                                                    <p className="mt-1 text-center text-xs text-destructive">
                                                        {fieldState.error.message}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <ShowTaskQty>
                                                <td className="px-4 py-3 text-right font-bold">
                                                    <NumberFlow
                                                        prefix="$"
                                                        value={
                                                            +(
                                                                (cost.rate || 0) *
                                                                    +value || 0
                                                            ).toFixed(2)
                                                        }
                                                    />
                                                </td>
                                            </ShowTaskQty>
                                        </tr>
                                    )}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
