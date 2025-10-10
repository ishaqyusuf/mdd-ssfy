import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { _trpc } from "@/components/static-trpc";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { useQuery } from "@gnd/ui/tanstack";
import { InputGroup, Item } from "@gnd/ui/composite";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Fragment, useState } from "react";
import { Spinner } from "@gnd/ui/spinner";
import { consoleLog, generateRandomString } from "@gnd/utils";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
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
    if (isPending && isEnabled) return <Skeletons.FeedPost />;
    if (!customer) return <SearchCustomer />;
    const Content = ({
        title,
        className = "",
        description,
        children = null,
    }) => (
        <div>
            <Item className={className} size="sm">
                <Item.Content>
                    <Item.Title>{title}</Item.Title>
                    <Item.Description>{description}</Item.Description>
                </Item.Content>
                {!children || <Item.Actions>{children}</Item.Actions>}
            </Item>
            <Item.Separator />
        </div>
    );

    return (
        <div>
            <Content
                title="Customer"
                description={customer?.customerData.join("\n")}
            >
                <Button
                    onClick={(e) => {
                        setParams({
                            customerId: md.customer.id,
                            customerForm: true,
                            // addressId: !address
                            //     ? null
                            //     : address == "bad"
                            //       ? md?.billing?.id
                            //       : md?.shipping?.id,
                            // address,
                        });
                    }}
                    className="size-7 p-0"
                    size="sm"
                    variant="outline"
                >
                    <Icons.Edit className="size-4" />
                </Button>
                <Button
                    onClick={(e) => {
                        zus.dotUpdate("metaData.billing", {});
                        zus.dotUpdate("metaData.shipping", {});
                        zus.dotUpdate("metaData.customer", {});
                    }}
                    className="size-7 p-0"
                    variant="destructive"
                >
                    <Icons.Clear className="size-4" />
                </Button>
            </Content>
            <Content
                title="Bill To"
                description={customer?.billing?.lines?.join("\n")}
            />
            <Content
                title="Ship To"
                description={customer?.shipping?.lines?.join("\n")}
            />
        </div>
    );
}
function SearchCustomer() {
    const [q, setSearch] = useState("");
    const zus = useFormDataStore();
    const md = zus.metaData;

    const { params, setParams } = useCreateCustomerParams();
    const debouncedQuery = useDebounce(q, 800);
    const {
        data: searchResult,
        isPending,
        isEnabled,
    } = useQuery(
        _trpc.customers.customerInfoSearch.queryOptions(
            {
                type: "customer", // : "address",
                // customerId,
                q: debouncedQuery,
            },
            {
                enabled: !!debouncedQuery,
            },
        ),
    );
    return (
        <div className="py-2">
            <div className="flex gap-2 items-center">
                <InputGroup>
                    <InputGroup.Input
                        value={q}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        placeholder="Search or create customer..."
                    />
                    <InputGroup.Addon>
                        <Search />
                    </InputGroup.Addon>
                    <InputGroup.Addon align="inline-end">
                        {isPending && isEnabled ? (
                            <>
                                <Spinner />
                            </>
                        ) : searchResult?.length ? (
                            <>{searchResult.length} result</>
                        ) : null}
                    </InputGroup.Addon>
                </InputGroup>
                <Button
                    onClick={(e) => {
                        setParams({
                            customerForm: true,
                        });
                    }}
                    size="sm"
                >
                    <Icons.Add className="size-4" />
                </Button>
            </div>
            <div className="py-2 max-h-[30vh] overflow-auto">
                {!debouncedQuery || (
                    <Fragment key="new">
                        <Item size="sm">
                            <Item.Content>
                                <Item.Title>Create new</Item.Title>
                                <Item.Description>
                                    {debouncedQuery}
                                </Item.Description>
                            </Item.Content>
                            <Item.Actions>
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
                            </Item.Actions>
                        </Item>
                        <Item.Separator />
                    </Fragment>
                )}
                {searchResult?.map((sr, index) => (
                    <Fragment key={sr.id}>
                        <Item size="sm" key={sr.id}>
                            <Item.Content>
                                <Item.Title>{sr?.name}</Item.Title>
                                <Item.Description>{sr?.phone}</Item.Description>
                            </Item.Content>
                            <Item.Actions>
                                <Button
                                    onClick={(e) => {
                                        const metaData = {
                                            ...md,
                                        };
                                        // if (!props.address) {
                                        metaData.customer.id = sr.customerId;
                                        if (!md.shipping.id)
                                            metaData.shipping.id = sr.addressId;
                                        if (!md.billing.id)
                                            metaData.billing.id = sr.addressId;
                                        // } else {
                                        //     if (props.address == "bad")
                                        //         metaData.billing.id = addressId;
                                        //     else
                                        //         metaData.shipping.id =
                                        //             addressId;
                                        // }
                                        metaData.profileChangedToken =
                                            generateRandomString();

                                        zus.dotUpdate("metaData", metaData);
                                    }}
                                    size="sm"
                                    variant="outline"
                                >
                                    Select
                                </Button>
                            </Item.Actions>
                        </Item>
                        {index !== searchResult.length - 1 && (
                            <Item.Separator />
                        )}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}

