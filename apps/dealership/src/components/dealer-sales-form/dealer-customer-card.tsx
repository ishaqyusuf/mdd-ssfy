"use client";

import { Button } from "@gnd/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gnd/ui/select";
import { Building2, Mail, MapPin, Phone, UserRound, Users } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import type { DealerSalesFormCustomer, DealerSalesFormProfile } from "./types";

type DealerCustomerCardProps = {
  customer?: DealerSalesFormCustomer | null;
  profiles: DealerSalesFormProfile[];
  profileValue: string;
  onChangeCustomer: () => void;
  onProfileChange: (profileId: number | null) => void;
};

function displayName(customer?: DealerSalesFormCustomer | null) {
  return (
    customer?.businessName ||
    customer?.name ||
    customer?.email ||
    (customer?.id ? `Customer #${customer.id}` : "Not selected")
  );
}

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CU"
  );
}

function percent(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function addressLines(customer?: DealerSalesFormCustomer | null) {
  if (!customer) return [];
  const cityLine = [customer.city, customer.state, customer.zip_code]
    .filter(Boolean)
    .join(", ");

  return [
    customer.formattedAddress || customer.address,
    customer.address1,
    customer.address2,
    cityLine,
    customer.country,
  ].filter(Boolean) as string[];
}

function ContactRow({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
}

export function DealerCustomerCard({
  customer,
  profiles,
  profileValue,
  onChangeCustomer,
  onProfileChange,
}: DealerCustomerCardProps) {
  const name = displayName(customer);
  const selectedProfile = useMemo(
    () =>
      profiles.find((profile) => String(profile.id) === profileValue) ||
      customer?.profile ||
      null,
    [customer?.profile, profileValue, profiles],
  );
  const lines = addressLines(customer);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Dealer Customer
        </h3>
        <Button
          className="h-8 gap-2 px-2 text-xs"
          onClick={onChangeCustomer}
          type="button"
          variant="outline"
        >
          <Users className="size-3.5" />
          Change
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex items-start gap-3 p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-bold">
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight">
                  {name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Customer ID: {customer?.id || "N/A"}
                </p>
              </div>
              {selectedProfile ? (
                <div className="shrink-0 rounded-md border bg-muted/40 px-2 py-1 text-right">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">
                    Sales
                  </p>
                  <p className="text-xs font-semibold">
                    {percent(selectedProfile.salesPercentage)}%
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2">
              {customer?.businessName && customer.name ? (
                <ContactRow icon={<Building2 className="size-3" />}>
                  {customer.name}
                </ContactRow>
              ) : null}
              {customer?.email ? (
                <ContactRow icon={<Mail className="size-3" />}>
                  {customer.email}
                </ContactRow>
              ) : null}
              {customer?.phoneNo ? (
                <ContactRow icon={<Phone className="size-3" />}>
                  {customer.phoneNo}
                </ContactRow>
              ) : null}
              {lines[0] ? (
                <ContactRow icon={<MapPin className="size-3" />}>
                  {lines[0]}
                </ContactRow>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserRound className="size-3.5" />
            <span>Sales profile</span>
          </div>
          <Select
            value={profileValue || "none"}
            onValueChange={(value) =>
              onProfileChange(value === "none" ? null : Number(value || 0))
            }
          >
            <SelectTrigger className="mt-2 h-10 rounded-md bg-background text-sm">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={String(profile.id)}>
                  {profile.title || `Profile #${profile.id}`} (
                  {percent(profile.salesPercentage)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lines.length > 1 ? (
            <div className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
              {lines.slice(1).map((line) => (
                <p className="truncate" key={line}>
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
