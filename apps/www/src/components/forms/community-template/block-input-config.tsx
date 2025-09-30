import { Button } from "@gnd/ui/button";
import { Popover } from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/icons";
import { TemplateInputConfig } from "./template-input-config";
import { useState } from "react";

export function BlockInputConfig({ onInputUpdated, data }) {
    const [formOpen, onFormOpenChange] = useState(false);
    return (
        <Popover.Root open={formOpen} onOpenChange={onFormOpenChange}>
            <Popover.Trigger asChild>
                <Button size="xs" variant="secondary">
                    <Icons.Edit className="size-4" />
                </Button>
            </Popover.Trigger>
            <Popover.Content className="w-80">
                <TemplateInputConfig
                    onInputUpdated={onInputUpdated}
                    input={data}
                />
            </Popover.Content>
        </Popover.Root>
    );
}

