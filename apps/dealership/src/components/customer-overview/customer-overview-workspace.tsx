"use client";

import {
  type CustomerOverviewTab,
  customerOverviewTabs,
} from "@/lib/customer-overview-tabs";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { CustomSheetContent } from "@gnd/ui/custom/sheet";
import { Separator } from "@gnd/ui/separator";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ExternalLink,
  FilePlus2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { TableSkeleton } from "../tables/skeleton";
import { CustomerHistoryTable } from "./customer-history-table";

type CustomerOverviewWorkspaceProps = {
  activeTab: CustomerOverviewTab;
  customerId: number;
  onTabChange: (tab: CustomerOverviewTab) => void;
  surface: "page" | "sheet";
};

type CustomerOverviewRecord = RouterOutputs["dealerPortal"]["customerOverview"];

const tabLabels: Record<CustomerOverviewTab, string> = {
  overview: "Overview",
  quotes: "Quotes",
  orders: "Orders",
};

function displayName(customer?: {
  id?: number | null;
  name?: string | null;
  businessName?: string | null;
  email?: string | null;
}) {
  return (
    customer?.businessName ||
    customer?.name ||
    customer?.email ||
    (customer?.id ? `Customer #${customer.id}` : "Customer")
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CU"
  );
}

function date(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function percent(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function DetailItem({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 min-w-0 text-sm leading-5">{children}</div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ContactLine({ customer }: { customer: CustomerOverviewRecord }) {
  const items = [
    customer.email,
    customer.phoneNo,
    customer.formattedAddress || customer.address,
  ].filter(Boolean);

  if (!items.length) {
    return <span className="text-muted-foreground">No contact details</span>;
  }

  return (
    <span className="block truncate text-sm text-muted-foreground">
      {items.join(" / ")}
    </span>
  );
}

function OverviewPanel({ customer }: { customer: CustomerOverviewRecord }) {
  const customerName = displayName(customer);
  const profile = customer.profile;
  const formattedAddress =
    customer.formattedAddress || customer.address || customer.address1 || "-";

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-4 md:p-5">
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            <DetailItem
              icon={<UserRound className="size-4" />}
              label="Customer"
            >
              <span className="block truncate font-medium">{customerName}</span>
            </DetailItem>
            <DetailItem
              icon={<BriefcaseBusiness className="size-4" />}
              label="Sales profile"
            >
              {profile ? (
                <span className="block truncate font-medium">
                  {profile.title || `Profile #${profile.id}`}
                  <span className="text-muted-foreground">
                    {" "}
                    / {percent(profile.salesPercentage)}%
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  No profile selected
                </span>
              )}
            </DetailItem>
            <DetailItem icon={<Mail className="size-4" />} label="Email">
              {customer.email ? (
                <a
                  className="block truncate font-medium hover:underline"
                  href={`mailto:${customer.email}`}
                >
                  {customer.email}
                </a>
              ) : (
                <span className="text-muted-foreground">No email</span>
              )}
            </DetailItem>
            <DetailItem icon={<Phone className="size-4" />} label="Phone">
              {customer.phoneNo ? (
                <a
                  className="block truncate font-medium hover:underline"
                  href={`tel:${customer.phoneNo}`}
                >
                  {customer.phoneNo}
                </a>
              ) : (
                <span className="text-muted-foreground">No phone</span>
              )}
            </DetailItem>
            <div className="md:col-span-2">
              <DetailItem icon={<MapPin className="size-4" />} label="Address">
                <span className="block truncate font-medium">
                  {formattedAddress}
                </span>
                {customer.address2 ? (
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {customer.address2}
                  </span>
                ) : null}
              </DetailItem>
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/20 px-4 md:px-5 lg:border-l lg:border-t-0">
          <Metric label="Quotes" value={customer.quotesCount} />
          <Separator />
          <Metric label="Orders" value={customer.ordersCount} />
          <Separator />
          <Metric label="Customer since" value={date(customer.createdAt)} />
        </div>
      </div>
    </div>
  );
}

function Header({
  activeTab,
  customer,
  onTabChange,
  surface,
}: {
  activeTab: CustomerOverviewTab;
  customer: CustomerOverviewRecord;
  onTabChange: (tab: CustomerOverviewTab) => void;
  surface: "page" | "sheet";
}) {
  const customerName = displayName(customer);
  const HeaderElement = surface === "sheet" ? SheetHeader : "div";

  return (
    <HeaderElement
      className={cn("gap-0", surface === "page" && "flex flex-col border-b")}
    >
      <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-11 rounded-md border bg-background">
            <AvatarFallback className="rounded-md bg-muted text-sm font-semibold">
              {initials(customerName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {surface === "sheet" ? (
              <SheetTitle className="truncate text-left text-lg">
                {customerName}
              </SheetTitle>
            ) : (
              <h1 className="truncate text-xl font-semibold md:text-2xl">
                {customerName}
              </h1>
            )}
            {surface === "sheet" ? (
              <SheetDescription asChild>
                <ContactLine customer={customer} />
              </SheetDescription>
            ) : (
              <ContactLine customer={customer} />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="h-8 rounded-md px-3 font-normal" variant="outline">
            {customer.profile?.title || "No sales profile"}
          </Badge>
          <Button asChild size="sm" variant="outline">
            <Link href={`/customers/${customer.id}/edit`}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/quotes/new?selectedCustomerId=${customer.id}`}>
              <FilePlus2 className="mr-2 size-4" />
              New quote
            </Link>
          </Button>
          {surface === "sheet" ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/customers/${customer.id}`}>
                <ExternalLink className="mr-2 size-4" />
                Full page
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <TabsList className="h-9 w-full justify-start overflow-x-auto rounded-none border-t bg-transparent p-0">
        {customerOverviewTabs.map((tab) => (
          <TabsTrigger
            className="h-9 rounded-none border-b-2 border-transparent px-4 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            key={tab}
            onClick={() => onTabChange(tab)}
            value={tab}
          >
            {tabLabels[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
    </HeaderElement>
  );
}

function Panels({
  activeTab,
  customer,
}: {
  activeTab: CustomerOverviewTab;
  customer: CustomerOverviewRecord;
}) {
  return (
    <>
      <TabsContent className="mt-0 focus-visible:outline-none" value="overview">
        <OverviewPanel customer={customer} />
      </TabsContent>
      <TabsContent className="mt-0 focus-visible:outline-none" value="quotes">
        {activeTab === "quotes" ? (
          <Suspense fallback={<TableSkeleton />}>
            <CustomerHistoryTable customerId={customer.id} type="quotes" />
          </Suspense>
        ) : null}
      </TabsContent>
      <TabsContent className="mt-0 focus-visible:outline-none" value="orders">
        {activeTab === "orders" ? (
          <Suspense fallback={<TableSkeleton />}>
            <CustomerHistoryTable customerId={customer.id} type="orders" />
          </Suspense>
        ) : null}
      </TabsContent>
    </>
  );
}

function LoadingState({ surface }: { surface: "page" | "sheet" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        surface === "sheet" ? "p-1" : "rounded-lg border p-4",
      )}
    >
      <div className="h-16 animate-pulse rounded-md bg-muted" />
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-20 animate-pulse rounded-md border bg-muted/50"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export function CustomerOverviewWorkspace({
  activeTab,
  customerId,
  onTabChange,
  surface,
}: CustomerOverviewWorkspaceProps) {
  const trpc = useTRPC();
  const customerQuery = useQuery(
    trpc.dealerPortal.customerOverview.queryOptions({
      id: customerId,
    }),
  );

  if (customerQuery.isPending) {
    return <LoadingState surface={surface} />;
  }

  if (!customerQuery.data) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        We could not load this customer.
      </div>
    );
  }

  const content = (
    <div className="flex flex-col gap-4 pt-4">
      <Panels activeTab={activeTab} customer={customerQuery.data} />
    </div>
  );

  return (
    <Tabs
      className={cn("flex min-h-0 flex-col", surface === "sheet" && "h-full")}
      onValueChange={(tab) => onTabChange(tab as CustomerOverviewTab)}
      value={activeTab}
    >
      <Header
        activeTab={activeTab}
        customer={customerQuery.data}
        onTabChange={onTabChange}
        surface={surface}
      />
      {surface === "sheet" ? (
        <CustomSheetContent className="-mt-1">{content}</CustomSheetContent>
      ) : (
        content
      )}
    </Tabs>
  );
}
