import { useJobFormContext } from "@/contexts/job-form-context";
import { useJobRole } from "@/hooks/use-job-role";
import { InputGroup } from "@gnd/ui/composite";
import { Controller } from "react-hook-form";
import { AdminJobFormContent } from "./admin-job-form-content";
import NumberFlow from "@number-flow/react";
import { MissingTasksConfig } from "./missing-tasks-config";

export function InstallTasksList({ form }) {
    const { defaultValues } = useJobFormContext();
    const jobRole = useJobRole();
    if (!defaultValues?.builderTaskId) return null;
    const tasks = defaultValues?.job?.tasks;
    if (!tasks?.length) return <MissingTasksConfig form={form} />;
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Install Costs</h3>
            <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                        <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3 text-right">Rate</th>
                            <th className="px-4 py-3 w-28 text-center">Qty</th>
                            <th className="px-4 py-3 text-right">Total</th>
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
                                    }) => (
                                        <tr className="bg-card">
                                            <td className="px-4 py-3 font-medium text-foreground uppercase">
                                                {cost.installCostModel.title}
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted-foreground">
                                                ${cost.rate.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2">
                                                <InputGroup>
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
                                                    <AdminJobFormContent>
                                                        <InputGroup.Addon align="inline-end">
                                                            <span className="text-muted-foreground">
                                                                {` / ${maxQty} `}
                                                            </span>
                                                        </InputGroup.Addon>
                                                    </AdminJobFormContent>
                                                </InputGroup>
                                            </td>
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

