import React from "react";
import { getComponentCostHistoryAction } from "@/app/(v1)/(loggedIn)/sales/_actions/inventory";
import { Icons } from "@/components/_v1/icons";
import { ToolTip } from "@/components/_v1/tool-tip";
import { useBool } from "@/lib/use-loader";
import { ISalesWizardForm } from "@/types/post";
import { History } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { IComponentForm } from "../../../lib/sales/sales-component-modal";

export function ComponentPriceHistory({
    form,
    field,
    rowIndex,
}: {
    rowIndex;
    field: ISalesWizardForm;
    form: UseFormReturn<IComponentForm, any>;
}) {
    const [open, setOpen] = React.useState(false);
    const watch = form.watch([`components.${rowIndex}.title`]);
    const loader = useBool();
    const [components, setComponents] = React.useState<any[]>([]);
    async function loadComponents() {
        const [title] = watch;
        // setComponents([]);

        if (!title) return;
        console.log([field.category, title]);
        loader.action(async () => {
            const _components = await getComponentCostHistoryAction({
                title,
                category: field.category,
            });
            console.log(_components);
            setComponents(_components as any[]);
        });
    }
    //   React.useEffect(() => {
    //     if (open) {
    //       console.log("OPEN CHANGED");
    //       loadComponents();
    //     }
    //   }, [open, rowIndex, watch]);
    return (
        <Popover
            open={open}
            onOpenChange={(e) => {
                setOpen(e);
                if (e) loadComponents();
            }}
        >
            <PopoverTrigger asChild>
                <div>
                    <ToolTip info="Component Cost History">
                        <Button
                            variant="ghost"
                            className="h-8 w-8 rounded-full p-0 text-yellow-600"
                        >
                            <History className="h-4 w-4" />
                        </Button>
                    </ToolTip>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">
                            Component Cost History
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Click on a Cost to apply
                        </p>
                    </div>
                    {loader.isTrue ? (
                        <>
                            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        </>
                    ) : components.length == 0 ? (
                        <p className="text-muted-foreground">
                            This component has no Price History
                        </p>
                    ) : (
                        <Table>
                            <TableBody>
                                {components.map((field, i) => (
                                    <TableRow
                                        onClick={() => {
                                            //
                                            setOpen(false);
                                            form.setValue(
                                                `components.${rowIndex}.price`,
                                                field?.price,
                                            );
                                        }}
                                        className="cursor-pointer hover:bg-slate-800 hover:text-slate-100"
                                        key={field.id}
                                    >
                                        <TableCell id="Name" className="p-1">
                                            <div>
                                                <p>{field.name}</p>
                                                <p className="text-muted-foreground">
                                                    {field.product?.name}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell id="Cost" className=" p-1">
                                            <p>${field.price}</p>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
