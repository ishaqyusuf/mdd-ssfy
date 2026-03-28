"use client";

import { useMemo } from "react";
import { ComboboxDropdown, ComboboxItem } from "@gnd/ui/combobox-dropdown";
import { Label } from "@gnd/ui/label";
import { cn } from "@gnd/ui/cn";
import { Input } from "@gnd/ui/input";
import { useMediaQuery } from "@gnd/ui/hooks";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useCommunityTemplateV1 } from "./context";

interface DesignInputProps {
    formKey: string;
    label: string;
    labelCols?: number;
    inputCols?: number;
}

export function DesignInput({
    formKey,
    label,
    labelCols = 2,
    inputCols = 10,
}: DesignInputProps) {
    const { form, suggestions, autocompleteEnabled } = useCommunityTemplateV1();
    const { editCommunityModelInstallCostId, openToSide } =
        useCommunityInstallCostParams();
    const isMdToLg = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");
    const currentValue = form.watch(formKey as any) || "";
    const shouldStackLabel =
        Boolean(openToSide && editCommunityModelInstallCostId) && isMdToLg;
    const items: ComboboxItem[] = useMemo(() => {
        const suggestionKey = formKey.replace(".", "");
        const values = suggestions[suggestionKey] || [];
        return values.map((v) => ({
            id: v,
            label: v,
        }));
    }, [suggestions, formKey]);

    const selectedItem = useMemo(() => {
        if (!currentValue) return undefined;
        return { id: currentValue, label: currentValue } as ComboboxItem;
    }, [currentValue]);

    return (
        <div
            className={cn(
                "flex items-center gap-2",
                "max-sm:flex-col max-sm:items-start max-sm:gap-1",
                shouldStackLabel && "flex-col items-start gap-1",
            )}
        >
            <Label
                className={cn(
                    "shrink-0 text-right capitalize",
                    "w-[100px]",
                    "max-sm:w-full max-sm:text-left max-sm:text-xs max-sm:font-semibold",
                    shouldStackLabel &&
                        "w-full text-left text-xs font-semibold",
                )}
            >
                {label}
            </Label>
            <div className="flex-1 w-full">
                {autocompleteEnabled ? (
                    <ComboboxDropdown
                        placeholder=""
                        items={items}
                        selectedItem={selectedItem}
                        onSelect={(item) => {
                            form.setValue(formKey as any, item.label);
                        }}
                        className="uppercase"
                        onCreate={(value) => {
                            form.setValue(formKey as any, value.toUpperCase());
                        }}
                        searchPlaceholder="Search or type..."
                        renderSelectedItem={(item) => (
                            <span className="uppercase">{item.label}</span>
                        )}
                        renderOnCreate={(value) => (
                            <div className="flex items-center space-x-2">
                                <span>{`Use "${value}"`}</span>
                            </div>
                        )}
                    />
                ) : (
                    <Input
                        value={currentValue}
                        onChange={(event) => {
                            form.setValue(
                                formKey as any,
                                event.target.value.toUpperCase(),
                            );
                        }}
                        className="uppercase"
                    />
                )}
            </div>
        </div>
    );
}
