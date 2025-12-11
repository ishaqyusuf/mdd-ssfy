import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "./static-trpc";
import { DropdownMenu, Empty, InputGroup } from "@gnd/ui/composite";
import { Separator } from "@gnd/ui/separator";
import { Button } from "@gnd/ui/button";
import { Building2 } from "lucide-react";

export function Organization() {
    const auth = useAuth();
    const { data } = useQuery(
        _trpc.orgs.getOrganizationProfile.queryOptions(undefined, {})
    );
    const { mutate: createOrg, isPending } = useMutation(
        _trpc.orgs.createOrganizationProfile.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.orgs.getOrganizationProfile.queryKey(undefined),
                });
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
    return (
        <>
            <Separator orientation="vertical" />
            <div className="min-w-56">
                <DropdownMenu.Label className="text-xs text-muted-foreground">
                    Orgs
                </DropdownMenu.Label>
                {!data?.orgs?.length && (
                    <Empty>
                        <Empty.Media>
                            <Building2 className="" />
                        </Empty.Media>
                        <Empty.Content>
                            <span> No Organization yet</span>
                            <p>Create your first organization</p>
                            <InputGroup>
                                <InputGroup.Input placeholder="Organization Name" />
                                <InputGroup.Addon align="inline-end">
                                    <InputGroup.Button variant="default">
                                        Create
                                    </InputGroup.Button>
                                </InputGroup.Addon>
                            </InputGroup>
                        </Empty.Content>
                    </Empty>
                )}
            </div>
        </>
    );
}

