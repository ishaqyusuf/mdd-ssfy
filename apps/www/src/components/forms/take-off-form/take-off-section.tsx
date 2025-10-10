import { createContext, useContext, useState } from "react";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import FormInput from "@/components/common/controls/form-input";
import { useFieldArray } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

import { AddTakeOffComponent } from "./add-take-off-component";
import { useTakeOffForm } from "./take-off-form";
import { SortDescIcon } from "lucide-react";

interface Props {
    index: number;
}
const Context = createContext<ReturnType<typeof useTakeOffSectionCtx>>(
    null as any,
);
const useTakeOffSectionCtx = (sectionIndex) => {
    const ctx = useTakeOffForm();
    const [opened, setOpened] = useState(true);
    const componentsArray = useFieldArray({
        control: ctx.form.control,
        name: `list.${sectionIndex}.components`,
        keyName: "_id",
    });
    function addComponentToList(itemUid, qty) {
        componentsArray.append({
            itemUid,
            qty,
        });
    }
    return {
        opened,
        setOpened,
        ...componentsArray,
        addComponentToList,
        ctx,
        sectionIndex,
    };
};
export const useTakeOffSection = () => useContext(Context);
export function TakeOffSection({ index }: Props) {
    const takeOffCtx = useTakeOffSectionCtx(index);
    const { opened, setOpened, ctx, fields } = takeOffCtx;

    return (
        <Context.Provider value={takeOffCtx}>
            {" "}
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
                            <SortDescIcon className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div className="border-b-2">
                        <div className="divide-y font-mono$ text-sm">
                            {fields.map((component, index) => (
                                <TakeOffSectionComponent
                                    key={component?._id}
                                    index={index}
                                />
                            ))}
                        </div>

                        <AddTakeOffComponent />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Context.Provider>
    );
}
function TakeOffSectionComponent({ index }) {
    const takeOffCtx = useTakeOffSection();
    const takeOffComponent = takeOffCtx?.fields?.[index] as any;
    const component = takeOffCtx?.ctx?.components?.find(
        (a) => a.itemControlUid == takeOffComponent?.itemUid,
    );
    // const noHandle = !takeOffComponent?.qty?.lh && !takeOffComponent?.qty?.rh;

    return (
        <div className="p-1" key={takeOffComponent?._id}>
            <div className="uppercase">
                <TCell.Primary>
                    {index + 1}
                    {". "}
                    {component?.title}
                </TCell.Primary>
                <TCell.Secondary className="flex ">
                    <div className="flex">
                        {[
                            component?.sectionTitle,
                            component?.subtitle,
                            component?.swing,
                        ]
                            ?.filter((a) => a)
                            ?.join(" | ")}
                    </div>
                </TCell.Secondary>
            </div>
        </div>
    );
}
