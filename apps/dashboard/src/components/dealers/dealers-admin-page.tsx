"use client";

import {
	PageTabs,
	invalidatePageTabsForPathKeys,
} from "@/components/page-tabs";
import { queryFromActiveFilters } from "@/components/page-tabs/query-utils";
import { SavePageTabButton } from "@/components/page-tabs/save-page-tab-button";
import { SearchInput } from "@/components/search-input";
import { DealersColumnVisibility } from "@/components/tables-2/dealers/column-visibility";
import type { SalesProfileOption } from "@/components/tables-2/dealers/columns";
import { DataTable } from "@/components/tables-2/dealers/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import { parseAsString } from "nuqs/server";
import { useEffect, useMemo, useState } from "react";
import {
	type FilterDefinition,
	buildOptionLabelLookup,
} from "../midday-search-filter/filter-definitions";
import { DealerProgramAdmin } from "./dealer-program-admin";
import { DealerSummaryWidgets } from "./dealer-summary-widgets";

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

const dealerFilterParams = {
	search: parseAsString,
};

const dealerFilterDefinitions = [
	{
		key: "search",
		label: "Search",
		type: "search",
	},
] satisfies FilterDefinition[];

const dealerOptionLookup = buildOptionLabelLookup(dealerFilterDefinitions);

