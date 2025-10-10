import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { _trpc } from "@/components/static-trpc";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { useQuery } from "@gnd/ui/tanstack";
import { InputGroup, Item } from "@gnd/ui/composite";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Fragment, useState } from "react";
import { Spinner } from "@gnd/ui/spinner";
import { consoleLog } from "@gnd/utils";
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
    if (isPending && isEnabled) return <Skeletons.FeedPost />;
    if (!customer) return <SearchCustomer />;
    return <div></div>;
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
                        placeholder="Search..."
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
                                <Button size="sm" variant="outline">
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

