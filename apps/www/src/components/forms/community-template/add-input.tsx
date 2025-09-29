import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Menu } from "@gnd/ui/custom/menu";
import Portal from "@gnd/ui/custom/portal";
import { Icons } from "@gnd/ui/icons";
import { useSchemaBlockContext, useTemplateBlocksContext } from "./context";
import { useMutation } from "@tanstack/react-query";
import { _invalidate, _qc, _trpc } from "@/components/static-trpc";
import { uniqueList } from "@gnd/utils";
import { labelIdOptions } from "@/lib/utils";

interface CreateProps {
    uid?: string;
    title?: string;
}
export function AddInput({ nodeId }) {
    const blk = useSchemaBlockContext();
    const temp = useTemplateBlocksContext();
    const { blockInputs } = temp;
    const { mutate } = useMutation(
        _trpc.inventories.createCommunityInput.mutationOptions({
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
            categoryId: temp.communityCategory?.id,
            title: props.title,
            uid: props.uid,
        });
    };
    const reusables = uniqueList(
        blockInputs?.map((a) => ({
            ...a,
            title: a?.inv?.name!,
        })),
        "uid",
    );
    return (
        <Portal nodeId={nodeId}>
            <Menu
                noSize
                Trigger={
                    <Button variant="secondary" size="sm">
                        <Icons.Add className="" />
                    </Button>
                }
            >
                <ComboboxDropdown
                    placeholder="Add community input"
                    items={labelIdOptions(reusables, "title", "uid")}
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
                    renderOnCreate={(value) => {
                        return (
                            <div className="flex items-center space-x-2">
                                <span>{`Create "${value}"`}</span>
                            </div>
                        );
                    }}
                />
            </Menu>
        </Portal>
    );
}

