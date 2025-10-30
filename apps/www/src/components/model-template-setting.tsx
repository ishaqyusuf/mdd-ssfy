import { updateCommunityVersion } from "@/actions/community/update-community-version";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@gnd/ui/button";
import { Field, Popover, Select } from "@gnd/ui/composite";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { Settings } from "lucide-react";
import z from "zod";

interface Props {
    slug: String;
    id: number;
    defaultValues: {
        version?: string;
    };
}
export function ModelTemplateSetting(props: Props) {
    const form = useZodForm(
        z.object({
            version: z.string(),
        }),
        {
            defaultValues: {
                ...(props?.defaultValues || {}),
            },
        }
    );
    const updateVersion = async (d) => {
        await updateCommunityVersion(props.id, d);

        form.setValue("version", d);
    };
    const version = form.watch("version");
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <Button variant="secondary">
                    <Icons.Settings className="size-4" />
                </Button>
            </Popover.Trigger>
            <Popover.Content>
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="leading-none font-medium">
                            Configuration
                        </h4>
                        <p className="text-muted-foreground text-sm">
                            Set model configuration
                        </p>
                    </div>
                    <Field>
                        <Field.Label>Default Version</Field.Label>
                        <Select.Root
                            value={version}
                            onValueChange={updateVersion}
                        >
                            <Select.Trigger>
                                <Select.Value placeholder="Default Version" />
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="v1">V1</Select.Item>
                                <Select.Item value="v2">V2</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </Field>
                </div>
            </Popover.Content>
        </Popover.Root>
    );
}

