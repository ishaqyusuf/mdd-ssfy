import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { _trpc } from "@/components/static-trpc";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { useQuery } from "@gnd/ui/tanstack";
import { InputGroup } from "@gnd/ui/namespace";
import { Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Spinner } from "@gnd/ui/spinner";
import { generateRandomString } from "@gnd/utils";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { SettingsClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { dotCompare } from "@/utils/compare";

export function SalesCustomerInput() {
    const zus = useFormDataStore();
    const md = zus.metaData;

    const {
        data: customer,
        isPending,
        isEnabled,
    } = useQuery(
        _trpc.customers.getSalesCustomer.queryOptions(
            {
                billingId: md.billing.id,
                customerId: md.customer.id,
                shippingId: md.shipping.id,
            },
            {
                enabled: !!md.customer.id,
            },
        ),
    );

    const { params, setParams } = useCreateCustomerParams();

    useEffect(() => {
        if (!params?.payload) return;

        const data = params.payload;
        const metaData = { ...md };

        if (!data?.address) {
            metaData.customer.id = data.customerId;
            metaData.billing.id = data.addressId;
        } else {
            metaData.customer.id = data.customerId;
            if (data.address === "bad") metaData.billing.id = data.addressId;
            else metaData.shipping.id = data.addressId;

            if (
                data.address === "bad" &&
                (md.shipping.id === md.billing.id || !md.shipping.id)
            ) {
                metaData.shipping.id = data.addressId;
            }
        }

        if (
            dotCompare(metaData, md, "billing.id", "shipping.id", "customer.id")
        ) {
            metaData.dataRefreshToken = generateRandomString();
        }

        metaData.profileChangedToken = data.address
            ? null
            : generateRandomString();

        zus.dotUpdate("metaData", metaData);
        setParams(null);
    }, [params, md, setParams, zus]);

    useEffect(() => {
        if (!customer || !md) return;

        const patch: typeof md = {
            ...md,
            billing: {
                id: customer.billingId,
                customerId: customer.customerId,
            },
            shipping: {
                id: customer.shippingId,
                customerId: customer.customerId,
            },
            customer: {
                id: customer.customerId,
            },
        };

        if (md.profileChangedToken) {
            patch.tax.taxCode = customer.taxCode;
            patch.salesProfileId = customer.profileId;
            patch.paymentTerm = customer.netTerm as any;
        }

        zus.dotUpdate("metaData", patch);

        if (md.profileChangedToken) {
            const setting = new SettingsClass();
            setting.taxCodeChanged();
            setting.salesProfileChanged();
            setTimeout(() => {
                setting.calculateTotalPrice();
            }, 100);
        }
    }, [customer]);

    if (isPending && isEnabled) return <Skeletons.FeedPost />;
    if (!customer) return <SearchCustomer />;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Customer Profile
                </p>
                <p className="mt-1 text-sm text-slate-700">
                    Manage customer details, billing, and shipping addresses.
                </p>
            </div>

            <div className="space-y-3 p-3">
                <ProfileSection
                    title="Customer"
                    tone="default"
                    actions={
                        <>
                            <Button
                                onClick={() => {
                                    setParams({
                                        customerId: md.customer.id,
                                        customerForm: true,
                                    });
                                }}
                                className="size-8 p-0"
                                size="sm"
                                variant="outline"
                            >
                                <Icons.Edit className="size-4" />
                            </Button>
                            <Button
                                onClick={() => {
                                    zus.dotUpdate("metaData.billing", {});
                                    zus.dotUpdate("metaData.shipping", {});
                                    zus.dotUpdate("metaData.customer", {});
                                }}
                                className="size-8 p-0"
                                variant="destructive"
                            >
                                <Icons.Clear className="size-4" />
                            </Button>
                        </>
                    }
                >
                    <p className="truncate text-sm font-medium text-slate-900">
                        {customer.customer?.name}
                    </p>
                </ProfileSection>

                {/* <ProfileSection
                    title="Bill To"
                    lines={customer.billing?.lines}
                    tone="subtle"
                    actions={
                        <Button
                            onClick={() => {
                                const addressId = customer.billing?.id;
                                setParams({
                                    customerId: md.customer.id,
                                    customerForm: true,
                                    addressId: addressId > 0 ? addressId : undefined,
                                    address: "bad",
                                });
                            }}
                            className="size-8 p-0"
                            size="sm"
                            variant="outline"
                        >
                            <Icons.Edit className="size-4" />
                        </Button>
                    }
                /> */}

                <ProfileSection
                    title="Ship To"
                    lines={customer.shipping?.lines}
                    tone="subtle"
                    actions={
                        <Button
                            onClick={() => {
                                const addressId = customer.shipping?.id;
                                setParams({
                                    customerId: md.customer.id,
                                    customerForm: true,
                                    addressId: !!addressId
                                        ? addressId
                                        : undefined,
                                    address: "sad",
                                });
                            }}
                            className="size-8 p-0"
                            size="sm"
                            variant="outline"
                        >
                            <Icons.Edit className="size-4" />
                        </Button>
                    }
                />
            </div>
        </div>
    );
}

