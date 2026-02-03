import {
    PrimaryCellContent,
    SecondaryCellContent,
} from "@/components/_v1/columns/base-columns";
import Money from "@/components/_v1/money";
import { cn } from "@/lib/utils";

import { FormControl, FormField, FormItem } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import ProjectFormSection from "./project-form-section";
import { useJobSubmitCtx } from "./use-submit-job";
import { Field } from "@gnd/ui/composite";
import { Switch } from "@gnd/ui/switch";
import { Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export default function TaskDetailsTab({}) {
    const ctx = useJobSubmitCtx();
    const [homeCosting, isCustom] = ctx.form.watch([
        "home.costing",
        "job.isCustom",
    ]);
    const { data: setting } = useQuery(
        useTRPC().settings.getJobSettings.queryOptions(),
    );
    const { showTaskQty, allowCustomTasks } = setting?.meta || {};
    // const cost = useJobCostList(ctx.type);
    // const form = useFormContext();
    // useEffect(() => {},[])
    return (
        <ScrollArea className="grid h-[400px] gap-4 grid pr-4">
            <ProjectFormSection />
            <div className="py-8">
                <Field.Group>
                    <Controller
                        control={ctx?.form?.control}
                        name="job.isCustom"
                        render={({ field, fieldState }) => (
                            <Field
                                data-invalid={fieldState.invalid}
                                orientation="horizontal"
                            >
                                <Field.Content>
                                    <Field.Label htmlFor="form-rhf-switch-isCustom">
                                        Custom Job
                                    </Field.Label>
                                    <Field.Description>
                                        Enter custom job details manually
                                    </Field.Description>
                                </Field.Content>
                                <Switch
                                    id="form-rhf-switch-isCustom"
                                    name={field.name}
                                    checked={field.value}
                                    disabled={!allowCustomTasks}
                                    onCheckedChange={field.onChange}
                                    aria-invalid={fieldState.invalid}
                                />
                            </Field>
                        )}
                    />
                </Field.Group>
            </div>
            <div className={cn(!ctx.costList?.fields?.length && "hidden")}>
                <Table className="">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-1">Task</TableHead>
                            <TableHead className="px-1">Qty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(ctx.costList?.fields as any)?.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <PrimaryCellContent>
                                        {row.title}
                                    </PrimaryCellContent>
                                    <SecondaryCellContent>
                                        <Money value={row.cost} />
                                        {" per unit"}
                                    </SecondaryCellContent>
                                </TableCell>
                                <TableCell className="px-1">
                                    <div className="flex items-center space-x-0.5">
                                        <FormField
                                            name={`job.meta.costData.${row.uid}.qty`}
                                            control={ctx.form.control}
                                            render={({ field, fieldState }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            disabled={isCustom}
                                                            {...field}
                                                            className={cn(
                                                                "hiddens h-8 w-16",
                                                                fieldState.error &&
                                                                    "border-red-400",
                                                            )}
                                                            type="number"
                                                            min={0}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {ctx.isAdmin &&
                                            homeCosting?.[row.uid] && (
                                                <Label className="px-1">
                                                    {" /"}
                                                    {homeCosting?.[row.uid]}
                                                </Label>
                                            )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
    );
}
