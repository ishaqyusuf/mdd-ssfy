import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";

export function SelectTag({
    headless,
    onChange,
    selectedId,
    data,
}: {
    headless?: boolean;
    onChange: (selected: { id: string; label: string; slug: string }) => void;
    selectedId?: string;
    data;
}) {
    return (
        <ComboboxDropdown
            headless={headless}
            placeholder="Select tags"
            selectedItem={data.find((tag) => tag.id === selectedId)}
            searchPlaceholder="Search tags"
            items={data}
            onSelect={(item) => {
                console.log({ item, data });
                onChange(item);
            }}
        />
    );
}
