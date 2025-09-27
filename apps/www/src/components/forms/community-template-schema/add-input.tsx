import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Menu } from "@gnd/ui/custom/menu";
import Portal from "@gnd/ui/custom/portal";
import { Icons } from "@gnd/ui/icons";
import { useSchemaBlockContext } from "./context";

export function AddInput({ nodeId }) {
    const blk = useSchemaBlockContext();
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
                    items={[]}
                    headless
                    onSelect={(e) => {}}
                    onCreate={(e) => {}}
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

