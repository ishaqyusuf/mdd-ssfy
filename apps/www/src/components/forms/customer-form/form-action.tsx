import { Button } from "@gnd/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { FormDebugBtn } from "@/components/form-debug-btn";

import { useCustomerForm } from "./form-context";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";

export function FormAction({ onCancel }) {
    const { setParams, params } = useCreateCustomerParams();
    const form = useCustomerForm();
    const id = form.watch("id");
    const isEditing = params.customerId > 0;
    const trpc = useTRPC();
    const {
        mutate: mutateAddress,
        isPending: isAddressSubmitting,
    } = useMutation(
        trpc.customers.createCustomerAddress.mutationOptions({
            onSuccess: (resp) => {
                toast({
                    title: id ? "Updated" : "Created",
                });
                setParams({
                    customerForm: false,
                    payload: {
                        customerId: resp.customerId,
                        addressId: resp.addressId,
                        address: params.address as any,
                    },
                });
            },
            onError() {
                toast({
                    title: "Error",
                });
            },
        }),
    );
    const { mutate, isPending: isCustomerSubmitting } = useMutation(
        trpc.customers.createCustomer.mutationOptions({
            onError() {},
            onSuccess: (resp) => {
                toast({
                    title: id ? "Updated" : "Created",
                });
                setParams({
                    customerForm: false,
                    payload: {
                        customerId: resp.customerId,
                        addressId: resp.addressId,
                        address: params.address as any,
                    },
                });
            },
        }),
    );
    const isSubmitting = isAddressSubmitting || isCustomerSubmitting;

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
                    onSubmit={form.handleSubmit(
                        params?.address
                            ? (values) => mutateAddress(values)
                            : (values) => mutate(values),
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
