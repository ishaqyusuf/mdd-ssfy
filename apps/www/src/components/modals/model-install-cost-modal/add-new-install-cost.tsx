import { _qc, _trpc } from "@/components/static-trpc";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useAuth } from "@/hooks/use-auth";
import { useBuilderModelInstallsContext } from "@/hooks/use-model-install-config";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Input } from "@gnd/ui/input";
import { Item } from "@gnd/ui/namespace";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

export function AddNewInstallCost() {
    const [showCreateCost, setShowCreateCost] = useState(false);
    const auth = useAuth();
    const trpc = useTRPC();
    const { ...params } = useCommunityInstallCostParams();
    const { data, selectedBuilderTask } = useBuilderModelInstallsContext();
    const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";
    const [newCostDetails, setNewCostDetails] = useState({
        name: "",
        rate: "",
    });
    const { tasks } = useBuilderModelInstallsContext();
    const { data: suggesstions } = useQuery(
        trpc.community.getInstallCostRatesSuggestions.queryOptions(
            {
                builderTaskId: params.selectedBuilderTaskId,
                modelId: params.editCommunityModelInstallCostId,
            },
            {
                enabled:
                    !!params.selectedBuilderTaskId &&
                    !!params?.editCommunityModelInstallCostId,
            },
        ),
    );
    const resetInlineCreate = () => {
        setShowCreateCost(false);
        setNewCostDetails({
            name: "",
            rate: "",
        });
    };
    const handleUpdateCommunityModelInstallTask = (suggesstionId) => {
        const selectedSuggestion = suggesstions?.find(
            (s) => s.id === suggesstionId,
        );
        if (
            tasks?.some((t) => t.installCostModelId === selectedSuggestion?.id)
        ) {
            toast.error("This cost is already added to the task.");
            return;
        }
        updateCommunityModelInstallTask({
            builderTaskId: params.selectedBuilderTaskId,
            communityModelId: params.editCommunityModelInstallCostId,
            installCostModelId: selectedSuggestion.id,
            qty: 0,
        });
    };
    const { mutate: updateCommunityModelInstallTask, isPending: isUpdating } =
        useMutation(
            useTRPC().community.updateCommunityModelInstallTask.mutationOptions(
                {
                    onSuccess() {
                        _qc.invalidateQueries({
                            queryKey:
                                _trpc.community.getModelInstallTasksByBuilderTask.queryKey(
                                    {
                                        builderTaskId:
                                            params.selectedBuilderTaskId!,
                                        modelId:
                                            params.editCommunityModelInstallCostId!,
                                    },
                                ),
                        });
                        // setParams({
                        //     editCommunityModelInstallCostId: null,
                        //     selectedBuilderTaskId: null,
                        // });
                    },
                },
            ),
        );
    const { mutate: createInstallCostRate, isPending: isCreatingRate } =
        useMutation(
            trpc.community.updateInstallCostRate.mutationOptions({
                onSuccess(createdRate) {
                    _qc.invalidateQueries({
                        queryKey:
                            _trpc.community.getInstallCostRatesSuggestions.queryKey(
                                {
                                    builderTaskId: params.selectedBuilderTaskId!,
                                    modelId:
                                        params.editCommunityModelInstallCostId!,
                                },
                            ),
                    });
                    _qc.invalidateQueries({
                        queryKey:
                            _trpc.community.getCommunityInstallCostRates.queryKey(),
                    });
                    updateCommunityModelInstallTask({
                        builderTaskId: params.selectedBuilderTaskId,
                        communityModelId:
                            params.editCommunityModelInstallCostId,
                        installCostModelId: createdRate.id,
                        qty: 0,
                    });
                    resetInlineCreate();
                },
                onError() {
                    toast.error("Unable to create install cost.");
                },
            }),
        );
    const handleCreateAndAddCost = () => {
        const title = newCostDetails.name.trim();
        const unitCost = Number(newCostDetails.rate);
        if (!title) {
            toast.error("Title is required.");
            return;
        }
        if (!Number.isFinite(unitCost) || unitCost < 0) {
            toast.error("Enter a valid unit cost.");
            return;
        }
        createInstallCostRate({
            id: null,
            title,
            unit: "",
            unitCost,
            status: "active",
        });
    };
    return (
        <div className="py-6 border-dashed border-border flex flex-col mt-4 bg-muted/5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Add Install Task for {data?.builderName} -{" "}
                {selectedBuilderTask?.taskName}
            </h4>
            {!showCreateCost ? (
                <div className="flex gap-2 relative">
                    {/* <div className="relative flex-1">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            size={14}
                        />
                        <input
                            type="text"
                            placeholder="Search global costs..."
                            value={costSearchQuery}
                            onChange={(e) => setCostSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                        {costSearchQuery && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                                {unassociatedCosts.length > 0 ? (
                                    unassociatedCosts.map((cost) => (
                                        <button
                                            key={cost.id}
                                            onClick={() =>
                                                handleAddExistingCost(cost.id)
                                            }
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex justify-between items-center border-b border-border last:border-0"
                                        >
                                            <span>{cost.name}</span>
                                            <span className="text-xs font-bold text-muted-foreground">
                                                ${cost.cost}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                                        No matching costs found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div> */}
                    <div className="flex-1">
                        <ComboboxDropdown
                            className="uppercase"
                            placeholder="Search global costs..."
                            renderListItem={({ item }) => (
                                <Item
                                    size="sm"
                                    className="w-full border-0 px-0 py-0"
                                >
                                    <Item.Content className="min-w-0">
                                        <Item.Title className="w-full truncate">
                                            {item.label}
                                        </Item.Title>
                                        <Item.Description>
                                            ${item.data.unitCost}
                                            {item.data.unit
                                                ? ` / ${item.data.unit}`
                                                : ""}
                                        </Item.Description>
                                    </Item.Content>
                                </Item>
                            )}
                            items={[...(suggesstions || [])]
                                .filter(Boolean)
                                .map((a) => ({
                                    id: String(a.id),
                                    label: String(a.title),
                                    data: a,
                                }))}
                            showCreateWhenMatches={isSuperAdmin}
                            onCreate={
                                isSuperAdmin
                                    ? (value) => {
                                          setShowCreateCost(true);
                                          setNewCostDetails({
                                              name: value.toUpperCase(),
                                              rate: "",
                                          });
                                      }
                                    : undefined
                            }
                            renderOnCreate={
                                isSuperAdmin
                                    ? (value) => (
                                          <div className="flex items-center space-x-2">
                                              <span>{`Create "${value}"`}</span>
                                          </div>
                                      )
                                    : undefined
                            }
                            onSelect={(item) => {
                                handleUpdateCommunityModelInstallTask(
                                    item.data.id,
                                );
                            }}
                        />
                    </div>
                    {isSuperAdmin ? (
                        <Button
                            onClick={() => setShowCreateCost(true)}
                            className=""
                        >
                            Create New
                        </Button>
                    ) : null}
                </div>
            ) : (
                <div className="animate-in fade-in zoom-in-95 duration-200 rounded-xl border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Create Global Cost
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={resetInlineCreate}
                            aria-label="Cancel create cost"
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                        <div className="md:col-span-7">
                            <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">
                                Title
                            </label>
                            <Input
                                className="h-9"
                                value={newCostDetails.name}
                                onChange={(e) =>
                                    setNewCostDetails({
                                        ...newCostDetails,
                                        name: e.target.value,
                                    })
                                }
                                placeholder="e.g. SPECIAL INSTALL"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">
                                Unit Cost
                            </label>
                            <Input
                                type="number"
                                className="h-9"
                                value={newCostDetails.rate}
                                onChange={(e) =>
                                    setNewCostDetails({
                                        ...newCostDetails,
                                        rate: e.target.value,
                                    })
                                }
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex gap-2 md:col-span-2">
                            <Button
                                onClick={handleCreateAndAddCost}
                                disabled={isCreatingRate || isUpdating}
                                className="flex-1"
                                size="sm"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
