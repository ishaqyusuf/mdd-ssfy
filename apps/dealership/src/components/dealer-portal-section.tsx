"use client";

import { useTRPC } from "@/trpc/client";
import {
	SalesFormHeaderActions,
	SalesFormLineItemsPanel,
	calculateDualSalesFormPricing,
	type SalesFormLineItemUiRecord,
} from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FileText, Save, UserPlus } from "lucide-react";
import { useState } from "react";

type Section = "orders" | "quotes" | "customers" | "profiles" | "settings";

type DealerPortalSectionProps = {
	section: Section;
};

function formatDate(value?: Date | string | null) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);
}

function getSettingLogoUrl(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
	const value = (meta as { logoUrl?: unknown }).logoUrl;
	return typeof value === "string" ? value : "";
}

export function DealerPortalSection({ section }: DealerPortalSectionProps) {
	if (section === "customers") return <DealerCustomers />;
	if (section === "profiles") return <DealerSalesProfiles />;
	if (section === "settings") return <DealerSettings />;
	return (
		<DealerSalesDocuments type={section === "quotes" ? "quote" : "order"} />
	);
}

function DealerCustomers() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [editingCustomer, setEditingCustomer] = useState<{
		id: number;
		name: string | null;
		businessName: string | null;
		email: string | null;
		phoneNo: string | null;
		address: string | null;
		customerTypeId: number | null;
	} | null>(null);
	const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const saveCustomer = useMutation(
		trpc.dealerPortal.saveCustomer.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.customers.pathKey(),
				});
				toast({
					title: "Customer saved.",
					variant: "success",
				});
				setEditingCustomer(null);
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

	function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const customerTypeId = Number(form.get("customerTypeId") || 0);

		saveCustomer.mutate({
			id: editingCustomer?.id || null,
			name: String(form.get("name") || ""),
			businessName: String(form.get("businessName") || ""),
			email: String(form.get("email") || ""),
			phoneNo: String(form.get("phoneNo") || ""),
			address: String(form.get("address") || ""),
			customerTypeId: customerTypeId || null,
		});

		event.currentTarget.reset();
	}

	const customers = customersQuery.data ?? [];
	const profiles = profilesQuery.data ?? [];

	return (
		<div className="space-y-6">
			<section className="rounded-lg border bg-background p-4">
				<h3 className="mb-4 text-base font-semibold">
					{editingCustomer ? "Edit customer" : "Add customer"}
				</h3>
				<form
					className="grid gap-3 md:grid-cols-2"
					key={editingCustomer?.id || "new-customer"}
					onSubmit={onSubmit}
				>
					<Field
						defaultValue={editingCustomer?.name || ""}
						label="Name"
						name="name"
					/>
					<Field
						defaultValue={editingCustomer?.businessName || ""}
						label="Business name"
						name="businessName"
					/>
					<Field
						defaultValue={editingCustomer?.email || ""}
						label="Email"
						name="email"
						type="email"
					/>
					<Field
						defaultValue={editingCustomer?.phoneNo || ""}
						label="Phone"
						name="phoneNo"
					/>
					<label className="space-y-2">
						<span className="text-sm font-medium">Sales profile</span>
						<select
							className="h-9 w-full rounded-md border bg-background px-3 text-sm"
							defaultValue={editingCustomer?.customerTypeId || ""}
							name="customerTypeId"
						>
							<option value="">None</option>
							{profiles.map((profile) => (
								<option key={profile.id} value={profile.id}>
									{profile.title}
								</option>
							))}
						</select>
					</label>
					<div className="space-y-2 md:col-span-2">
						<Label htmlFor="customer-address">Address</Label>
						<Textarea
							defaultValue={editingCustomer?.address || ""}
							id="customer-address"
							name="address"
							rows={3}
						/>
					</div>
					<div className="flex gap-2 md:col-span-2">
						<Button disabled={saveCustomer.isPending} type="submit">
							<UserPlus className="mr-2 size-4" />
							{saveCustomer.isPending ? "Saving..." : "Save customer"}
						</Button>
						{editingCustomer ? (
							<Button
								onClick={() => setEditingCustomer(null)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
						) : null}
					</div>
				</form>
			</section>

			<section className="rounded-lg border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Customer</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Phone</TableHead>
							<TableHead>Profile</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{customersQuery.isPending ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									Loading customers...
								</TableCell>
							</TableRow>
						) : customers.length ? (
							customers.map((customer) => (
								<TableRow key={customer.id}>
									<TableCell className="font-medium">
										{customer.businessName ||
											customer.name ||
											`Customer #${customer.id}`}
									</TableCell>
									<TableCell>{customer.email || "-"}</TableCell>
									<TableCell>{customer.phoneNo || "-"}</TableCell>
									<TableCell>{customer.profile?.title || "-"}</TableCell>
									<TableCell>{formatDate(customer.createdAt)}</TableCell>
									<TableCell className="text-right">
										<Button
											onClick={() =>
												setEditingCustomer({
													id: customer.id!,
													name: customer.name || null,
													businessName: customer.businessName || null,
													email: customer.email || null,
													phoneNo: customer.phoneNo || null,
													address: customer.address || null,
													customerTypeId: customer.customerTypeId || null,
												})
											}
											size="sm"
											type="button"
											variant="outline"
										>
											Edit
										</Button>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									No customers yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</section>
		</div>
	);
}

function DealerSalesProfiles() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [editingProfile, setEditingProfile] = useState<{
		id: number;
		title: string;
		coefficient: number | null;
		defaultProfile: boolean | null;
	} | null>(null);
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const saveProfile = useMutation(
		trpc.dealerPortal.saveSalesProfile.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.salesProfiles.pathKey(),
				});
				toast({
					title: "Sales profile saved.",
					variant: "success",
				});
				setEditingProfile(null);
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

	function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const coefficient = Number(form.get("coefficient") || 0);

		saveProfile.mutate({
			id: editingProfile?.id || null,
			title: String(form.get("title") || ""),
			coefficient: Number.isFinite(coefficient) ? coefficient : null,
			defaultProfile: form.get("defaultProfile") === "on",
		});

		event.currentTarget.reset();
	}

	const profiles = profilesQuery.data ?? [];

	return (
		<div className="space-y-6">
			<section className="rounded-lg border bg-background p-4">
				<h3 className="mb-4 text-base font-semibold">
					{editingProfile ? "Edit sales profile" : "Add sales profile"}
				</h3>
				<form
					className="grid gap-3 md:grid-cols-[1fr_160px_auto]"
					key={editingProfile?.id || "new-profile"}
					onSubmit={onSubmit}
				>
					<Field
						defaultValue={editingProfile?.title || ""}
						label="Profile name"
						name="title"
						required
					/>
					<Field
						defaultValue={editingProfile?.coefficient ?? ""}
						label="Coefficient"
						name="coefficient"
						step="0.01"
						type="number"
					/>
					<label className="flex items-end gap-2 pb-2 text-sm">
						<input
							className="size-4"
							defaultChecked={!!editingProfile?.defaultProfile}
							name="defaultProfile"
							type="checkbox"
						/>
						Default
					</label>
					<div className="flex gap-2 md:col-span-3">
						<Button disabled={saveProfile.isPending} type="submit">
							<Save className="mr-2 size-4" />
							{saveProfile.isPending ? "Saving..." : "Save profile"}
						</Button>
						{editingProfile ? (
							<Button
								onClick={() => setEditingProfile(null)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
						) : null}
					</div>
				</form>
			</section>

			<section className="rounded-lg border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Profile</TableHead>
							<TableHead>Coefficient</TableHead>
							<TableHead>Customers</TableHead>
							<TableHead>Default</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{profilesQuery.isPending ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									Loading profiles...
								</TableCell>
							</TableRow>
						) : profiles.length ? (
							profiles.map((profile) => (
								<TableRow key={profile.id}>
									<TableCell className="font-medium">{profile.title}</TableCell>
									<TableCell>{profile.coefficient ?? "-"}</TableCell>
									<TableCell>{profile._count.customers}</TableCell>
									<TableCell>
										{profile.defaultProfile ? (
											<Badge variant="outline">Default</Badge>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell>{formatDate(profile.createdAt)}</TableCell>
									<TableCell className="text-right">
										<Button
											onClick={() =>
												setEditingProfile({
													id: profile.id!,
													title: profile.title || "",
													coefficient: profile.coefficient ?? null,
													defaultProfile: profile.defaultProfile ?? false,
												})
											}
											size="sm"
											type="button"
											variant="outline"
										>
											Edit
										</Button>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									No sales profiles yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</section>
		</div>
	);
}

function DealerSalesDocuments({ type }: { type: "order" | "quote" }) {
	const trpc = useTRPC();
	const documentsQuery = useQuery(
		trpc.dealerPortal.salesDocuments.queryOptions({ type }),
	);
	const documents = documentsQuery.data ?? [];

	return (
		<div className="space-y-6">
			{type === "quote" ? <DealerQuoteComposer /> : null}
			<section className="rounded-lg border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{type === "quote" ? "Quote" : "Order"}</TableHead>
							<TableHead>Customer</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Total</TableHead>
							<TableHead>Balance</TableHead>
							<TableHead>Created</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{documentsQuery.isPending ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									Loading {type === "quote" ? "quotes" : "orders"}...
								</TableCell>
							</TableRow>
						) : documents.length ? (
							documents.map((document) => (
								<TableRow key={document.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											<FileText className="size-4 text-muted-foreground" />
											{document.orderId}
										</div>
									</TableCell>
									<TableCell>
										{document.customer?.businessName ||
											document.customer?.name ||
											document.customer?.email ||
											"-"}
									</TableCell>
									<TableCell>
										<Badge className="capitalize" variant="outline">
											{document.status || "open"}
										</Badge>
									</TableCell>
									<TableCell>{formatCurrency(document.grandTotal)}</TableCell>
									<TableCell>{formatCurrency(document.amountDue)}</TableCell>
									<TableCell>{formatDate(document.createdAt)}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									No {type === "quote" ? "quotes" : "orders"} yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</section>
		</div>
	);
}

function createDealerLineItem(index = 0): SalesFormLineItemUiRecord {
	return {
		id: null,
		uid: `dealer-line-${index + 1}-${Date.now().toString(36)}`,
		title: "",
		description: "",
		qty: 1,
		unitPrice: 0,
		lineTotal: 0,
		meta: {},
		formSteps: [],
		shelfItems: [],
		housePackageTool: null,
	};
}

function DealerQuoteComposer() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const [customerId, setCustomerId] = useState<number | null>(null);
	const [customerProfileId, setCustomerProfileId] = useState<number | null>(
		null,
	);
	const [taxRate, setTaxRate] = useState(0);
	const [lineItems, setLineItems] = useState<SalesFormLineItemUiRecord[]>([
		createDealerLineItem(0),
	]);
	const saveQuote = useMutation(
		trpc.dealerPortal.saveQuote.mutationOptions({
			onSuccess: async (result) => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.salesDocuments.pathKey(),
				});
				toast({
					title: `Quote ${result.orderId} saved.`,
					variant: "success",
				});
				setLineItems([createDealerLineItem(0)]);
			},
			onError: (error) => {
				toast({
					title: "Could not save quote.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const customers = customersQuery.data ?? [];
	const profiles = profilesQuery.data ?? [];
	const selectedCustomer = customers.find(
		(customer) => customer.id === customerId,
	);
	const selectedProfile =
		profiles.find((profile) => profile.id === customerProfileId) ||
		profiles.find(
			(profile) => profile.id === selectedCustomer?.customerTypeId,
		) ||
		null;
	const pricing = calculateDualSalesFormPricing({
		taxRate,
		dealerProfile: selectedProfile,
		internalProfile: { coefficient: 1 },
		lineItems,
	});

	function updateLineItem(
		uid: string,
		patch: Partial<SalesFormLineItemUiRecord>,
	) {
		setLineItems((current) =>
			current.map((line, index) => {
				if (line.uid !== uid) return line;
				const next = {
					...line,
					...patch,
				};
				if (patch.qty != null || patch.unitPrice != null) {
					next.lineTotal =
						Math.round(
							(Number(next.qty || 0) * Number(next.unitPrice || 0) +
								Number.EPSILON) *
								100,
						) / 100;
				}
				return {
					...next,
					uid: next.uid || `dealer-line-${index + 1}`,
				};
			}),
		);
	}

	function save() {
		if (!customerId) {
			toast({
				title: "Select a customer first.",
				variant: "destructive",
			});
			return;
		}

		saveQuote.mutate({
			customerId,
			customerProfileId,
			taxRate,
			lineItems: lineItems.map((line) => ({
				uid: line.uid,
				title: line.title,
				description: line.description,
				qty: Number(line.qty || 0),
				unitPrice: Number(line.unitPrice || 0),
				lineTotal: Number(line.lineTotal || 0),
			})),
		});
	}

	return (
		<section className="overflow-hidden rounded-lg border bg-background">
			<SalesFormHeaderActions
				dirty
				isSaved={false}
				isSaving={saveQuote.isPending}
				onAddItem={() =>
					setLineItems((current) => [
						...current,
						createDealerLineItem(current.length),
					])
				}
				onSaveDraft={save}
				onSaveFinal={save}
				saveStatus={saveQuote.isPending ? "saving" : "idle"}
				type="quote"
			/>
			<div className="grid gap-4 p-4 xl:grid-cols-[1fr_320px]">
				<div className="space-y-4">
					<div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
						<label className="space-y-2">
							<span className="text-sm font-medium">Customer</span>
							<select
								className="h-9 w-full rounded-md border bg-background px-3 text-sm"
								onChange={(event) => {
									const nextCustomerId =
										Number(event.target.value || 0) || null;
									const customer = customers.find(
										(item) => item.id === nextCustomerId,
									);
									setCustomerId(nextCustomerId);
									setCustomerProfileId(customer?.customerTypeId || null);
								}}
								value={customerId || ""}
							>
								<option value="">Select customer</option>
								{customers.map((customer) => (
									<option key={customer.id} value={customer.id}>
										{customer.businessName ||
											customer.name ||
											customer.email ||
											customer.id}
									</option>
								))}
							</select>
						</label>
						<label className="space-y-2">
							<span className="text-sm font-medium">Sales profile</span>
							<select
								className="h-9 w-full rounded-md border bg-background px-3 text-sm"
								onChange={(event) =>
									setCustomerProfileId(Number(event.target.value || 0) || null)
								}
								value={customerProfileId || ""}
							>
								<option value="">Standard</option>
								{profiles.map((profile) => (
									<option key={profile.id} value={profile.id}>
										{profile.title}
									</option>
								))}
							</select>
						</label>
						<Field
							label="Tax rate"
							min={0}
							name="taxRate"
							onChange={(event) => setTaxRate(Number(event.target.value || 0))}
							step="0.01"
							type="number"
							value={taxRate}
						/>
					</div>
					<SalesFormLineItemsPanel
						lineItems={lineItems}
						onAddLineItem={() =>
							setLineItems((current) => [
								...current,
								createDealerLineItem(current.length),
							])
						}
						onRemoveLineItem={(uid) =>
							setLineItems((current) =>
								current.length <= 1
									? current
									: current.filter((line) => line.uid !== uid),
							)
						}
						onUpdateLineItem={updateLineItem}
					/>
				</div>
				<aside className="rounded-lg border p-4">
					<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						Customer quote total
					</h3>
					<div className="mt-4 space-y-3 text-sm">
						<div className="flex justify-between">
							<span>Subtotal</span>
							<span>{formatCurrency(pricing.dealerPricing.subTotal)}</span>
						</div>
						<div className="flex justify-between">
							<span>Tax</span>
							<span>{formatCurrency(pricing.dealerPricing.taxTotal)}</span>
						</div>
						<div className="flex justify-between border-t pt-3 text-base font-semibold">
							<span>Total</span>
							<span>{formatCurrency(pricing.dealerPricing.grandTotal)}</span>
						</div>
					</div>
					<Button
						className="mt-5 w-full"
						disabled={saveQuote.isPending || !customerId}
						onClick={save}
						type="button"
					>
						<Save className="mr-2 size-4" />
						{saveQuote.isPending ? "Saving..." : "Save quote"}
					</Button>
				</aside>
			</div>
		</section>
	);
}

function DealerSettings() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(trpc.dealerPortal.settings.queryOptions());
	const saveSettings = useMutation(
		trpc.dealerPortal.saveSettings.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.settings.pathKey(),
				});
				toast({
					title: "Company settings saved.",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Could not save settings.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);

		saveSettings.mutate({
			name: String(form.get("name") || ""),
			companyName: String(form.get("companyName") || ""),
			phoneNo: String(form.get("phoneNo") || ""),
			logoUrl: String(form.get("logoUrl") || ""),
			address1: String(form.get("address1") || ""),
			address2: String(form.get("address2") || ""),
			city: String(form.get("city") || ""),
			state: String(form.get("state") || ""),
			country: String(form.get("country") || ""),
		});
	}

	const settings = settingsQuery.data;
	const logoUrl = getSettingLogoUrl(settings?.meta);

	return (
		<section className="rounded-lg border bg-background p-4">
			<form
				className="space-y-6"
				key={settingsQuery.dataUpdatedAt || "dealer-settings"}
				onSubmit={onSubmit}
			>
				<div className="grid gap-3 md:grid-cols-2">
					<Field
						defaultValue={settings?.name || ""}
						label="Contact name"
						name="name"
					/>
					<Field
						defaultValue={settings?.companyName || ""}
						label="Company name"
						name="companyName"
					/>
					<Field
						defaultValue={settings?.phoneNo || ""}
						label="Phone"
						name="phoneNo"
					/>
					<Field
						defaultValue={logoUrl}
						label="Logo URL"
						name="logoUrl"
						type="url"
					/>
				</div>

				{logoUrl ? (
					<div className="flex items-center gap-3 rounded-md border p-3">
						<div className="flex size-14 items-center justify-center overflow-hidden rounded-md border bg-muted">
							<img
								alt=""
								className="max-h-full max-w-full object-contain"
								src={logoUrl}
							/>
						</div>
						<div>
							<p className="text-sm font-medium">Invoice logo</p>
							<p className="text-xs text-muted-foreground">{settings?.email}</p>
						</div>
					</div>
				) : null}

				<div className="grid gap-3 md:grid-cols-2">
					<Field
						defaultValue={settings?.primaryBillingAddress?.address1 || ""}
						label="Address line 1"
						name="address1"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.address2 || ""}
						label="Address line 2"
						name="address2"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.city || ""}
						label="City"
						name="city"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.state || ""}
						label="State"
						name="state"
					/>
					<Field
						defaultValue={settings?.primaryBillingAddress?.country || ""}
						label="Country"
						name="country"
					/>
				</div>

				<Button
					disabled={saveSettings.isPending || settingsQuery.isPending}
					type="submit"
				>
					<Building2 className="mr-2 size-4" />
					{saveSettings.isPending ? "Saving..." : "Save company settings"}
				</Button>
			</form>
		</section>
	);
}

function Field({
	label,
	name,
	...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
	label: string;
	name: string;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={name}>{label}</Label>
			<Input id={name} name={name} {...props} />
		</div>
	);
}
