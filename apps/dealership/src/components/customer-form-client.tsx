"use client";

import { CustomerQuickFill } from "@/components/dev/quick-fill";
import { useDebounce } from "@/hooks/use-debounce";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
  type DealerPortalCustomerSchema,
  dealerPortalCustomerSchema,
} from "@api/schemas/dealer";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardFooter } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { FieldGroup } from "@gnd/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { InputGroup } from "@gnd/ui/namespace";
import { Separator } from "@gnd/ui/separator";
import { toast } from "@gnd/ui/use-toast";
import {
  US_PHONE_FORMAT_PATTERN,
  formatUSPhoneNumber,
} from "@gnd/utils/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  X,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { PatternFormat } from "react-number-format";

type CustomerFormRecord = {
  id: number;
  name: string | null;
  businessName: string | null;
  email: string | null;
  phoneNo: string | null;
  address: string | null;
  formattedAddress?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  customerTypeId: number | null;
} | null;

type CustomerFormSavedRecord = {
  id?: number | null;
  name?: string | null;
  businessName?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  customerTypeId?: number | null;
};

function getCustomerDefaultValues(
  customer?: CustomerFormRecord,
): DealerPortalCustomerSchema {
  return {
    id: customer?.id || null,
    name: customer?.name || "",
    businessName: customer?.businessName || "",
    email: customer?.email || "",
    phoneNo: formatUSPhoneNumber(customer?.phoneNo || "") || "",
    address: customer?.address || "",
    formattedAddress: customer?.formattedAddress || customer?.address || "",
    address1: customer?.address1 || "",
    address2: customer?.address2 || "",
    city: customer?.city || "",
    state: customer?.state || "",
    zip_code: customer?.zip_code || "",
    country: customer?.country || "",
    lat: customer?.lat ?? null,
    lng: customer?.lng ?? null,
    customerTypeId: customer?.customerTypeId || null,
  };
}

function formatSalesProfileOption(profile: {
  title?: string | null;
  coefficient?: number | null;
}) {
  const coefficient = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(profile.coefficient || 0));

  return `${profile.title || "Untitled profile"} (coefficient ${coefficient})`;
}

function getCustomerDisplayName(customer?: CustomerFormRecord) {
  return (
    customer?.businessName ||
    customer?.name ||
    (customer?.id ? `Customer #${customer.id}` : "New customer")
  );
}

function getCustomerInitials(customer?: CustomerFormRecord) {
  const initials = getCustomerDisplayName(customer)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "NC";
}

function SectionHeading({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{children}</h3>
    </div>
  );
}

function RailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

type GoogleAddress = {
  address1: string;
  address2: string;
  formattedAddress: string;
  city: string;
  state?: string;
  region: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
};

type PlacePrediction = {
  placePrediction?: {
    placeId?: string;
    place?: string;
    text?: { text?: string };
  };
};

type PredictionItem = PlacePrediction & {
  id: string;
  label: string;
};

type SalesProfileOption = {
  id: string;
  label: string;
  profile: {
    id: number;
    title?: string | null;
    coefficient?: number | null;
  };
};

function resolvePlaceId(prediction?: PlacePrediction) {
  const placePrediction = prediction?.placePrediction;
  if (!placePrediction) return "";

  if (placePrediction.placeId) return placePrediction.placeId;

  const placeResource = placePrediction.place;
  if (!placeResource) return "";

  const match = /^places\/(.+)$/.exec(placeResource);
  return match?.[1] ?? "";
}

