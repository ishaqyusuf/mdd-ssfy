import { Button } from "@gnd/ui/button";
import { Popover } from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/icons";
import { TemplateInputConfig } from "./template-input-config";
import { useState } from "react";
import { Tabs } from "@gnd/ui/custom/tabs";
import { TemplateInputListings } from "./template-input-listings";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { _qc, _trpc } from "@/components/static-trpc";
import { useMutation } from "@tanstack/react-query";
import { useSchemaBlockContext } from "./context";

export function BlockInputConfig({ onInputUpdated, data }) {
    const [formOpen, onFormOpenChange] = useState(false);
    return (
        <Popover.Root open={formOpen} onOpenChange={onFormOpenChange}>
            <Popover.Trigger asChild>
                <Button
                    className="z-30 relative"
                    size="xs"
                    variant={formOpen ? "default" : "secondary"}
                >
                    <Icons.Edit className="size-4" />
                </Button>
            </Popover.Trigger>
            <Popover.Content className="w-80 lg:w-[400px]">
                <Content {...{ onInputUpdated, data }} />
            </Popover.Content>
        </Popover.Root>
    );
}
function Content({ onInputUpdated, data }) {
    const [tab, setTab] = useState("config");
    const ctx = useSchemaBlockContext();
    const { mutate, isPending } = useMutation(
        _trpc.community.deleteInputSchema.mutationOptions({
            onSuccess() {
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getCommunityBlockSchema.queryKey({
                        id: ctx.blockId,
                    }),
                });
            },
        }),
    );
    const _delete = () => {
        mutate({
            id: data.id,
        });
    };
    return (
        <Tabs name="inputConfig" value={tab} onValueChange={setTab}>
            <Tabs.Items className="">
                <Tabs.Item value="config">
                    <span>Config</span>
                    <Tabs.Content>
                        <TemplateInputConfig
                            onInputUpdated={onInputUpdated}
                            input={data}
                        />
                    </Tabs.Content>
                </Tabs.Item>
                <Tabs.Item value="items">
                    <span>Listings</span>
                    <Tabs.Content>
                        <TemplateInputListings />
                    </Tabs.Content>
                </Tabs.Item>
                <Tabs.TabsHeader>
                    <ConfirmBtn type="button" trash onClick={_delete} />
                </Tabs.TabsHeader>
            </Tabs.Items>
        </Tabs>
    );
}

