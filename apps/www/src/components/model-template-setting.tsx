"use client";

import { updateCommunityVersion } from "@/actions/community/update-community-version";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useCommunityTemplateV1 } from "@/components/forms/community-template-v1/context";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@gnd/ui/button";
import { DropdownMenu, Field, Select } from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import { Switch } from "@gnd/ui/switch";
import { isCommunityUnitRole } from "@gnd/utils/constants";
import z from "zod";

interface Props {
    slug: String;
    id: number;
    pivotModelCostId;
    defaultValues: {
        version?: string;
    };
}
export function ModelTemplateSetting(props: Props) {
    const auth = useAuth();
    const isCommunityUnit = isCommunityUnitRole(auth.role?.name);
    const { autocompleteEnabled, setAutocompleteEnabled } =
        useCommunityTemplateV1();
    const form = useZodForm(
        z.object({
            version: z.string(),
        }),
        {
            defaultValues: {
                ...(props?.defaultValues || {}),
            },
        },
    );
    const updateVersion = async (d) => {
        await updateCommunityVersion(props.id, d);

        form.setValue("version", d);
    };
    const version = form.watch("version");
    const { setParams } = useCommunityInstallCostParams();
    const { setParams: setModelCostParams } = useCommunityModelCostParams();
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button variant="secondary">
                    <Icons.Settings className="size-4" />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="w-60" align="end">
                <div className="grid p-4 gap-4">
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
                    <Field>
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                                <Field.Label>Auto-complete</Field.Label>
                                <p className="text-muted-foreground text-xs">
                                    Use suggestions while filling template fields.
                                </p>
                            </div>
                            <Switch
                                checked={autocompleteEnabled}
                                onCheckedChange={setAutocompleteEnabled}
                                aria-label="Toggle auto-complete mode"
                            />
                        </div>
                    </Field>
                </div>
                <DropdownMenu.Separator />
                {isCommunityUnit ? null : (
                    <DropdownMenu.Item
                        onClick={(e) => {
                            setParams({
                                editCommunityModelInstallCostId: props.id,
                            });
                        }}
                        className="justify-start gap-2"
                    >
                        <Icons.Settings className="size-4" />
                        Install Cost
                    </DropdownMenu.Item>
                )}
                <DropdownMenu.Item
                    onClick={() => {
                        setModelCostParams({
                            editModelCostTemplateId: props.id,
                            editModelCostId: props.pivotModelCostId || -1,
                        });
                    }}
                    className="justify-start gap-2"
                >
                    <Icons.Tag className="size-4" />
                    Model Cost
                </DropdownMenu.Item>
                <DropdownMenu.Item disabled className="justify-start gap-2">
                    <Icons.Eye className="size-4" />
                    Preview
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