function GoogleAddressInput({
  contentInPlace,
  onAddressChange,
  value,
}: {
  contentInPlace?: boolean;
  onAddressChange: (address: GoogleAddress) => void;
  value: string;
}) {
  const trpc = useTRPC();
  const [searchInput, setSearchInput] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const onAddressChangeRef = useRef(onAddressChange);
  const debouncedSearchInput = useDebounce(searchInput, 500);
  const predictionsQuery = useQuery(
    trpc.google.places.queryOptions(
      {
        q: debouncedSearchInput,
      },
      {
        enabled: debouncedSearchInput.trim().length > 2,
      },
    ),
  );
  const placeQuery = useQuery(
    trpc.google.place.queryOptions(
      {
        placeId: selectedPlaceId,
      },
      {
        enabled: Boolean(selectedPlaceId),
        staleTime: Number.POSITIVE_INFINITY,
      },
    ),
  );

  useEffect(() => {
    onAddressChangeRef.current = onAddressChange;
  }, [onAddressChange]);

  useEffect(() => {
    const address = placeQuery.data?.data?.address as GoogleAddress | undefined;
    if (!address?.formattedAddress) return;

    onAddressChangeRef.current(address);
  }, [placeQuery.data?.data?.address]);

  const predictions = (
    Array.isArray(predictionsQuery.data) ? predictionsQuery.data : []
  )
    .map((prediction) => {
      const placeId = resolvePlaceId(prediction as PlacePrediction);
      const label = (
        prediction as PlacePrediction
      )?.placePrediction?.text?.text?.trim();

      if (!placeId || !label) return null;

      return {
        ...(prediction as PlacePrediction),
        id: placeId,
        label,
      } as PredictionItem;
    })
    .filter(Boolean) as PredictionItem[];

  if (value) {
    return (
      <InputGroup className="min-h-11 bg-background">
        <InputGroup.Input readOnly value={value} />
        <InputGroup.Addon align="inline-start">
          <MapPin />
        </InputGroup.Addon>
        <InputGroup.Addon align="inline-end">
          <InputGroup.Button
            aria-label="Clear selected address"
            onClick={() => {
              setSelectedPlaceId("");
              setSearchInput("");
              onAddressChange({} as GoogleAddress);
            }}
            size="icon-sm"
            variant="ghost"
          >
            <X />
          </InputGroup.Button>
        </InputGroup.Addon>
      </InputGroup>
    );
  }

  return (
    <ComboboxDropdown
      contentInPlace={contentInPlace}
      emptyResults={
        searchInput.trim().length > 2 ? "No address found" : "Type an address"
      }
      isLoading={
        predictionsQuery.isFetching && debouncedSearchInput.trim().length > 2
      }
      items={predictions}
      onSearch={setSearchInput}
      onSelect={(item) => {
        setSelectedPlaceId(item.id);
      }}
      placeholder="Search Google address"
      popoverProps={{ align: "start" }}
      searchPlaceholder="Search Google address"
      Trigger={
        <Button
          aria-label="Search Google address"
          className="h-11 w-full justify-start px-3 font-normal text-muted-foreground"
          type="button"
          variant="outline"
        >
          <MapPin data-icon="inline-start" />
          <span className="truncate">
            {searchInput || "Search Google address"}
          </span>
        </Button>
      }
    />
  );
}

