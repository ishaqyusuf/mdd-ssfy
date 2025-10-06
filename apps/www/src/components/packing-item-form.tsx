import { usePacking, usePackingItem } from "@/hooks/use-sales-packing";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { Icons } from "@gnd/ui/icons";
import { hasQty, qtyFormSchema, qtySuperRefine } from "@gnd/utils/sales";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { UpdateSalesControl } from "@sales/schema";
import { useAuth } from "@/hooks/use-auth";
import { pickQtyFrom, recomposeQty } from "@sales/utils/sales-control";
import { toast } from "@gnd/ui/use-toast";
const schema = z
    .object({
        note: z.string().optional(),
    })
    .merge(qtyFormSchema)
    .superRefine(qtySuperRefine);

export function PackingItemForm({}) {
    const packing = usePacking();
    const { item } = usePackingItem();

    const availableQty = item?.deliverableQty;
    const form = useZodForm(schema, {
        defaultValues: {
            // pending: pendingQty,
            pending: availableQty,
            qty: {
                ...availableQty,
            },
        },
    });
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    const trigger = useTaskTrigger({
        onSucces() {
            queryClient.invalidateQueries({
                queryKey: trpc.dispatch.dispatchOverview.queryKey(),
            });
        },
    });
    const auth = useAuth();
    const onSubmit = (formData: z.infer<typeof schema>) => {
        const packItems: UpdateSalesControl["packItems"] = {
            dispatchId: packing.data?.dispatch?.id,
            dispatchStatus: (packing.data?.dispatch?.status as any) || "queue",
            packingList: [
                {
                    note: formData.note,
                    salesItemId: item?.salesItemId,
                    submissions: [],
                },
            ],
        };

        let qty = recomposeQty(formData.qty as any);
        item.deliverables.map((a) => {
            const dispatchableQty = recomposeQty(a.qty);
            if (hasQty(qty)) {
                const { pendingPick, picked, remainder } = pickQtyFrom(
                    qty,
                    dispatchableQty,
                );
                if (hasQty(picked)) {
                    packItems.packingList[0].submissions.push({
                        qty: recomposeQty(picked),
                        submissionId: a.submissionId,
                    });
                    qty = { ...pendingPick } as any;
                }
            }
        });
        console.log({ packItems, qty });
        if (hasQty(qty)) {
            toast({
                variant: "destructive",
                description: "Not enough stock to complete packing",
                title: "Unable to proceed",
            });
            return;
        }
        trigger.trigger({
            taskName: "update-sales-control",
            payload: {
                meta: {
                    authorId: auth.id,
                    authorName: auth.name,
                    salesId: packing.data?.order?.id,
                },
                packItems,
            } as UpdateSalesControl,
        });
        // controller.packItem({
        //     dispatchId: packing.data?.dispatch?.id,
        //     qty: formData?.qty,
        //     note: formData?.note,
        //     dispatchable: item.dispatchable,
        //     salesId: packing?.data?.order?.id,
        //     // salesItemId: packing?.data?.
        // });
    };
    if (!hasQty(availableQty)) return null;
    return (
        <div className="p-4 border-t  bg-muted/10">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="flex gap-2">
                        <div className="flex-1 grid grid-cols-2">
                            {availableQty.noHandle ? (
                                <FormInput
                                    label="Qty"
                                    control={form.control}
                                    name="qty.qty"
                                    numericProps={{
                                        allowNegative: false,
                                        suffix: `/${availableQty?.qty || 0}`,
                                        placeholder: `0/${availableQty?.qty || "0"}`,
                                        max: availableQty?.qty,
                                        disabled: !availableQty?.qty,
                                    }}
                                />
                            ) : (
                                <div className="grid gap-2 grid-cols-2">
                                    {["lh", "rh"].map((hand) => {
                                        const label = hand?.toLocaleUpperCase();
                                        return (
                                            <FormInput
                                                key={hand}
                                                label={label}
                                                control={form.control}
                                                name={`qty.${hand}` as any}
                                                numericProps={{
                                                    allowNegative: false,
                                                    suffix: `/${availableQty?.[hand]} ${label}`,
                                                    placeholder: `0/${availableQty?.[hand]} ${label}`,
                                                    max: availableQty?.[hand],
                                                    disabled:
                                                        !availableQty?.[hand],
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            <FormInput
                                disabled={trigger?.isLoading}
                                label={"Note (Optional)"}
                                placeholder="Add packing note.."
                                control={form.control}
                                name="note"
                            />
                        </div>
                        <div className="inline-flex gap-2 items-end">
                            <SubmitButton
                                disabled={!availableQty?.qty}
                                isSubmitting={trigger?.isLoading}
                            >
                                <Icons.Add className="size-4" />
                            </SubmitButton>

                            <Button
                                disabled={trigger?.isLoading}
                                type="button"
                                variant="destructive"
                            >
                                <Icons.Close className="size-4" />
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}

