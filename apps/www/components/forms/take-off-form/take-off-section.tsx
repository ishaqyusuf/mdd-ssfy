import { useState } from "react";
import FormInput from "@/components/common/controls/form-input";
import { Table } from "@/components/ui/table";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { useFieldArray } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { TableBody, TableCell, TableRow } from "@gnd/ui/table";

import { AddTakeOffComponent } from "./add-take-off-component";
import { useTakeOffForm } from "./take-off-form";

interface Props {
    index: number;
}
export function TakeOffSection({ index }: Props) {
    const ctx = useTakeOffForm();
    const [opened, setOpened] = useState(true);
    const componentsArray = useFieldArray({
        control: ctx.form.control,
        name: `list.${index}.components`,
        keyName: "_id",
    });
    return (
        <Collapsible open={opened} onOpenChange={setOpened}>
            <div className="flex w-full py-2">
                <div className="flex-1">
                    <FormInput
                        className="uppercase"
                        control={ctx.form.control}
                        name={`list.${index}.title`}
                        placeholder="Take off title..."
                    />
                </div>
                <CollapsibleTrigger asChild className="p-0 text-sm">
                    <Button
                        onClick={(e) => setOpened(!opened)}
                        variant={opened ? "secondary" : "ghost"}
                        size="icon"
                    >
                        <CaretSortIcon className="h-4 w-4" />
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
                <div className="border-b-2 p-4">
                    <Table>
                        <TableBody>
                            {componentsArray.fields.map((component) => (
                                <TableRow key={component?._id}>
                                    <TableCell></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <AddTakeOffComponent listIndex={index} />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
