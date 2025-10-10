import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import {
    useTemplateSchemaInputContext,
    useTemplateSchemaContext,
    useTemplateSchemaBlock,
} from "./context";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { _qc, _trpc } from "@/components/static-trpc";
import { useEffect, useMemo, useState } from "react";
import { cn, labelIdOptions } from "@/lib/utils";
import { QuantityInput } from "@gnd/ui/quantity-input";
import { useCommunityModelStore } from "@/store/community-model";

export function ModelInput() {
    const ctx = useTemplateSchemaContext();
    const { modelEditMode, printMode, templateEditMode } = ctx;
    const { _blockId } = useTemplateSchemaBlock();
    const { input, inputIndex, value, setValue, setValueId } =
        useTemplateSchemaInputContext();
    const [searchEnabled, setSearchEnabled] = useState(false);
    const store = useCommunityModelStore();
    const isNumber = input.inputType === "number";
    const { data: listings, isPending } = useQuery(
        _trpc.community.getTemplateInputListings.queryOptions(
            {
                inputInventoryId: input.inv.id,
            },
            {
                enabled: !templateEditMode && searchEnabled && !isNumber,
            },
        ),
    );
    const { mutate } = useMutation(
        _trpc.community.saveTemplateInputListing.mutationOptions({
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
                setSelection(data);
                setValueId(+data.id);
            },
        }),
    );
    const create = (title) => {
        mutate({
            uid: input.uid,
            title,
            inputBlockInventoryId: input.inv.id,
        });
    };
    const [selection, setSelection] = useState(input?._formMeta?.selection);

    if (templateEditMode) return null;
    if (isNumber)
        return (
            <>
                <QuantityInput
                    onChange={setValue}
                    value={value}
                    className={cn()}
                    min={0}
                />
            </>
        );

    return (
        <ComboboxDropdown
            placeholder=""
            items={listings}
            openChanged={(e) => {
                if (e) setSearchEnabled(true);
            }}
            selectedItem={selection}
            onSelect={(e) => {
                setSelection(e);
                setValueId(+e.id);
            }}
            className="uppercase"
            onCreate={create}
            searchPlaceholder="Find or create..."
            renderSelectedItem={(item) => (
                <span className="uppercase">{item.label}</span>
            )}
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

