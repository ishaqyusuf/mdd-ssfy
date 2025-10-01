import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import {
    useTemplateSchemaInputContext,
    useTemplateSchemaContext,
} from "./context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { useState } from "react";
import { labelIdOptions } from "@/lib/utils";

export function ModelInput() {
    const ctx = useTemplateSchemaContext();
    const { modelEditMode, printMode, templateEditMode } = ctx;
    const { input } = useTemplateSchemaInputContext();
    const [searchEnabled, setSearchEnabled] = useState(false);
    const { data: listings, isPending } = useQuery(
        _trpc.community.getTemplateInputListings.queryOptions(
            {
                inputInventoryId: input.inv.id,
            },
            {
                enabled: !templateEditMode && searchEnabled,
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
    if (templateEditMode) return null;
    return (
        <ComboboxDropdown
            placeholder=""
            items={labelIdOptions(listings, "title", "uid")}
            openChanged={(e) => {
                if (e) setSearchEnabled(true);
            }}
            onSelect={(e) => {}}
            onCreate={create}
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

