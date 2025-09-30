import * as Sortable from "@gnd/ui/sortable-2";
import { useFieldArray, useForm } from "react-hook-form";
import { closestCorners } from "@dnd-kit/core";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";

export function ExampleSortable({}) {
    const form = useForm({
        defaultValues: {
            items: [
                { name: "a" },
                { name: "b" },
                { name: "c" },
                { name: "b" },
                { name: "e" },
            ],
        },
    });
    const { fields } = useFieldArray({
        control: form.control,
        name: "items",
        keyName: "_id",
    });
    const _reorderList = () => {};
    return (
        <div>
            <Sortable.Root
                orientation="mixed"
                collisionDetection={closestCorners}
                value={fields}
                getItemValue={(item) => item._id}
                onValueChange={_reorderList}
            >
                <Sortable.Content className="grid grid-cols-3 gap-4">
                    {fields.map((field) => (
                        <ExampleSchemaBlock key={field._id} block={field} />
                    ))}
                </Sortable.Content>
                <Sortable.Overlay />
            </Sortable.Root>
        </div>
    );
}

export function ExampleSchemaBlock({ block }) {
    return (
        <Sortable.Item
            value={block._id}
            key={block._id}
            asChild
            className={cn("group")}
        >
            <div className="">
                <Sortable.ItemHandle>
                    <Icons.DragIndicator className="size-5 text-[#878787]" />
                    <span>{block.inv?.title}</span>
                </Sortable.ItemHandle>
            </div>
        </Sortable.Item>
    );
}