export function CustomerFormClient({
  customer,
  formId,
  mode = "page",
  renderActions,
  onCancel,
  onSaved,
}: {
  customer?: CustomerFormRecord;
  formId?: string;
  mode?: "page" | "modal";
  renderActions?: (actions: ReactNode) => ReactNode;
  onCancel?: () => void;
  onSaved?: (customer: CustomerFormSavedRecord) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profilesQuery = useQuery(
    trpc.dealerPortal.salesProfiles.queryOptions(),
  );
  const form = useZodForm(dealerPortalCustomerSchema, {
    defaultValues: getCustomerDefaultValues(customer ?? null),
  });
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileTitle, setProfileTitle] = useState("");
  const [profileCoefficient, setProfileCoefficient] = useState("");
  const formattedAddress =
    form.watch("formattedAddress") || form.watch("address") || "";
  const saveCustomer = useMutation(
    trpc.dealerPortal.saveCustomer.mutationOptions({
      onSuccess: async (savedCustomer) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.customers.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dealerPortal.customersList.pathKey(),
          }),
        ]);
        toast({
          title: "Customer saved.",
          variant: "success",
        });
        if (onSaved) {
          onSaved(savedCustomer);
          router.refresh();
          return;
        }

        router.push("/customers");
        router.refresh();
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

  useEffect(() => {
    form.reset(getCustomerDefaultValues(customer ?? null));
  }, [customer, form]);

  const profiles = profilesQuery.data ?? [];
  const selectedProfile = profiles.find(
    (profile) => profile.id === form.watch("customerTypeId"),
  );
  const profileOptions: SalesProfileOption[] = profiles.flatMap((profile) => {
    if (!profile.id) return [];

    return [
      {
        id: String(profile.id),
        label: formatSalesProfileOption(profile),
        profile: {
          id: profile.id,
          title: profile.title,
          coefficient: profile.coefficient,
        },
      },
    ];
  });
  const selectedProfileOption = selectedProfile
    ? profileOptions.find((option) => option.profile.id === selectedProfile.id)
    : undefined;
  const saveProfile = useMutation(
    trpc.dealerPortal.saveSalesProfile.mutationOptions({
      onSuccess: async (savedProfile) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.dealerPortal.salesProfiles.pathKey(),
        });
        form.setValue("customerTypeId", savedProfile.id, {
          shouldDirty: true,
          shouldValidate: true,
        });
        setIsCreatingProfile(false);
        setProfileTitle("");
        setProfileCoefficient("");
        toast({
          title: "Sales profile saved.",
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: "Could not save profile.",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );
  const openProfileCreator = (title = "") => {
    setProfileTitle(title.trim());
    setProfileCoefficient("");
    setIsCreatingProfile(true);
  };
  const saveInlineProfile = () => {
    const title = profileTitle.trim();
    const coefficient =
      profileCoefficient.trim() === "" ? null : Number(profileCoefficient);
    if (!title) {
      toast({
        title: "Profile name is required.",
        variant: "destructive",
      });
      return;
    }

    if (coefficient !== null && !Number.isFinite(coefficient)) {
      toast({
        title: "Enter a valid coefficient.",
        variant: "destructive",
      });
      return;
    }

    saveProfile.mutate({
      title,
      coefficient,
      defaultProfile: false,
    });
  };

  const cancelAction = onCancel ? (
    <Button onClick={onCancel} type="button" variant="outline">
      Cancel
    </Button>
  ) : (
    <Button asChild type="button" variant="outline">
      <Link href="/customers">Cancel</Link>
    </Button>
  );

  const actions = (
    <>
      {cancelAction}
      <CustomerQuickFill defaultProfileId={profiles[0]?.id ?? null} />
      <Button disabled={saveCustomer.isPending} form={formId} type="submit">
        {saveCustomer.isPending ? "Saving..." : "Save customer"}
      </Button>
    </>
  );

  return (
    <Form {...form}>
      <Card
        className={cn(
          "flex min-h-0 overflow-hidden rounded-lg border bg-background shadow-xl shadow-muted/40",
          mode === "modal"
            ? "-mx-4 -mt-2 h-[min(70vh,720px)] rounded-none border-x-0 border-t-0"
            : "h-[calc(100vh-12rem)] max-h-[900px]",
        )}
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          id={formId}
          key={customer?.id || "new-customer"}
          onSubmit={form.handleSubmit((values) => saveCustomer.mutate(values))}
        >
          <CardContent className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
            <aside className="flex flex-col gap-5 border-b bg-muted/30 p-5 lg:h-full lg:border-r lg:border-b-0">
              <div className="flex items-center gap-3">
                <Avatar className="size-14 rounded-md border bg-background shadow-sm">
                  <AvatarFallback className="rounded-md text-base font-semibold">
                    {getCustomerInitials(customer)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {getCustomerDisplayName(customer)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedProfile?.title || "No sales profile selected"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <RailRow label="Identity" value="Required" />
                <RailRow label="Contact" value="Recommended" />
                <RailRow label="Profiles" value={profiles.length || 0} />
              </div>

              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UsersRound className="size-4 text-muted-foreground" />
                  Sales workflow
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Customer data here is reused across documents, payment flows,
                  and account views.
                </p>
              </div>
            </aside>

            <div className="relative min-h-0 overflow-hidden">
              <FieldGroup
                className={cn(
                  "min-h-0 gap-0 divide-y overflow-y-auto overscroll-contain pb-44",
                  isCreatingProfile && "pointer-events-none invisible",
                )}
              >
                <div className="flex flex-col gap-4 p-5 md:p-6">
                  <SectionHeading icon={<UserRound className="size-4" />}>
                    Identity
                  </SectionHeading>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <InputGroup className="h-11 bg-background">
                            <FormControl>
                              <InputGroup.Input
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <InputGroup.Addon align="inline-start">
                              <UserRound />
                            </InputGroup.Addon>
                          </InputGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business name</FormLabel>
                          <InputGroup className="h-11 bg-background">
                            <FormControl>
                              <InputGroup.Input
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <InputGroup.Addon align="inline-start">
                              <Building2 />
                            </InputGroup.Addon>
                          </InputGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerTypeId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Sales profile</FormLabel>
                          <ComboboxDropdown
                            contentInPlace={mode === "modal"}
                            emptyResults="No sales profile found"
                            isLoading={profilesQuery.isPending}
                            items={profileOptions}
                            onCreate={openProfileCreator}
                            onSelect={(option) => {
                              field.onChange(Number(option.id));
                            }}
                            placeholder="Select sales profile"
                            popoverProps={{ align: "start" }}
                            renderOnCreate={(value) => (
                              <div className="flex items-center gap-2">
                                <Plus className="size-4" />
                                <span>Create "{value}"</span>
                              </div>
                            )}
                            searchPlaceholder="Search sales profiles"
                            selectedItem={selectedProfileOption}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-5 md:p-6">
                  <SectionHeading
                    icon={<BriefcaseBusiness className="size-4" />}
                  >
                    Contact
                  </SectionHeading>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <InputGroup className="h-11 bg-background">
                            <FormControl>
                              <InputGroup.Input
                                {...field}
                                onChange={(event) =>
                                  field.onChange(
                                    event.currentTarget.value.toLowerCase(),
                                  )
                                }
                                type="email"
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <InputGroup.Addon align="inline-start">
                              <Mail />
                            </InputGroup.Addon>
                          </InputGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <InputGroup className="h-11 bg-background">
                            <FormControl>
                              <PatternFormat
                                autoComplete="tel-national"
                                customInput={InputGroup.Input}
                                format="###-###-####"
                                getInputRef={field.ref}
                                inputMode="numeric"
                                mask="*"
                                name={field.name}
                                onBlur={field.onBlur}
                                onValueChange={({ formattedValue, value }) => {
                                  if (!value) {
                                    field.onChange("");
                                    return;
                                  }

                                  if (
                                    US_PHONE_FORMAT_PATTERN.test(formattedValue)
                                  ) {
                                    field.onChange(formattedValue);
                                    return;
                                  }

                                  field.onChange(
                                    formattedValue.replaceAll("_", ""),
                                  );
                                }}
                                placeholder="XXX-XXX-XXXX"
                                type="tel"
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <InputGroup.Addon align="inline-start">
                              <InputGroup.Text>+1</InputGroup.Text>
                            </InputGroup.Addon>
                            <InputGroup.Addon align="inline-end">
                              <Phone />
                            </InputGroup.Addon>
                          </InputGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <GoogleAddressInput
                            onAddressChange={(address) => {
                              const formatted = address.formattedAddress || "";
                              field.onChange(formatted);
                              form.setValue("formattedAddress", formatted);
                              form.setValue("address1", address.address1 || "");
                              form.setValue("address2", address.address2 || "");
                              form.setValue("city", address.city || "");
                              form.setValue(
                                "state",
                                address.region || address.state || "",
                              );
                              form.setValue(
                                "zip_code",
                                address.postalCode || "",
                              );
                              form.setValue("country", address.country || "");
                              form.setValue("lat", address.lat ?? null);
                              form.setValue("lng", address.lng ?? null);
                            }}
                            contentInPlace={mode === "modal"}
                            value={formattedAddress}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address2"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address line 2</FormLabel>
                          <InputGroup className="h-11 bg-background">
                            <FormControl>
                              <InputGroup.Input
                                {...field}
                                placeholder="Apt, suite, unit, building"
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <InputGroup.Addon align="inline-start">
                              <Building2 />
                            </InputGroup.Addon>
                          </InputGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </FieldGroup>

              {isCreatingProfile ? (
                <div
                  className="absolute inset-0 overflow-y-auto bg-background p-5 md:p-6"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    saveInlineProfile();
                  }}
                >
                  <div className="flex flex-col gap-5">
                    <SectionHeading icon={<UsersRound className="size-4" />}>
                      Create sales profile
                    </SectionHeading>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <FormLabel htmlFor="inline-sales-profile-title">
                          Profile name
                        </FormLabel>
                        <Input
                          autoFocus
                          id="inline-sales-profile-title"
                          onChange={(event) =>
                            setProfileTitle(event.currentTarget.value)
                          }
                          value={profileTitle}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <FormLabel htmlFor="inline-sales-profile-coefficient">
                          Coefficient
                        </FormLabel>
                        <Input
                          id="inline-sales-profile-coefficient"
                          onChange={(event) =>
                            setProfileCoefficient(event.currentTarget.value)
                          }
                          step="0.01"
                          type="number"
                          value={profileCoefficient}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                      <Button
                        onClick={() => setIsCreatingProfile(false)}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={saveProfile.isPending}
                        onClick={saveInlineProfile}
                        type="button"
                      >
                        <Save data-icon="inline-start" />
                        {saveProfile.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>

          {renderActions ? null : (
            <CardFooter className="flex flex-col gap-2 bg-muted/30 sm:flex-row sm:justify-end">
              {actions}
            </CardFooter>
          )}
        </form>
        {renderActions ? renderActions(actions) : null}
      </Card>
    </Form>
  );
}
