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

export default function TaskDetailsTab({}) {
    const ctx = useJobSubmitCtx();
    const [homeCosting, type] = ctx.form.watch(["home.costing", "job.type"]);
    // const cost = useJobCostList(ctx.type);
    // const form = useFormContext();
    // useEffect(() => {},[])
    return (
        <ScrollArea className="grid h-[400px] gap-2 pr-4">
            <ProjectFormSection />
            {/* {ctx.costList?.fields?.length} */}
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