function displayCustomerName(customer?: CustomerCandidate | null) {
	if (!customer) return "";
	return customer.businessName || customer.name || `Customer #${customer.id}`;
}

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function DealersAdminPage({ initialSettings }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const [filters, setFilters] = useQueryStates(dealerFilterParams);
	const search = filters.search ?? "";
	const [open, setOpen] = useState(false);
	const [isHydrated, setIsHydrated] = useState(false);
	const [mode, setMode] = useState<AddMode>("existing");
	const [customerSearch, setCustomerSearch] = useState("");
	const [selectedCustomer, setSelectedCustomer] =
		useState<CustomerCandidate | null>(null);
	const [dealerName, setDealerName] = useState("");
	const [dealerEmail, setDealerEmail] = useState("");
	const [resendingDealerId, setResendingDealerId] = useState<number | null>(
		null,
	);
	const [updatingProfileDealerId, setUpdatingProfileDealerId] = useState<
		number | null
	>(null);
	const debouncedSearch = useDebounce(search, 300);
	const debouncedCustomerSearch = useDebounce(customerSearch, 300);

	useEffect(() => setIsHydrated(true), []);

	const dealersQuery = useQuery(
		trpc.dealer.list.queryOptions({
			search: debouncedSearch || null,
			size: 50,
		}),
	);

	const profilesQuery = useQuery(trpc.dealer.salesProfiles.queryOptions());

	const candidateQuery = useQuery({
		...trpc.dealer.searchCustomerCandidates.queryOptions({
			query: debouncedCustomerSearch || null,
			take: 10,
		}),
		enabled: open && mode === "existing",
	});

	const createDealer = useMutation(
		trpc.dealer.createAccount.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealer.list.pathKey(),
					}),
					invalidatePageTabsForPathKeys(queryClient, trpc, "dealers"),
				]);
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

	const updateSalesProfile = useMutation(
		trpc.dealer.updateSalesProfile.mutationOptions({
			onMutate: (variables) => {
				setUpdatingProfileDealerId(
					variables && "dealerId" in variables ? variables.dealerId : null,
				);
			},
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealer.list.pathKey(),
					}),
					invalidatePageTabsForPathKeys(queryClient, trpc, "dealers"),
				]);
				toast({
					title: "Sales profile updated.",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Could not update sales profile.",
					description: error.message,
					variant: "destructive",
				});
			},
			onSettled: () => {
				setUpdatingProfileDealerId(null);
			},
		}),
	);

	const resendOnboarding = useMutation(
		trpc.dealer.resendOnboarding.mutationOptions({
			onMutate: (variables) => {
				setResendingDealerId(
					variables && "dealerId" in variables ? variables.dealerId : null,
				);
			},
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealer.list.pathKey(),
					}),
					invalidatePageTabsForPathKeys(queryClient, trpc, "dealers"),
				]);
				toast({
					title: "Onboarding resent.",
					description: "A new dealer setup link was queued for delivery.",
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
	const salesProfileOptions: SalesProfileOption[] = useMemo(
		() =>
			(profilesQuery.data ?? []).map((profile) => ({
				id: String(profile.id),
				label: profile.title,
				coefficient: profile.coefficient,
			})),
		[profilesQuery.data],
	);
	const totalActive = useMemo(
		() =>
			dealers.filter((dealer) =>
				["active", "approved"].includes(dealer.status || ""),
			).length,
		[dealers],
	);
	const totalPending = useMemo(
		() =>
			dealers.filter((dealer) =>
				["pending", "pending approval", "pending_approval"].includes(
					dealer.status?.toLowerCase() || "",
				),
			).length,
		[dealers],
	);
	const totalVerified = useMemo(
		() =>
			dealers.filter((dealer) => dealer.status?.toLowerCase() === "verified")
				.length,
		[dealers],
	);
	const activeTabFilters = useMemo(
		() => ({
			search: filters.search,
		}),
		[filters.search],
	);
	const saveTabQuery = useMemo(
		() =>
			queryFromActiveFilters(searchParams, activeTabFilters, {
				searchKey: "search",
			}),
		[searchParams, activeTabFilters],
	);
	const canSaveTab = Boolean(saveTabQuery && !search);

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
		<div className="flex min-w-0 flex-col gap-5 sm:gap-6">
			<DealerSummaryWidgets
				active={totalActive}
				isLoading={!isHydrated || dealersQuery.isPending}
				pending={totalPending}
				shown={dealers.length}
				verified={totalVerified}
			/>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Add dealer</DialogTitle>
					</DialogHeader>

					<Tabs
						value={mode}
						onValueChange={(value) => setMode(value as AddMode)}
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="existing">Existing customer</TabsTrigger>
							<TabsTrigger value="new">New dealer</TabsTrigger>
						</TabsList>
						<TabsContent value="existing" className="mt-4 space-y-3">
							<div className="space-y-2">
								<Label htmlFor="dealer-customer-search">Search customers</Label>
								<Input
									id="dealer-customer-search"
									value={customerSearch}
									onChange={(event) => setCustomerSearch(event.target.value)}
									placeholder="Name, business, email, or phone"
								/>
							</div>
							<RadioGroup
								value={selectedCustomer?.id?.toString()}
								onValueChange={(value) => {
									const next = candidates.find(
										(candidate) => candidate.id?.toString() === value,
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
											htmlFor={`dealer-candidate-${customer.id}`}
											key={customer.id}
											className="flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 hover:bg-muted/50"
										>
											<RadioGroupItem
												id={`dealer-candidate-${customer.id}`}
												value={customer.id?.toString() ?? ""}
												className="mt-1"
											/>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-medium">
													{displayCustomerName(customer)}
												</span>
												<span className="block truncate text-xs text-muted-foreground">
													{customer.email || "No email on customer"}{" "}
													{customer.phoneNo ? `- ${customer.phoneNo}` : ""}
												</span>
												{customer.auth ? (
													<Badge
														variant="outline"
														className="mt-2 rounded-full text-[11px]"
													>
														Dealer {customer.auth.status || "pending"}
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
								<Label htmlFor="dealer-name">Dealer name</Label>
								<Input
									id="dealer-name"
									value={dealerName}
									onChange={(event) => setDealerName(event.target.value)}
									placeholder="Dealer or company name"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="dealer-email">Email</Label>
								<Input
									id="dealer-email"
									type="email"
									value={dealerEmail}
									onChange={(event) => setDealerEmail(event.target.value)}
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
							{createDealer.isPending ? "Sending..." : "Send onboarding"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="min-w-0 space-y-3">
				<div className="sticky top-0 z-30 -mx-4 space-y-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:-mx-6 sm:px-6">
					<div className="min-w-0">
						<PageTabs
							portal={false}
							currentQuery={saveTabQuery}
							action={
								canSaveTab ? (
									<SavePageTabButton
										buttonClassName="rounded-sm border-0"
										definitions={dealerFilterDefinitions}
										filters={activeTabFilters}
										optionLookup={dealerOptionLookup}
										query={saveTabQuery}
										searchKey="search"
									/>
								) : undefined
							}
						/>
					</div>
					<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
						<div className="min-w-0 flex-1">
							<SearchInput
								ariaLabel="Search dealers"
								value={search}
								onChangeText={(text) => {
									const value = text.trimStart();
									void setFilters({
										search: value || null,
									});
								}}
								placeholder="Search dealers..."
							/>
						</div>
						<div className="flex shrink-0 items-center justify-end gap-2">
							<DealersColumnVisibility />
							<Button className="h-9 gap-2" onClick={() => setOpen(true)}>
								<Icons.Add className="size-4" />
								Add dealer
							</Button>
						</div>
					</div>
				</div>
				<DataTable
					dealers={dealers}
					hasFilters={Boolean(filters.search)}
					initialSettings={initialSettings}
					isLoading={!isHydrated || dealersQuery.isPending}
					isProfilesLoading={profilesQuery.isPending}
					isResending={resendOnboarding.isPending}
					onCreateDealer={() => setOpen(true)}
					onResendOnboarding={(dealerId) =>
						resendOnboarding.mutate({
							dealerId,
						})
					}
					onUpdateSalesProfile={(dealerId, profileId) =>
						updateSalesProfile.mutate({
							dealerId,
							customerProfileId: profileId,
						})
					}
					profiles={salesProfileOptions}
					resendingDealerId={resendingDealerId}
					updatingProfileDealerId={updatingProfileDealerId}
				/>
			</div>
			<DealerProgramAdmin />
		</div>
	);
}
