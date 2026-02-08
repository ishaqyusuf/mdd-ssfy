import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useBuilderModelInstallsContext } from "@/hooks/use-model-install-config";
import { useTRPC } from "@/trpc/client";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function AddNewInstallCost() {
    // const ctx = useBuilderModelInstallsContext();
    const [showCreateCost, setShowCreateCost] = useState(false);
    const [costSearchQuery, setCostSearchQuery] = useState("");
    const { setParams, ...params } = useCommunityInstallCostParams();
    const unassociatedCosts = [];
    const handleAddExistingCost = (costId) => {};
    const [newCostDetails, setNewCostDetails] = useState({
        name: "",
        rate: "",
        unit: "",
    });
    const handleCreateAndAddCost = () => {};
    const { data: suggesstions } = useQuery(
        useTRPC().community.getInstallCostRatesSuggestions.queryOptions(
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
    return (
        <div className="p-6 border-t border-dashed border-border mt-4 bg-muted/5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Add Cost to Task
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
                    <ComboboxDropdown
                        className="uppercase"
                        // selectedItem={
                        //     field.value
                        //         ? { id: field.value, label: field.value }
                        //         : undefined
                        // }
                        // onCreate={(e) => {
                        //     // setCustomUnit(e?.toUpperCase());
                        //     // field.onChange(e?.toUpperCase());
                        // }}
                        // renderOnCreate={(value) => {
                        //     return (
                        //         <div className="flex items-center space-x-2">
                        //             <span>{`"${value}"`}</span>
                        //         </div>
                        //     );
                        // }}
                        renderListItem={({ item }) => (
                            <div className="flex justify-between items-center w-full">
                                <span>{item.label}</span>
                                <span className="text-xs font-bold text-muted-foreground">
                                    ${item.data.unitCost}
                                    {item.data.unit ? `/${item.data.unit}` : ""}
                                </span>
                            </div>
                        )}
                        placeholder=""
                        items={[...(suggesstions || [])]
                            .filter(Boolean)
                            .map((a) => ({
                                id: String(a.id),
                                label: String(a.title),
                                data: a,
                            }))}
                        onSelect={(item) => {}}
                    />
                    <button
                        onClick={() => setShowCreateCost(true)}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold border border-border hover:bg-secondary/80 transition-colors"
                    >
                        Create New
                    </button>
                </div>
            ) : (
                <div className="p-4 bg-background border border-border rounded-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Cost Name
                            </label>
                            <input
                                className="w-full h-9 px-3 rounded-lg border border-input bg-muted/30 text-sm focus:ring-2 focus:ring-primary outline-none"
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
                        <div className="col-span-3">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Rate ($)
                            </label>
                            <input
                                type="number"
                                className="w-full h-9 px-3 rounded-lg border border-input bg-muted/30 text-sm focus:ring-2 focus:ring-primary outline-none"
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
                        {/* <div className="col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Unit
                            </label>
                            <select
                                className="w-full h-9 px-2 rounded-lg border border-input bg-muted/30 text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newCostDetails.unit}
                                onChange={(e) =>
                                    setNewCostDetails({
                                        ...newCostDetails,
                                        unit: e.target.value,
                                    })
                                }
                            >
                                <option value="LF">LF</option>
                                <option value="EA">EA</option>
                                <option value="SET">SET</option>
                            </select>
                        </div> */}
                        <div className="col-span-2 flex gap-1">
                            <button
                                onClick={handleCreateAndAddCost}
                                className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => setShowCreateCost(false)}
                                className="flex-1 h-9 bg-muted text-muted-foreground rounded-lg text-xs font-bold hover:text-foreground"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

