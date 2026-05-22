"use client";

import { CustomerFormClient } from "@/components/customer-form-client";
import { useCustomerFormParams } from "@/hooks/use-customer-form-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CustomModal } from "./custom-modal";

const CUSTOMER_FORM_ID = "dealer-customer-form";

export function CustomerFormModal() {
  const customerForm = useCustomerFormParams();
  const router = useRouter();
  const trpc = useTRPC();
  const customerId = customerForm.params.customerId;
  const customerQuery = useQuery(
    trpc.dealerPortal.customer.queryOptions(
      { id: customerId || 0 },
      {
        enabled: customerForm.opened && Boolean(customerId),
      },
    ),
  );
  const isEditing = Boolean(customerId);

  if (!customerForm.opened) return null;

  return (
    <CustomModal
      description="Manage contact details and the customer sales profile."
      onOpenChange={(open) => {
        if (!open) customerForm.close();
      }}
      open={customerForm.opened}
      rounded
      size="2xl"
      title={customerForm.title}
    >
      <CustomModal.Content className="pb-20">
        {isEditing && customerQuery.isPending ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Loading customer...
          </div>
        ) : isEditing && !customerQuery.data ? (
          <div className="space-y-4 rounded-lg border border-dashed p-6">
            <p className="text-sm text-muted-foreground">
              We could not load this customer.
            </p>
            <Button
              onClick={customerForm.close}
              type="button"
              variant="outline"
            >
              Close
            </Button>
          </div>
        ) : (
          <CustomerFormClient
            customer={customerQuery.data ?? null}
            formId={CUSTOMER_FORM_ID}
            mode="modal"
            onCancel={customerForm.close}
            onSaved={() => {
              customerForm.close();
              router.refresh();
            }}
            renderActions={(actions) => (
              <CustomModal.Footer className="absolute bottom-0 left-0 right-0 flex-col gap-2 border-t bg-background/95 p-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:justify-end">
                {actions}
              </CustomModal.Footer>
            )}
          />
        )}
      </CustomModal.Content>
    </CustomModal>
  );
}
