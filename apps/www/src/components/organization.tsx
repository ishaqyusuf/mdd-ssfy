import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "./static-trpc";
import { DropdownMenu, Empty, InputGroup, Item } from "@gnd/ui/composite";
import { Separator } from "@gnd/ui/separator";
import { Button } from "@gnd/ui/button";
import { Building2 } from "lucide-react";
import { useZodForm } from "@/hooks/use-zod-form";
import z from "zod";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Fragment } from "react";
import { SwitchIcon } from "@radix-ui/react-icons";

export function Organization() {
    const auth = useAuth();
    const { data } = useQuery(
        _trpc.orgs.getOrganizationProfile.queryOptions(undefined, {})
    );
    const defaultValues = {
        id: null,
        name: "",
        opened: false,
    };
    const switchTo = (org) => {
        //
    };
    const form = useZodForm(
        z.object({
            id: z.number().optional().nullable(),
            name: z.string(),
            opened: z.boolean().optional().nullable(),
        }),
        {
            defaultValues,
        }
    );
    const opened = form.watch("opened");
    const { mutate: createOrg, isPending } = useMutation(
        _trpc.orgs.createOrganizationProfile.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.orgs.getOrganizationProfile.queryKey(undefined),
                });
                form.reset(defaultValues);
            },
            onError(error, variables, onMutateResult, context) {},
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        })
    );
    const isSuperAdmin = auth.roleTitle === "Super Admin";
    // return null;
    if (!isSuperAdmin) return null;
    const FormContent = (
        <InputGroup>
            <InputGroup.Input
                {...form.register("name")}
                placeholder="Organization Name"
            />
            <InputGroup.Addon align="inline-end">
                <InputGroup.Button
                    onClick={form.handleSubmit((data) =>
                        createOrg({
                            name: data.name,
                            primary: !data?.orgs?.length,
                        })
                    )}
                    variant="default"
                >
                    Create
                </InputGroup.Button>
                <InputGroup.Button
                    onClick={(e) => {
                        form.reset(defaultValues);
                    }}
                    variant="outline"
                >
                    <Icons.Close />
                </InputGroup.Button>
            </InputGroup.Addon>
        </InputGroup>
    );
    return (
        <>
            <Separator orientation="vertical" />
            <div className="w-xs flex flex-col gap-4">
                <DropdownMenu.Label className="text-xs text-muted-foreground">
                    Orgs
                </DropdownMenu.Label>
                {!data?.orgs?.length ? (
                    <Empty>
                        <Empty.Media>
                            <Building2 className="" />
                        </Empty.Media>
                        <Empty.Content>
                            <span> No Organization yet</span>
                            <p>Create your first organization</p>
                            {FormContent}
                        </Empty.Content>
                    </Empty>
                ) : (
                    <>
                        {opened ? (
                            <>{FormContent}</>
                        ) : (
                            <>
                                <Item.Group className={cn()}>
                                    {data?.orgs?.map((org) => (
                                        <Fragment key={org.id}>
                                            <Item size="xs">
                                                <Item.Content>
                                                    <Item.Title>
                                                        {org.name}
                                                    </Item.Title>
                                                </Item.Content>
                                                <Item.Actions>
                                                    <SwitchIcon className="" />
                                                </Item.Actions>
                                            </Item>
                                            <Separator />
                                        </Fragment>
                                    ))}
                                </Item.Group>
                                <Button
                                    onClick={(e) => {
                                        form.reset({
                                            opened: true,
                                            name: "",
                                            id: null,
                                        });
                                    }}
                                    className="w-full"
                                    size="sm"
                                >
                                    <Icons.Add />
                                </Button>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

