import { useTRPC } from "@/trpc/client";
import {
    useMutation,
    useQueryClient,
    useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { DoorSupplierForm } from "./door-supplier-form";
import { Table } from "@gnd/ui/custom/data-table/index";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { saveSupplierSchema } from "@api/db/queries/sales-form";
import { StepHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { cn } from "@gnd/ui/cn";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
export function DoorSuppliers({ itemStepUid }) {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <Content itemStepUid={itemStepUid} />
        </Suspense>
    );
}
export function Content({ itemStepUid }) {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.sales.getSuppliers.queryOptions({}));
    const [supplierFormData, setSupplierFormData] =
        useState<typeof saveSupplierSchema._type>(null);

    const qc = useQueryClient();
    // const ctx = useStepContext(itemStepUid);
    // ctx.tabComponents.

    const stepClass = new StepHelperClass(itemStepUid);
    const door = stepClass.getDoorStepForm();
    const { mutate: deleteSupplier, isPending: isDeletingSupplier } =
        useMutation(
            trpc.sales.deleteSupplier.mutationOptions({
                onSuccess(data, variables, context) {
                    qc.invalidateQueries({
                        queryKey: trpc.sales.getSuppliers.queryKey({}),
                    });
                },
            }),
        );
    if (!data?.uid && !supplierFormData)
        return (
            <EmptyState
                className="py-10"
                label="supplier"
                onCreate={(e) => {
                    setSupplierFormData({});
                }}
            />
        );
    const meta = door?.form?.formStepMeta;
    return (
        <div className="min-h-[40vh]">
            <div className="p-4 space-y-4">
                {!supplierFormData ? (
                    <div className="flex items-center">
                        <div className="">
                            {meta?.supplierUid ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Label>
                                        {meta?.supplierName}{" "}
                                        {
                                            " Supplier Selected. Door pricing will now show selected supplier pricings."
                                        }
                                    </Label>
                                    <Button
                                        onClick={(e) => {
                                            stepClass.setDoorSupplier(
                                                door.itemStepUid,
                                            );
                                        }}
                                        variant="link"
                                        size="sm"
                                    >
                                        Reset to default
                                    </Button>
                                </div>
                            ) : (
                                <Label>Click to select a supplier</Label>
                            )}
                        </div>
                        <div className="flex-1"></div>
                        <Button
                            size="sm"
                            onClick={(e) => {
                                setSupplierFormData({});
                            }}
                        >
                            <Icons.Add className="size-4" />
                            <span>Add</span>
                        </Button>
                    </div>
                ) : (
                    <div className="p-4">
                        <DoorSupplierForm
                            onCreate={(e) => {
                                setSupplierFormData(null);
                                qc.invalidateQueries({
                                    queryKey: trpc.sales.getSuppliers.queryKey(
                                        {},
                                    ),
                                });
                            }}
                            onCancel={(e) => setSupplierFormData(null)}
                            defaultValues={supplierFormData}
                        />
                    </div>
                )}
                <Table className="table-sm">
                    <Table.Header>
                        <Table.Row>
                            <Table.Head className="w-6"></Table.Head>
                            <Table.Head>Supplier</Table.Head>
                            <Table.Head></Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body className="">
                        {data?.stepProducts?.map((p) => (
                            <Table.Row key={p.id}>
                                <Table.Cell className="">
                                    <Icons.Check
                                        className={cn(
                                            "size-4",
                                            meta?.supplierUid === p?.uid
                                                ? ""
                                                : "text-transparent",
                                        )}
                                    />
                                </Table.Cell>
                                <Table.Cell
                                    className="uppercase cursor-pointer"
                                    onClick={(e) => {
                                        stepClass.setDoorSupplier(
                                            door.itemStepUid,
                                            { uid: p.uid, name: p.name },
                                        );
                                    }}
                                >
                                    {p.name}
                                </Table.Cell>
                                <Table.Cell className="flex justify-end gap-2 items-center">
                                    <Button
                                        onClick={(e) => {
                                            setSupplierFormData({
                                                id: p.id,
                                                name: p.name,
                                            });
                                        }}
                                        variant="outline"
                                        size="xs"
                                    >
                                        <Icons.Edit className="size-4" />
                                    </Button>
                                    <Button
                                        onClick={(e) => {
                                            if (meta?.supplierUid === p?.uid) {
                                                stepClass.setDoorSupplier(
                                                    door.itemStepUid,
                                                );
                                            }
                                            deleteSupplier({
                                                id: p.id,
                                            });
                                        }}
                                        variant="destructive"
                                        size="xs"
                                    >
                                        <Icons.Delete className="size-4" />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            </div>
            {/* )} */}
        </div>
    );
}
function LoadingSkeleton() {
    return (
        <div className="flex m-10 flex-col">
            <Skeletons.Dashboard />
        </div>
    );
}

