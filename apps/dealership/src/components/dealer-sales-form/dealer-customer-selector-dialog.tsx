"use client";

import { useCustomerFormParams } from "@/hooks/use-customer-form-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DealerSalesFormCustomer } from "./types";

type DealerCustomerSelectorDialogProps = {
  open: boolean;
  customers: DealerSalesFormCustomer[];
  required?: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCustomer: (customer: DealerSalesFormCustomer) => void;
};

export function DealerCustomerSelectorDialog(
  props: DealerCustomerSelectorDialogProps,
) {
  const trpc = useTRPC();
  const customerForm = useCustomerFormParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const createdCustomerId = customerForm.params.payload?.customerId || null;
  const createdCustomerQuery = useQuery(
    trpc.dealerPortal.customer.queryOptions(
      { id: createdCustomerId || 0 },
      {
        enabled: props.open && Boolean(createdCustomerId),
      },
    ),
  );
  const recentCustomers = useMemo(() => {
    return [...props.customers]
      .sort((left, right) => {
        const leftDate = left.createdAt
          ? new Date(left.createdAt).getTime()
          : 0;
        const rightDate = right.createdAt
          ? new Date(right.createdAt).getTime()
          : 0;
        const leftCreatedAt = Number.isFinite(leftDate) ? leftDate : 0;
        const rightCreatedAt = Number.isFinite(rightDate) ? rightDate : 0;

        if (leftCreatedAt !== rightCreatedAt) {
          return rightCreatedAt - leftCreatedAt;
        }

        return right.id - left.id;
      })
      .slice(0, 5);
  }, [props.customers]);
  const results = useMemo(() => {
    if (!normalizedQuery) return recentCustomers;
    return props.customers
      .filter((customer) =>
        [customer.name, customer.businessName, customer.email, customer.phoneNo]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 10);
  }, [normalizedQuery, props.customers, recentCustomers]);

  useEffect(() => {
    if (!createdCustomerId) return;
    const customer = createdCustomerQuery.data;
    if (!customer?.id) return;

    props.onSelectCustomer({
      id: customer.id,
      name: customer.name,
      businessName: customer.businessName,
      email: customer.email,
      phoneNo: customer.phoneNo,
      address: customer.address,
      formattedAddress: customer.formattedAddress,
      address1: customer.address1,
      address2: customer.address2,
      city: customer.city,
      state: customer.state,
      zip_code: customer.zip_code,
      country: customer.country,
      customerTypeId: customer.customerTypeId,
    });
    props.onOpenChange(false);
    setSearchQuery("");
    void customerForm.setParams({
      payload: null,
    });
  }, [
    createdCustomerId,
    createdCustomerQuery.data,
    customerForm.setParams,
    props.onOpenChange,
    props.onSelectCustomer,
  ]);

  function handleCreateCustomer() {
    customerForm.openCreate(null, {
      returnPayload: true,
    });
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (props.required && !open) return;
        props.onOpenChange(open);
        if (open) {
          window.setTimeout(() => inputRef.current?.focus(), 50);
        }
      }}
    >
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0"
        onEscapeKeyDown={(event) => {
          if (props.required) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (props.required) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <DialogTitle>Create Quote: Select Customer</DialogTitle>
          <DialogDescription>
            Search by customer name, phone, or email. When empty, recent dealer
            customers appear here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  className="h-12 w-full rounded-xl border border-primary/40 bg-card pl-4 pr-12 text-sm font-medium text-foreground outline-none ring-2 ring-primary/10 placeholder:text-muted-foreground focus:border-primary"
                  placeholder="Search customer name, phone, or email"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground">
                  {searchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="hover:text-foreground"
                      aria-label="Clear customer search"
                    >
                      <Icons.X className="size-4" />
                    </button>
                  ) : (
                    <Icons.Search className="size-4" />
                  )}
                </div>
              </div>
              <Button
                type="button"
                className="h-12 shrink-0"
                onClick={handleCreateCustomer}
              >
                <Icons.Add className="size-4" />
                Create
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {normalizedQuery ? `${results.length} Results` : "Recent 5"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Required
              </span>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {results.length ? (
                results.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      props.onSelectCustomer(customer);
                      props.onOpenChange(false);
                      setSearchQuery("");
                    }}
                    className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-blue-100 text-xs font-black text-primary">
                      {(customer.name || customer.businessName || "C")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {customer.name || customer.businessName || "Customer"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {customer.businessName ? (
                          <span>{customer.businessName}</span>
                        ) : null}
                        {customer.email ? <span>{customer.email}</span> : null}
                        {customer.phoneNo ? (
                          <span>{customer.phoneNo}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="space-y-3 px-4 py-10 text-center text-sm text-muted-foreground">
                  <p>No dealer customers matched that search.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCreateCustomer}
                  >
                    <Icons.UserRoundPlus className="mr-2 size-4" />
                    Add new customer
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => props.onOpenChange(false)}
            disabled={props.required}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
