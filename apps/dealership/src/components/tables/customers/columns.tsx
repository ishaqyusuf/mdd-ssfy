"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
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
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Item as ItemUi } from "@gnd/ui/namespace";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gnd/ui/tooltip";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FilePlus2, Trash2 } from "lucide-react";
import Link from "next/link";

export type Item =
  RouterOutputs["dealerPortal"]["customersList"]["data"][number];
type Column = ColumnDef<Item>;

function date(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function customerName(item: Item) {
  return item.businessName || item.name || item.email || `Customer #${item.id}`;
}

function overviewHref(item: Item) {
  return `/customers?customerOverviewId=${item.id}&customerOverviewTab=overview`;
}

function profileName(item: Item) {
  if (!item.profile) return "-";

  const percentage = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(item.profile.salesPercentage || 0));

  return `${item.profile.title || `Profile #${item.profile.id}`} (${percentage}%)`;
}

function countLabel(value: number, singular: string) {
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

function CreateQuoteAction({ item }: { item: Item }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/quotes/new?selectedCustomerId=${item.id}`}>
        <FilePlus2 className="mr-2 size-4" />
        <span>Create quote</span>
      </Link>
    </Button>
  );
}

function DeleteCustomerAction({ item }: { item: Item }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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
            queryKey: trpc.dealerPortal.quotes.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.orders.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.dashboard.pathKey(),
          }),
        ]);
        toast({
          title: "Customer deleted.",
          variant: "success",
        });
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
  const name = customerName(item);

  return (
    <AlertDialog>
      <TooltipProvider disableHoverableContent delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                aria-label={`Delete ${name}`}
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
          <AlertDialogTitle>Delete customer?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} will be removed from your customer list. Existing quotes and
            orders stay intact.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteCustomer.mutate({ id: item.id })}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const columns: Column[] = [
  {
    header: "Customer",
    accessorKey: "customer",
    cell: ({ row: { original: item } }) => (
      <div className="max-w-[260px]">
        <ItemUi.Title>
          <Link href={overviewHref(item)}>
            <TextWithTooltip
              className="max-w-[220px] truncate"
              text={customerName(item)}
            />
          </Link>
        </ItemUi.Title>
        <ItemUi.Description>
          <TextWithTooltip
            className="max-w-[220px] truncate"
            text={item.address || "-"}
          />
        </ItemUi.Description>
      </div>
    ),
  },
  {
    header: "Email",
    accessorKey: "email",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap">{item.email || "-"}</span>
    ),
  },
  {
    header: "Phone",
    accessorKey: "phoneNo",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap">{item.phoneNo || "-"}</span>
    ),
  },
  {
    header: "Profile",
    accessorKey: "profile",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap">{profileName(item)}</span>
    ),
  },
  {
    header: "Quotes",
    accessorKey: "quotesCount",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap tabular-nums">
        {item.quotesCount ?? 0}
      </span>
    ),
  },
  {
    header: "Orders",
    accessorKey: "ordersCount",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap tabular-nums">
        {item.ordersCount ?? 0}
      </span>
    ),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {date(item.createdAt)}
      </span>
    ),
  },
  {
    header: "",
    accessorKey: "actions",
    cell: ({ row: { original: item } }) => (
      <div className="flex justify-end gap-2">
        <CreateQuoteAction item={item} />
        <DeleteCustomerAction item={item} />
      </div>
    ),
  },
];

export const mobileColumn: Column[] = [
  {
    header: "Customer",
    accessorKey: "customer",
    cell: ({ row: { original: item } }) => (
      <div className="flex w-full items-start justify-between gap-3 py-2">
        <div className="min-w-0">
          <ItemUi.Title>
            <Link href={overviewHref(item)}>
              <TextWithTooltip
                className="max-w-[220px] truncate"
                text={customerName(item)}
              />
            </Link>
          </ItemUi.Title>
          <ItemUi.Description>
            <TextWithTooltip
              className="max-w-[240px] truncate"
              text={`${profileName(item)} / ${countLabel(
                item.quotesCount ?? 0,
                "quote",
              )} / ${countLabel(item.ordersCount ?? 0, "order")}`}
            />
          </ItemUi.Description>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-xs text-muted-foreground">
            {date(item.createdAt)}
          </p>
          <div className="flex items-center gap-2">
            <CreateQuoteAction item={item} />
            <DeleteCustomerAction item={item} />
          </div>
        </div>
      </div>
    ),
  },
];
