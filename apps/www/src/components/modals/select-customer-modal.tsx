"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";

interface SelectCustomerModalProps {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function SelectCustomerModal({
    open,
    onOpenChange,
}: SelectCustomerModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const router = useRouter();

    // Dummy customer data for now, replace with actual tRPC query
    const { data: customers, isLoading: isLoadingCustomers } = useQuery(
        trpc.customers.searchCustomers.queryOptions(
            { query: debouncedSearchTerm },
            // { keepPreviousData: true }
        ),
    );

    const startNewSalesMutation = useMutation(
        trpc.sales.startNewSales.mutationOptions({
            onSuccess: (data) => {
                // queryClient.invalidateQueries(trpc.sales.invoiceById.queryKey({ id: data.id.toString() }));
                onOpenChange(false);
                // router.push(`/invoice-form/${data.id}`);
            },
            onError: (error) => {
                console.error("Failed to start new sales:", error);
                // Handle error, e.g., show a toast
            },
        }),
    );

    const handleSelectCustomer = (customerId: number) => {
        startNewSalesMutation.mutate({ customerId });
    };

    const handleSelectLater = () => {
        startNewSalesMutation.mutate({}); // Create sales order without customer
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="min-w-max flex flex-col max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select Customer</DialogTitle>
                    <DialogDescription>
                        Search for an existing customer or create a new one.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 flex flex-col gap-4">
                    <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <ScrollArea className="flex-1 h-64 border rounded-md p-2">
                        {isLoadingCustomers ? (
                            <div>Loading customers...</div>
                        ) : customers && customers.length > 0 ? (
                            customers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer rounded-md"
                                    onClick={() =>
                                        handleSelectCustomer(customer.id)
                                    }
                                >
                                    {customer.name}{" "}
                                    {customer.businessName
                                        ? `(${customer.businessName})`
                                        : ""}
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500">
                                No customers found.
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter className="flex justify-between gap-4">
                    <Button
                        variant="outline"
                        onClick={() => console.log("Create New Customer")}
                    >
                        Create New Customer
                    </Button>
                    <Button
                        onClick={handleSelectLater}
                        disabled={startNewSalesMutation.isPending}
                    >
                        {startNewSalesMutation.isPending
                            ? "Creating..."
                            : "Select Later"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

