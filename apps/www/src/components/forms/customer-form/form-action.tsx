import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { FormDebugBtn } from "@/components/form-debug-btn";

import { useCustomerForm } from "./form-context";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useAction } from "next-safe-action/hooks";
import { createCustomerAction } from "@/actions/create-customer-action";

import { createCustomerAddressAction } from "@/actions/create-customer-address-action";

export function FormAction({ onCancel }) {
    const { setParams, params } = useCreateCustomerParams();
    const form = useCustomerForm();
    const id = form.watch("id");
    const isEditing = params.customerId > 0;
    const trpc = useTRPC();
    const qc = useQueryClient();
    const { execute: mutateAddress } = useAction(createCustomerAddressAction, {
        onSuccess: ({ data: resp }) => {
            toast({
                title: id ? "Updated" : "Created",
            });
            setParams({
                payload: {
                    customerId: resp.customerId,
                    addressId: resp.addressId,
                    address: params.address as any,
                },
            });
            // if (resp) {
            // setParams(null);
            // }
        },
        onError(e) {
            toast({
                title: "Error",
            });
        },
    });
    const { isPending: isSubmitting, execute: mutate } = useAction(
        createCustomerAction,
        {
            onError() {},
            onSuccess: ({ data: resp }) => {
                // toast.success(id ? "Updated" : "Created");
                toast({
                    title: id ? "Updated" : "Created",
                });
                // customerFormStaticCallbacks?.created?.(
                //     resp.customerId,
                //     resp?.addressId,
                // );
                setParams({
                    payload: {
                        customerId: resp.customerId,
                        addressId: resp.addressId,
                        address: params.address as any,
                    },
                });
                // if (resp) {
                // }
            },
        },
    );

    const onSubmit = async (data) => {
        mutate({
            ...data,
        });
    };
    return (
        <div className="flex flex-1 py-4 items-center gap-4">
            <div className="text-sm text-muted-foreground">
                {isEditing
                    ? "Update customer information"
                    : "Create a new customer"}
            </div>
            <div className="flex-1"></div>
            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <FormDebugBtn />
                <form
                    // onSubmit={form.handleSubmit(onSubmit)}
                    onSubmit={form.handleSubmit(
                        params?.address ? mutateAddress : mutate,
                    )}
                >
                    <SubmitButton
                        isSubmitting={isSubmitting}
                        className="min-w-[120px]"
                    >
                        {isEditing ? "Update" : "Create"}
                    </SubmitButton>
                </form>
            </div>
        </div>
    );
}

