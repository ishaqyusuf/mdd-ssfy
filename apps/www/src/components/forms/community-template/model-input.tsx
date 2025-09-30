import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { useBlockInputContext, useTemplateBlocksContext } from "./context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";

export function ModelInput() {
    const ctx = useTemplateBlocksContext();
    const { modelEditMode, printMode, templateEditMode } = ctx;
    const { input } = useBlockInputContext();
    const { data: listings } = useQuery(
        _trpc.community.getTemplateInputListings.queryOptions({}),
    );
    const { mutate } = useMutation(
        _trpc.community.createTemplateInputLisiting.mutationOptions({
            onSuccess(data, variables, context) {
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getTemplateInputListings.queryKey(
                        {
                            inputInventoryId: input.inv.id,
                        },
                    ),
                });
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getBlockInputs.queryKey({}),
                });
            },
        }),
    );
    const create = (title) => {
        mutate({
            uid: input.uid,
            title,
        });
    };
    if (templateEditMode) return null;
    return (
        <ComboboxDropdown
            placeholder=""
            items={[]}
            onSelect={(e) => {}}
            onCreate={(e) => {}}
            searchPlaceholder="Find or create..."
            renderOnCreate={(value) => {
                return (
                    <div className="flex items-center space-x-2">
                        <span>{`Create "${value}"`}</span>
                    </div>
                );
            }}
        />
    );
}

