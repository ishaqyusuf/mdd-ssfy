"use client";

import { useTRPC } from "@/trpc/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import { Switch } from "@gnd/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gnd/ui/table";
import { Textarea } from "@gnd/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gnd/ui/tooltip";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Field, PhoneField, formatDate } from "./shared";

export function DealerCustomers() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editingCustomer, setEditingCustomer] = useState<{
    id: number;
    name: string | null;
    businessName: string | null;
    email: string | null;
    phoneNo: string | null;
    address: string | null;
    customerTypeId: number | null;
  } | null>(null);
  const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
  const profilesQuery = useQuery(
    trpc.dealerPortal.salesProfiles.queryOptions(),
  );
  const saveCustomer = useMutation(
    trpc.dealerPortal.saveCustomer.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.dealerPortal.customers.pathKey(),
        });
        toast({
          title: "Customer saved.",
          variant: "success",
        });
        setEditingCustomer(null);
      },
      onError: (error) => {
        toast({
          title: "Could not save customer.",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );
  const deleteCustomer = useMutation(
    trpc.dealerPortal.deleteCustomer.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.customers.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.customersList.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.customerFilters.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.dashboard.pathKey(),
          }),
        ]);
        toast({
          title: "Customer deleted.",
          variant: "success",
        });
        setEditingCustomer(null);
      },
      onError: (error) => {
        toast({
          title: "Could not delete customer.",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );
  const updateOfficeVisibility = useMutation(
    trpc.dealerPortal.updateCustomerOfficeVisibility.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.dealerPortal.customers.pathKey(),
        });
        toast({
          title: "Office access updated.",
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: "Could not update office access.",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerTypeId = Number(form.get("customerTypeId") || 0);

    saveCustomer.mutate({
      id: editingCustomer?.id || null,
      name: String(form.get("name") || ""),
      businessName: String(form.get("businessName") || ""),
      email: String(form.get("email") || ""),
      phoneNo: String(form.get("phoneNo") || ""),
      address: String(form.get("address") || ""),
      customerTypeId: customerTypeId || null,
    });

    event.currentTarget.reset();
  }

  const customers = customersQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-background p-4">
        <h3 className="mb-4 text-base font-semibold">
          {editingCustomer ? "Edit customer" : "Add customer"}
        </h3>
        <form
          className="grid gap-3 md:grid-cols-2"
          key={editingCustomer?.id || "new-customer"}
          onSubmit={onSubmit}
        >
          <Field
            defaultValue={editingCustomer?.name || ""}
            label="Name"
            name="name"
          />
          <Field
            defaultValue={editingCustomer?.businessName || ""}
            label="Business name (Optional)"
            name="businessName"
          />
          <Field
            defaultValue={editingCustomer?.email || ""}
            label="Email"
            name="email"
            type="email"
          />
          <PhoneField
            defaultValue={editingCustomer?.phoneNo || ""}
            label="Phone"
            name="phoneNo"
          />
          <label className="space-y-2">
            <span className="text-sm font-medium">Sales profile</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue={editingCustomer?.customerTypeId || ""}
              name="customerTypeId"
            >
              <option value="">None</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.title}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="customer-address">
              Address
            </label>
            <Textarea
              defaultValue={editingCustomer?.address || ""}
              id="customer-address"
              name="address"
              rows={3}
            />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button disabled={saveCustomer.isPending} type="submit">
              <UserPlus className="mr-2 size-4" />
              {saveCustomer.isPending ? "Saving..." : "Save customer"}
            </Button>
            {editingCustomer ? (
              <Button
                onClick={() => setEditingCustomer(null)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Office access</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customersQuery.isPending ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={7}>
                  Loading customers...
                </TableCell>
              </TableRow>
            ) : customers.length ? (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.businessName ||
                      customer.name ||
                      `Customer #${customer.id}`}
                  </TableCell>
                  <TableCell>{customer.email || "-"}</TableCell>
                  <TableCell>{customer.phoneNo || "-"}</TableCell>
                  <TableCell>{customer.profile?.title || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`Share ${
                          customer.businessName ||
                          customer.name ||
                          `customer ${customer.id}`
                        } with the office`}
                        checked={customer.officeVisibility === "SHARED"}
                        disabled={updateOfficeVisibility.isPending}
                        onCheckedChange={(checked) =>
                          updateOfficeVisibility.mutate({
                            id: customer.id,
                            officeVisibility: checked ? "SHARED" : "PRIVATE",
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {customer.officeVisibility === "SHARED"
                          ? "Shared (read-only)"
                          : "Private"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(customer.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          if (!customer.id) return;
                          setEditingCustomer({
                            id: customer.id,
                            name: customer.name || null,
                            businessName: customer.businessName || null,
                            email: customer.email || null,
                            phoneNo: customer.phoneNo || null,
                            address: customer.address || null,
                            customerTypeId: customer.customerTypeId || null,
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <AlertDialog>
                        <TooltipProvider
                          disableHoverableContent
                          delayDuration={100}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  aria-label={`Delete ${
                                    customer.businessName ||
                                    customer.name ||
                                    `Customer #${customer.id}`
                                  }`}
                                  disabled={deleteCustomer.isPending}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Delete customer</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete customer?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {customer.businessName ||
                                customer.name ||
                                `Customer #${customer.id}`}{" "}
                              will be removed from your customer list. Existing
                              quotes and orders stay intact.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deleteCustomer.mutate({ id: customer.id })
                              }
                              variant="destructive"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={7}>
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
