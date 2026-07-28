import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import type { ReactNode } from "react";

export function SelectTag({
    headless,
    onChange,
    selectedId,
    data,
    renderListItem,
}: {
    headless?: boolean;
    onChange: (selected: { id: string; label: string; slug: string }) => void;
    selectedId?: string;
    data;
    renderListItem?: (props: { isChecked: boolean; item: any }) => ReactNode;
}) {
    return (
        <ComboboxDropdown
            headless={headless}
            placeholder="Select tags"
            selectedItem={data.find((tag) => tag.id === selectedId)}
            searchPlaceholder="Search tags"
            items={data}
            renderListItem={renderListItem}
            onSelect={(item) => {
                onChange(item);
            }}
        />
    );
}
