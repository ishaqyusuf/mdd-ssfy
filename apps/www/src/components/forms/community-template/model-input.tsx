import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";

export function ModelInput() {
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

