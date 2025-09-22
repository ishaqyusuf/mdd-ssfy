import { useTRPC } from "@/trpc/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { DoorSupplierForm } from "./door-supplier-form";
import { Table } from "@gnd/ui/custom/data-table/index";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
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
    const [supplierFormData, setSupplierFormData] = useState<any>(null);
    const qc = useQueryClient();
    // const ctx = useStepContext(itemStepUid);
    // ctx.tabComponents.
    const zus = useFormDataStore();
    const cls = useMemo(() => {
        const [itemUid, stepUid] = itemStepUid?.split("-");
    }, [itemStepUid]);
    if (!data?.uid && !supplierFormData)
        return (
            <EmptyState
                className="py-10"
                label="supplier"
                onCreate={(e) => {
                    setSupplierFormData({});
                    qc.invalidateQueries({
                        queryKey: trpc.sales.getSuppliers.queryKey({}),
                    });
                }}
            />
        );
    return (
        <div className="min-h-[40vh]">
            <div className="p-4 space-y-4">
                {!supplierFormData ? (
                    <div className="flex items-center">
                        <div className="">
                            <Label>Click to select a supplier</Label>
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
                                setSupplierFormData({});
                            }}
                            defaultValues={supplierFormData}
                        />
                    </div>
                )}
                <Table className="table-sm">
                    <Table._Header>
                        <Table._Row>
                            <Table._Head>Supplier</Table._Head>
                        </Table._Row>
                    </Table._Header>
                    <Table._Body>
                        {data?.stepProducts?.map((p) => (
                            <Table._Row key={p.id}>
                                <Table._Cell className="uppercase">
                                    {p.name}
                                </Table._Cell>
                            </Table._Row>
                        ))}
                    </Table._Body>
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

