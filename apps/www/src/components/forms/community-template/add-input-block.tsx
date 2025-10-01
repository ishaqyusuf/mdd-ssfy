import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { useSchemaBlockContext, useTemplateBlocksContext } from "./context";
import { useMutation } from "@tanstack/react-query";
import { _invalidate, _qc, _trpc } from "@/components/static-trpc";
import { selectOptions, uniqueList } from "@gnd/utils";
import { labelIdOptions } from "@/lib/utils";
import { useState } from "react";
import { EditInputBlock } from "./edit-input-block";

interface CreateProps {
    uid?: string;
    title?: string;
}
export function AddInput() {
    const blk = useSchemaBlockContext();
    const temp = useTemplateBlocksContext();
    const { blockInputs } = temp;
    const { modelEditMode, printMode, templateEditMode } = temp;

    const { mutate } = useMutation(
        _trpc.inventories.saveCommunityInput.mutationOptions({
            onSuccess(data, variables, context) {
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getCommunityBlockSchema.queryKey({
                        id: blk.blockId,
                    }),
                });
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getBlockInputs.queryKey({}),
                });
            },
        }),
    );
    const create = (props: CreateProps) => {
        mutate({
            blockId: blk.blockId,
            title: props.title,
            uid: props.uid,
        });
    };
    const reusables = uniqueList(
        blockInputs?.map((a) => ({
            ...a,
        })),
        "uid",
    );
    const onEdit = (uid) => {
        setEditUId(uid);
    };
    const [editUId, setEditUId] = useState(null);
    const [opened, setOpened] = useState(false);
    if (!templateEditMode) return null;
    return (
        <Menu
            onOpenChanged={(e) => {
                setEditUId(null);
                setOpened(e);
            }}
            open={opened}
            noSize
            Trigger={
                <Button variant="secondary" size="sm">
                    <Icons.Add className="" />
                </Button>
            }
        >
            {editUId ? (
                <>
                    <EditInputBlock uid={editUId} />
                </>
            ) : (
                <ComboboxDropdown
                    placeholder="Add community input"
                    items={labelIdOptions(reusables, "inv.name", "uid") as any}
                    // items={[]}
                    headless
                    onSelect={(e) => {
                        create({
                            uid: e.id,
                        });
                    }}
                    onCreate={(e) => {
                        create({
                            title: e,
                        });
                    }}
                    searchPlaceholder="Find or create..."
                    renderListItem={(item) => {
                        return (
                            <div className="flex items-center justify-between w-full group">
                                <span>{item.item.label}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.(item.item.id);
                                    }}
                                    className="text-xs opacity-0 group-hover:opacity-50 hover:opacity-100"
                                >
                                    Edit
                                </button>
                            </div>
                        );
                    }}
                    renderOnCreate={(value) => {
                        return (
                            <div className="flex items-center space-x-2">
                                <span>{`Create "${value}"`}</span>
                            </div>
                        );
                    }}
                />
            )}
        </Menu>
    );
}

