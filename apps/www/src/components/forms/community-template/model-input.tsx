import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { useTemplateBlocksContext } from "./context";

export function ModelInput() {
    const ctx = useTemplateBlocksContext();
    const { modelEditMode, printMode, templateEditMode } = ctx;
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