function ProfileSection({
    title,
    lines,
    actions,
    tone = "default",
    children,
}: {
    title: string;
    lines?: string[];
    actions?: ReactNode;
    tone?: "default" | "subtle";
    children?;
}) {
    const hasLines = !!lines?.length;
    const toneClasses = useMemo(
        () =>
            tone === "default"
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-200 bg-white",
        [tone],
    );

    return (
        <div className={`rounded-lg border ${toneClasses} px-3 py-3`}>
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {title}
                    </p>
                    <div className="mt-1 space-y-0.5 text-sm leading-relaxed text-slate-800">
                        {children ? (
                            children
                        ) : hasLines ? (
                            lines?.map((line, index) => (
                                <p
                                    className="truncate"
                                    key={`${title}-${index}`}
                                >
                                    {line}
                                </p>
                            ))
                        ) : (
                            <p className="text-slate-500">
                                No details available
                            </p>
                        )}
                    </div>
                </div>
                {actions ? (
                    <div className="flex items-center gap-1">{actions}</div>
                ) : null}
            </div>
        </div>
    );
}

function SearchCustomer() {
    const [q, setSearch] = useState("");
    const zus = useFormDataStore();
    const md = zus.metaData;

    const { setParams } = useCreateCustomerParams();
    const debouncedQuery = useDebounce(q, 800);

    const {
        data: searchResult,
        isPending,
        isEnabled,
    } = useQuery(
        _trpc.customers.customerInfoSearch.queryOptions(
            {
                type: "customer",
                q: debouncedQuery,
            },
            {
                enabled: !!debouncedQuery,
            },
        ),
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Customer Lookup
                </p>
                <p className="mt-1 text-sm text-slate-700">
                    Search existing customers or create a new profile.
                </p>
            </div>

            <div className="flex items-center gap-2">
                <InputGroup>
                    <InputGroup.Input
                        value={q}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search customer name, phone, or profile"
                    />
                    <InputGroup.Addon>
                        <Search className="size-4" />
                    </InputGroup.Addon>
                    <InputGroup.Addon align="inline-end">
                        {isPending && isEnabled ? (
                            <Spinner />
                        ) : searchResult?.length ? (
                            <span className="text-xs text-slate-600">
                                {searchResult.length} result
                                {searchResult.length > 1 ? "s" : ""}
                            </span>
                        ) : null}
                    </InputGroup.Addon>
                </InputGroup>

                <Button
                    onClick={() => {
                        setParams({
                            customerForm: true,
                        });
                    }}
                    size="sm"
                    className="shrink-0"
                >
                    <Icons.Add className="size-4" />
                </Button>
            </div>

            <div className="mt-3 max-h-[36vh] space-y-2 overflow-auto pr-1">
                {!debouncedQuery ? (
                    <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                        Start typing to find a customer.
                    </p>
                ) : (
                    <>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        Create New
                                    </p>
                                    <p className="truncate text-sm text-slate-800">
                                        {debouncedQuery}
                                    </p>
                                </div>
                                <Button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setParams({
                                            customerForm: true,
                                            search: q,
                                        });
                                    }}
                                    size="sm"
                                    variant="outline"
                                >
                                    Create
                                </Button>
                            </div>
                        </div>

                        {searchResult?.map((sr, index) => (
                            <Fragment key={index}>
                                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 transition-colors hover:bg-slate-50">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">
                                                {sr.name} - {sr.profileName}
                                            </p>
                                            <p className="truncate text-xs text-slate-600">
                                                {sr.phone} - {sr.taxName}
                                            </p>
                                        </div>

                                        <Button
                                            onClick={() => {
                                                const metaData = { ...md };

                                                metaData.customer.id =
                                                    sr.customerId;
                                                if (!md.shipping.id)
                                                    metaData.shipping.id =
                                                        sr.addressId;
                                                if (!md.billing.id)
                                                    metaData.billing.id =
                                                        sr.addressId;

                                                metaData.profileChangedToken =
                                                    generateRandomString();
                                                metaData.salesProfileId =
                                                    sr.profileId;

                                                if (sr.taxCode) {
                                                    metaData.tax = {
                                                        taxCode: sr.taxCode,
                                                    } as any;
                                                }

                                                zus.dotUpdate(
                                                    "metaData",
                                                    metaData,
                                                );
                                                new SettingsClass().taxCodeChanged();
                                            }}
                                            size="sm"
                                            variant="outline"
                                        >
                                            Select
                                        </Button>
                                    </div>
                                </div>
                            </Fragment>
                        ))}

                        {!searchResult?.length && !isPending ? (
                            <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                                No customers found. Use Create to add this
                                customer.
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

