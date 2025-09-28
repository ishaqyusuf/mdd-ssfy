import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Suspense } from "react";
import {
    createSchemaBlockContext,
    SchemaBlockProvider,
    useSchemaBlockContext,
} from "./context";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { Reorder } from "framer-motion";
import { reorderList } from "@gnd/utils";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";

interface Props {
    blockId: number;
    children?;
}
export function SchemaBlock(props: Props) {
    return (
        <Suspense fallback={<Skeletons.Dashboard />}>
            <SchemaBlockProvider
                value={createSchemaBlockContext({
                    blockId: props.blockId,
                })}
            >
                <Form />
                {props.children}
            </SchemaBlockProvider>
        </Suspense>
    );
}

function Form({}) {
    const blk = useSchemaBlockContext();
    const { fields, swap, isReorderable } = blk;
    const { mutate } = useMutation(
        _trpc.community.updateRecordsIndicesIndices.mutationOptions({
            meta: null,
        }),
    );
    if (!blk.fields?.length) return <EmptyState onCreate={(e) => {}} />;
    const _reorderList = (newFields: typeof fields) => {
        reorderList({
            newFields,
            oldFields: fields,
            swap,
        });
        mutate({
            recordName: "communityTemplateInputConfig",
            records: newFields.map((f, i) => ({
                id: f.id,
                index: i,
            })),
        });
    };
    return (
        <div>
            <Reorder.Group
                axis="y"
                values={fields}
                onReorder={_reorderList}
                className="!m-0"
            >
                {fields.map((block) => (
                    <Reorder.Item
                        value={block}
                        className="group"
                        key={block._id}
                    >
                        <div className="flex items-center gap-4">
                            {!isReorderable || (
                                <Button
                                    type="button"
                                    className="sopacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent cursor-grab"
                                    // onPointerDown={(e) =>
                                    //     controls.start(e)
                                    // }
                                    variant="ghost"
                                >
                                    <Icons.DragIndicator className="size-5 text-[#878787]" />
                                </Button>
                            )}
                            <Label>{block.inv.name}</Label>
                            <Skeleton className="w-full h-6" />
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </div>
    );
}

