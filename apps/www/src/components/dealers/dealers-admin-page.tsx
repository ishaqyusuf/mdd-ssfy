"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type AddMode = "existing" | "new";
type CustomerCandidate = {
    id?: number;
    name?: string | null;
    businessName?: string | null;
    email?: string | null;
    phoneNo?: string | null;
    auth?: {
        id: number;
        status: string | null;
    } | null;
};

function displayCustomerName(customer?: CustomerCandidate | null) {
    if (!customer) return "";
    return customer.businessName || customer.name || `Customer #${customer.id}`;
}

function formatDate(value?: Date | string | null) {
    if (!value) return "Not set";
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

function statusTone(status?: string | null) {
    switch (status) {
        case "active":
        case "approved":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "restricted":
        case "suspended":
            return "border-red-200 bg-red-50 text-red-700";
        default:
            return "border-amber-200 bg-amber-50 text-amber-800";
    }
}

export function DealersAdminPage() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<AddMode>("existing");
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerCandidate | null>(null);
    const [dealerName, setDealerName] = useState("");
    const [dealerEmail, setDealerEmail] = useState("");
    const [resendingDealerId, setResendingDealerId] = useState<number | null>(
        null,
    );
    const debouncedSearch = useDebounce(search, 300);
    const debouncedCustomerSearch = useDebounce(customerSearch, 300);

    const dealersQuery = useQuery(
        trpc.dealer.list.queryOptions({
            search: debouncedSearch || null,
            size: 50,
        }),
    );

    const candidateQuery = useQuery(
        trpc.dealer.searchCustomerCandidates.queryOptions({
            query: debouncedCustomerSearch || null,
            take: 10,
        }),
    );

    const createDealer = useMutation(
        trpc.dealer.createAccount.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: trpc.dealer.list.pathKey(),
                });
                setOpen(false);
                setSelectedCustomer(null);
                setCustomerSearch("");
                setDealerName("");
                setDealerEmail("");
                setMode("existing");
                toast({
                    title: "Dealer onboarding started.",
                    description:
                        "The dealer account was created and queued for onboarding.",
                    variant: "success",
                });
            },
            onError: (error) => {
                toast({
                    title: "Could not create dealer.",
                    description: error.message,
                    variant: "destructive",
                });
            },
        }),
    );

    const resendOnboarding = useMutation(
        trpc.dealer.resendOnboarding.mutationOptions({
            onMutate: (variables) => {
                setResendingDealerId(
                    variables && "dealerId" in variables
                        ? variables.dealerId
                        : null,
                );
            },
            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: trpc.dealer.list.pathKey(),
                });
                toast({
                    title: "Onboarding resent.",
                    description:
                        "A new dealer setup link was queued for delivery.",
                    variant: "success",
                });
            },
            onError: (error) => {
                toast({
                    title: "Could not resend onboarding.",
                    description: error.message,
                    variant: "destructive",
                });
            },
            onSettled: () => {
                setResendingDealerId(null);
            },
        }),
    );

    const dealers = dealersQuery.data ?? [];
    const candidates = candidateQuery.data ?? [];
    const totalActive = useMemo(
        () =>
            dealers.filter((dealer) =>
                ["active", "approved"].includes(dealer.status || ""),
            ).length,
        [dealers],
    );
    const totalPending = useMemo(
        () => dealers.filter((dealer) => dealer.status === "pending").length,
        [dealers],
    );

    const canSubmit =
        mode === "existing"
            ? !!selectedCustomer?.id && !!selectedCustomer.email
            : !!dealerName.trim() && !!dealerEmail.trim();

    function submitDealer() {
        if (mode === "existing") {
            if (!selectedCustomer?.id || !selectedCustomer.email) {
                toast({
                    title: "Customer email required.",
                    description:
                        "Select a customer with an email before onboarding them.",
                    variant: "destructive",
                });
                return;
            }

            createDealer.mutate({
                customerId: selectedCustomer.id,
                name: displayCustomerName(selectedCustomer),
                email: selectedCustomer.email,
            });
            return;
        }

        createDealer.mutate({
            name: dealerName,
            email: dealerEmail,
        });
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-center md:justify-between">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label="Total dealers" value={dealers.length} />
                    <Metric label="Active" value={totalActive} />
                    <Metric label="Pending" value={totalPending} />
                    <Metric label="Showing" value={dealers.length} />
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-9 gap-2 self-start md:self-center">
                            <Icons.Add className="size-4" />
                            Add dealer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add dealer</DialogTitle>
                        </DialogHeader>

                        <Tabs
                            value={mode}
                            onValueChange={(value) => setMode(value as AddMode)}
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="existing">
                                    Existing customer
                                </TabsTrigger>
                                <TabsTrigger value="new">
                                    New dealer
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent
                                value="existing"
                                className="mt-4 space-y-3"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="dealer-customer-search">
                                        Search customers
                                    </Label>
                                    <Input
                                        id="dealer-customer-search"
                                        value={customerSearch}
                                        onChange={(event) =>
                                            setCustomerSearch(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Name, business, email, or phone"
                                    />
                                </div>
                                <RadioGroup
                                    value={selectedCustomer?.id?.toString()}
                                    onValueChange={(value) => {
                                        const next = candidates.find(
                                            (candidate) =>
                                                candidate.id?.toString() ===
                                                value,
                                        );
                                        setSelectedCustomer(next ?? null);
                                    }}
                                    className="max-h-72 overflow-y-auto rounded-lg border"
                                >
                                    {candidateQuery.isPending ? (
                                        <div className="p-4 text-sm text-muted-foreground">
                                            Loading customers...
                                        </div>
                                    ) : candidates.length ? (
                                        candidates.map((customer) => (
                                            <label
                                                key={customer.id}
                                                className="flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 hover:bg-muted/50"
                                            >
                                                <RadioGroupItem
                                                    value={
                                                        customer.id?.toString() ??
                                                        ""
                                                    }
                                                    className="mt-1"
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium">
                                                        {displayCustomerName(
                                                            customer,
                                                        )}
                                                    </span>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {customer.email ||
                                                            "No email on customer"}{" "}
                                                        {customer.phoneNo
                                                            ? `- ${customer.phoneNo}`
                                                            : ""}
                                                    </span>
                                                    {customer.auth ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="mt-2 rounded-full text-[11px]"
                                                        >
                                                            Dealer{" "}
                                                            {customer.auth
                                                                .status ||
                                                                "pending"}
                                                        </Badge>
                                                    ) : null}
                                                </span>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="p-4 text-sm text-muted-foreground">
                                            No customers found.
                                        </div>
                                    )}
                                </RadioGroup>
                            </TabsContent>
                            <TabsContent value="new" className="mt-4 space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="dealer-name">
                                        Dealer name
                                    </Label>
                                    <Input
                                        id="dealer-name"
                                        value={dealerName}
                                        onChange={(event) =>
                                            setDealerName(event.target.value)
                                        }
                                        placeholder="Dealer or company name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dealer-email">Email</Label>
                                    <Input
                                        id="dealer-email"
                                        type="email"
                                        value={dealerEmail}
                                        onChange={(event) =>
                                            setDealerEmail(event.target.value)
                                        }
                                        placeholder="dealer@example.com"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={!canSubmit || createDealer.isPending}
                                onClick={submitDealer}
                            >
                                {createDealer.isPending
                                    ? "Sending..."
                                    : "Send onboarding"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-lg border bg-background">
                <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-base font-semibold">
                            Dealer accounts
                        </h2>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search dealers"
                            className="pl-9"
                        />
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Dealer</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Customer profile</TableHead>
                            <TableHead>Customer link</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dealersQuery.isPending ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="h-24 text-center"
                                >
                                    Loading dealers...
                                </TableCell>
                            </TableRow>
                        ) : dealers.length ? (
                            dealers.map((dealer) => {
                                const dealerName =
                                    dealer.companyName ||
                                    dealer.name ||
                                    dealer.dealer?.businessName ||
                                    dealer.dealer?.name ||
                                    "Unnamed dealer";
                                const isResending =
                                    resendOnboarding.isPending &&
                                    resendingDealerId === dealer.id;
                                const canResendOnboarding = !dealer.authUserId;

                                return (
                                    <TableRow key={dealer.id}>
                                        <TableCell className="font-medium">
                                            {dealerName}
                                        </TableCell>
                                        <TableCell>{dealer.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`rounded-full capitalize ${statusTone(dealer.status)}`}
                                            >
                                                {dealer.status || "pending"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm">
                                                    {dealer.dealer?.profile
                                                        ?.title ||
                                                        "No customer profile"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Coefficient{" "}
                                                    {dealer.dealer?.profile
                                                        ?.coefficient ?? "-"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {dealer.dealer ? (
                                                <span className="text-sm">
                                                    {dealer.dealer
                                                        .businessName ||
                                                        dealer.dealer.name ||
                                                        `Customer #${dealer.dealer.id}`}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    Dealer-only profile
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(dealer.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    className="h-8 gap-2"
                                                    disabled={
                                                        !canResendOnboarding ||
                                                        resendOnboarding.isPending
                                                    }
                                                    onClick={() =>
                                                        resendOnboarding.mutate(
                                                            {
                                                                dealerId:
                                                                    dealer.id,
                                                            },
                                                        )
                                                    }
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    {isResending ? (
                                                        <Icons.Loader2 className="size-3.5 animate-spin" />
                                                    ) : (
                                                        <Icons.Mail className="size-3.5" />
                                                    )}
                                                    Resend
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="h-24 text-center"
                                >
                                    No dealers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border bg-muted/20 px-3 py-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
        </div>
    );
}
