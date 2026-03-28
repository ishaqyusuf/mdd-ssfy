"use client";

import { useMemo } from "react";
import { ComboboxDropdown, ComboboxItem } from "@gnd/ui/combobox-dropdown";
import { Label } from "@gnd/ui/label";
import { cn } from "@gnd/ui/cn";
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
    const { form, suggestions } = useCommunityTemplateV1();
    const currentValue = form.watch(formKey as any) || "";
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
                "max-md:flex-col max-md:items-start max-md:gap-1",
            )}
        >
            <Label
                className={cn(
                    "shrink-0 text-right capitalize",
                    "w-[100px]",
                    "max-md:w-full max-md:text-left max-md:text-xs max-md:font-semibold",
                )}
            >
                {label}
            </Label>
            <div className="flex-1 w-full">
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
            </div>
        </div>
    );
}
