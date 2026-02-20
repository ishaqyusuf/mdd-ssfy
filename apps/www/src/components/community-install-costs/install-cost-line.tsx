import { useCommunityInstallCostRateContext } from "@/hooks/use-community-install-costs";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { INSTALL_COST_DEFAULT_UNITS } from "@community/constants";
import { communityInstallCostRateSchema } from "@community/schema";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { InputGroup, Item, Table } from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { SubmitButton } from "@gnd/ui/submit-button";
import { handleNumberInput } from "@gnd/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller } from "react-hook-form";
import { _qc, _trpc } from "../static-trpc";
import { useState } from "react";

export function InstallCostLine({
    rate,
}: {
    rate: RouterOutputs["community"]["getCommunityInstallCostRates"]["communityInstallCostRates"][number];
    // index: number;
}) {
    const ctx = useCommunityInstallCostRateContext();
    if (ctx.editIndex === rate?.id) return <Form rate={rate} />;
    if (!rate?.id) return null;
    return (
        <Table.Row>
            <Table.Cell>
                <Item.Title>{rate.title}</Item.Title>
            </Table.Cell>
            <Table.Cell>
                <Item.Description>${rate.unitCost}</Item.Description>
            </Table.Cell>
            <Table.Cell>
                <Badge variant="secondary">{rate.unit}</Badge>
            </Table.Cell>
            <Table.Cell className="flex justify-end">
                <Button
                    onClick={(e) => {
                        ctx.setEditIndex(rate.id);
                    }}
                    variant={"outline"}
                    size={"sm"}
                >
                    <Icons.Edit className="h-4 w-4" />
                </Button>
            </Table.Cell>
        </Table.Row>
    );
}

function Form({ rate }) {
    const form = useZodForm(communityInstallCostRateSchema, {
        defaultValues: {
            ...rate,
            id: rate.id == -1 ? null : rate.id,
        },
    });
    const { mutate: handleUpdate, isPending: isUpdating } = useMutation(
        useTRPC().community.updateInstallCostRate.mutationOptions({
            onSuccess() {
                ctx?.setEditIndex(null);
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.community.getCommunityInstallCostRates.queryKey(),
                });
            },
            meta: {
                debug: true,
                toastTitle: {
                    error: "Unable to update",
                    loading: "Updating...",
                    success: "Updated!.",
                },
            },
        }),
    );
    const { data: unitsList } = useQuery(
        useTRPC().community.getInstallCostRateUnits.queryOptions(),
    );
    const [customUnit, setCustomUnit] = useState("");
    const ctx = useCommunityInstallCostRateContext();
    return (
        <Table.Row className="bg-primary/5 hover:bg-primary/5 border-l-4 border-l-primary">
            <Table.Cell>
                <Controller
                    control={form.control}
                    name="title"
                    render={({ field }) => <Input {...field} />}
                />
            </Table.Cell>
            <Table.Cell>
                <Controller
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                        <InputGroup>
                            <InputGroup.Input
                                {...field}
                                onChange={(e) => {
                                    field.onChange(
                                        handleNumberInput(
                                            e.currentTarget.value,
                                        ),
                                    );
                                }}
                                type="number"
                            />
                            <InputGroup.Addon>$</InputGroup.Addon>
                        </InputGroup>
                    )}
                />
            </Table.Cell>
            <Table.Cell>
                <Controller
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                        <ComboboxDropdown
                            className="uppercase"
                            selectedItem={
                                field.value
                                    ? { id: field.value, label: field.value }
                                    : undefined
                            }
                            onCreate={(e) => {
                                setCustomUnit(e?.toUpperCase());
                                field.onChange(e?.toUpperCase());
                            }}
                            renderOnCreate={(value) => {
                                return (
                                    <div className="flex items-center space-x-2">
                                        <span>{`"${value}"`}</span>
                                    </div>
                                );
                            }}
                            placeholder=""
                            items={[customUnit, ...(unitsList || [])]
                                .filter(Boolean)
                                .map((a) => ({
                                    id: a,
                                    label: a,
                                }))}
                            onSelect={(item) => {
                                field.onChange(item.id);
                            }}
                        />
                    )}
                />
            </Table.Cell>
            <Table.Cell className="flex justify-end gap-2">
                <form
                    onSubmit={form.handleSubmit((e) => {
                        handleUpdate(e as any);
                    })}
                >
                    <SubmitButton
                        isSubmitting={isUpdating}
                        // variant={""}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size={"icon"}
                    >
                        <Icons.Check className="h-4 w-4" />
                    </SubmitButton>
                </form>
                <Button
                    type="submit"
                    variant={"destructive"}
                    onClick={(e) => {
                        ctx?.setEditIndex(null);
                    }}
                    size={"icon"}
                >
                    <Icons.Close className="h-4 w-4" />
                </Button>
            </Table.Cell>
        </Table.Row>
    );
}

