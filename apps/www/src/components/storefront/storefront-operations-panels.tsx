"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { FormEvent, useEffect, useState } from "react";

const listInput = { limit: 25 } as const;
const storefrontDateFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/New_York",
	dateStyle: "short",
	timeStyle: "medium",
});

function formatStorefrontDate(value: string | Date) {
	return storefrontDateFormatter.format(new Date(value));
}

export function StorefrontCartsPanel() {
	const trpc = useTRPC();
	const [cartId, setCartId] = useQueryState("cartId", parseAsString);
	const carts = useQuery(
		trpc.storefrontAdmin.operations.carts.queryOptions(listInput),
	);
	const detail = useQuery(
		trpc.storefrontAdmin.operations.cartDetail.queryOptions(
			{ id: cartId || "" },
			{ enabled: Boolean(cartId) },
		),
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Carts and wishlists</CardTitle>
				<p className="text-sm text-muted-foreground">
					Active customer and guest collections. Prices remain server-owned.
				</p>
			</CardHeader>
			<CardContent>
				<OperationsTable
					loading={carts.isPending}
					error={carts.error?.message}
					headers={[
						"Customer",
						"Type",
						"Status",
						"Items",
						"Subtotal",
						"Updated",
						"",
					]}
					rows={(carts.data?.items || []).map((cart) => [
						cart.customer?.customer?.businessName ||
							cart.customer?.customer?.name ||
							cart.customer?.name ||
							(cart.guest ? "Guest" : "Customer"),
						cart.type === "CART" ? "Cart" : "Wishlist",
						<Badge variant="secondary" key="status">
							{cart.status}
						</Badge>,
						String(cart.itemCount),
						`$${cart.subtotal.toFixed(2)}`,
						formatStorefrontDate(cart.updatedAt),
						<Button
							key="action"
							size="sm"
							variant="outline"
							onClick={() => void setCartId(cart.id)}
						>
							Inspect
						</Button>,
					])}
				/>
			</CardContent>
			<Sheet
				open={Boolean(cartId)}
				onOpenChange={(open) => {
					if (!open) void setCartId(null);
				}}
			>
				<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
					<SheetHeader>
						<SheetTitle>Collection details</SheetTitle>
						<SheetDescription>
							Canonical configurations and current validation status.
						</SheetDescription>
					</SheetHeader>
					{detail.isPending ? (
						<p className="p-5 text-sm text-muted-foreground">Loading…</p>
					) : detail.error ? (
						<p className="p-5 text-sm text-destructive">
							{detail.error.message}
						</p>
					) : detail.data ? (
						<div className="space-y-4 p-5">
							<div className="rounded-md border p-3 text-sm">
								<p className="font-medium">
									{detail.data.customer?.customer?.businessName ||
										detail.data.customer?.customer?.name ||
										detail.data.customer?.name ||
										"Guest shopper"}
								</p>
								<p className="text-muted-foreground">
									{detail.data.customer?.email || "No customer email"}
								</p>
							</div>
							{detail.data.lines.map((line) => (
								<div key={line.id} className="rounded-md border p-3">
									<div className="flex justify-between gap-3">
										<div>
											<p className="font-medium">
												{line.offer?.title || "Unavailable product"}
											</p>
											<p className="text-sm text-muted-foreground">
												{line.quantity} × ${line.unitPrice.toFixed(2)}
											</p>
										</div>
										<Badge variant="secondary">{line.validationStatus}</Badge>
									</div>
									<pre className="mt-3 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
										{JSON.stringify(line.configuration, null, 2)}
									</pre>
								</div>
							))}
						</div>
					) : null}
				</SheetContent>
			</Sheet>
		</Card>
	);
}

export function StorefrontOrdersPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const orders = useQuery(
		trpc.storefrontAdmin.operations.orders.queryOptions(listInput),
	);
	const verifyOrder = useMutation(
		trpc.storefrontAdmin.operations.verifyOrder.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.operations.orders.queryKey(),
				});
				toast({
					title: "Order verified",
					description: "The payment link was sent to the customer.",
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to verify order",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Online orders</CardTitle>
				<p className="text-sm text-muted-foreground">
					Storefront-origin orders are standard office sales orders.
				</p>
			</CardHeader>
			<CardContent>
				<OperationsTable
					loading={orders.isPending}
					error={orders.error?.message}
					headers={[
						"Order",
						"Customer",
						"Status",
						"Sales rep",
						"Payment",
						"Items",
						"Total",
						"Due",
						"Created",
						"",
					]}
					rows={(orders.data?.items || []).map((order) => [
						order.orderId,
						order.customer?.businessName || order.customer?.name || "Customer",
						<Badge variant="secondary" key="status">
							{order.status || "Active"}
						</Badge>,
						order.salesRep?.name || order.salesRep?.email || "Unassigned",
						<Badge variant="secondary" key="checkout-status">
							{order.checkout?.status || "Not started"}
						</Badge>,
						String(order.itemCount),
						`$${order.grandTotal.toFixed(2)}`,
						`$${order.amountDue.toFixed(2)}`,
						order.createdAt ? formatStorefrontDate(order.createdAt) : "",
						<div key="action" className="flex justify-end gap-2">
							{order.checkout?.status === "ORDER_CREATED" ? (
								<Button
									size="sm"
									disabled={verifyOrder.isPending}
									onClick={() =>
										verifyOrder.mutate({ checkoutId: order.checkout.id })
									}
								>
									Verify & send link
								</Button>
							) : null}
							<Button asChild size="sm" variant="outline">
								<Link href={`/sales-form/edit-order/${order.slug}`}>
									Open in Sales
								</Link>
							</Button>
						</div>,
					])}
				/>
			</CardContent>
		</Card>
	);
}

export function StorefrontInquiriesPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const inquiries = useQuery(
		trpc.storefrontAdmin.operations.inquiries.queryOptions(listInput),
	);
	const updateStatus = useMutation(
		trpc.storefrontAdmin.operations.updateInquiryStatus.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.operations.inquiries.queryKey(),
				});
				toast({ title: "Inquiry status updated", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to update inquiry",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Contact and custom quote inquiries</CardTitle>
				<p className="text-sm text-muted-foreground">
					Securely persisted customer requests awaiting office follow-up.
				</p>
			</CardHeader>
			<CardContent>
				<OperationsTable
					loading={inquiries.isPending}
					error={inquiries.error?.message}
					headers={[
						"Customer",
						"Type",
						"Request",
						"Contact",
						"Received",
						"Status",
					]}
					rows={(inquiries.data?.items || []).map((inquiry) => [
						inquiry.name,
						inquiry.type === "CUSTOM_QUOTE" ? "Custom quote" : "Contact",
						<div key="request" className="max-w-md">
							<p className="font-medium">
								{inquiry.subject || "Customer request"}
							</p>
							<p className="line-clamp-3 text-muted-foreground">
								{inquiry.message}
							</p>
							{inquiry.budget ? (
								<p className="mt-1 text-xs">Budget: {inquiry.budget}</p>
							) : null}
						</div>,
						<div key="contact">
							<p>{inquiry.email}</p>
							<p className="text-muted-foreground">
								{inquiry.phone || "No phone"}
							</p>
						</div>,
						formatStorefrontDate(inquiry.createdAt),
						<select
							key="status"
							className="h-9 rounded-md border bg-background px-2 text-sm"
							value={inquiry.status}
							disabled={updateStatus.isPending}
							onChange={(event) =>
								updateStatus.mutate({
									id: inquiry.id,
									status: event.target.value as
										| "NEW"
										| "IN_REVIEW"
										| "RESPONDED"
										| "CLOSED"
										| "SPAM",
								})
							}
						>
							<option value="NEW">New</option>
							<option value="IN_REVIEW">In review</option>
							<option value="RESPONDED">Responded</option>
							<option value="CLOSED">Closed</option>
							<option value="SPAM">Spam</option>
						</select>,
					])}
				/>
			</CardContent>
		</Card>
	);
}

export function StorefrontSettingsPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settings = useQuery(trpc.storefrontAdmin.settings.get.queryOptions());
	const salesReps = useQuery(
		trpc.storefrontAdmin.settings.salesReps.queryOptions(),
	);
	const [form, setForm] = useState({
		defaultSalesRepId: null as number | null,
		pickupEnabled: true,
		deliveryEnabled: false,
		deliveryFlatRate: 0,
		freeDeliveryThreshold: null as number | null,
	});
	useEffect(() => {
		if (settings.data)
			setForm({
				...settings.data.checkout,
				defaultSalesRepId: settings.data.defaultSalesRepId,
			});
	}, [settings.data]);
	const save = useMutation(
		trpc.storefrontAdmin.settings.save.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.settings.get.queryKey(),
				});
				toast({ title: "Storefront settings saved", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to save settings",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	return (
		<Card className="max-w-3xl">
			<CardHeader>
				<CardTitle>Checkout and fulfillment</CardTitle>
				<p className="text-sm text-muted-foreground">
					These rules are enforced again by the server when the cart becomes a
					Sales Order.
				</p>
			</CardHeader>
			<CardContent>
				<form
					className="space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						save.mutate(form);
					}}
				>
					<label className="grid gap-1 text-sm">
						Default sales rep
						<select
							className="h-9 rounded-md border bg-background px-3"
							value={form.defaultSalesRepId || ""}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									defaultSalesRepId: event.target.value
										? Number(event.target.value)
										: null,
								}))
							}
						>
							<option value="">Select a sales rep</option>
							{salesReps.data?.map((salesRep) => (
								<option key={salesRep.id} value={salesRep.id}>
									{salesRep.name || salesRep.email}
								</option>
							))}
						</select>
					</label>
					<SwitchRow
						label="Allow pickup"
						checked={form.pickupEnabled}
						onChange={(value) =>
							setForm((current) => ({
								...current,
								pickupEnabled: value,
							}))
						}
					/>
					<SwitchRow
						label="Allow delivery"
						checked={form.deliveryEnabled}
						onChange={(value) =>
							setForm((current) => ({
								...current,
								deliveryEnabled: value,
							}))
						}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<NumberField
							label="Delivery flat rate"
							value={form.deliveryFlatRate}
							onChange={(value) =>
								setForm((current) => ({
									...current,
									deliveryFlatRate: value,
								}))
							}
						/>
						<NumberField
							label="Free delivery threshold"
							value={form.freeDeliveryThreshold || 0}
							onChange={(value) =>
								setForm((current) => ({
									...current,
									freeDeliveryThreshold: value > 0 ? value : null,
								}))
							}
						/>
					</div>
					<Button disabled={save.isPending || settings.isPending}>
						{save.isPending ? "Saving…" : "Save checkout settings"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

export function StorefrontContentPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const pages = useQuery(trpc.storefrontAdmin.content.list.queryOptions());
	const [pageId, setPageId] = useState("");
	const [page, setPage] = useState({
		slug: "home",
		title: "Home",
		description: "",
		status: "DRAFT" as "DRAFT" | "PUBLISHED",
	});
	const [section, setSection] = useState({
		key: "hero",
		type: "hero" as
			| "hero"
			| "rich-text"
			| "category-grid"
			| "offer-grid"
			| "faq"
			| "cta",
		title: "",
		body: "",
		imageUrl: "",
		actionLabel: "",
		actionUrl: "",
		status: "DRAFT" as "DRAFT" | "PUBLISHED",
	});
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.storefrontAdmin.content.list.queryKey(),
		});
	const savePage = useMutation(
		trpc.storefrontAdmin.content.savePage.mutationOptions({
			onSuccess: async (saved) => {
				setPageId(saved.id);
				await refresh();
				toast({ title: "Storefront page saved", variant: "success" });
			},
		}),
	);
	const saveSection = useMutation(
		trpc.storefrontAdmin.content.saveSection.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast({ title: "Storefront section saved", variant: "success" });
			},
		}),
	);
	const selectedPage = pages.data?.find((item) => item.id === pageId);
	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
			<Card>
				<CardHeader>
					<CardTitle>Pages</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<select
						className="h-9 w-full rounded-md border bg-background px-3 text-sm"
						value={pageId}
						onChange={(event) => {
							const selected = pages.data?.find(
								(item) => item.id === event.target.value,
							);
							setPageId(event.target.value);
							if (selected) {
								setPage({
									slug: selected.slug,
									title: selected.title,
									description: selected.description || "",
									status:
										selected.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
								});
							}
						}}
					>
						<option value="">Create a page</option>
						{pages.data?.map((item) => (
							<option key={item.id} value={item.id}>
								{item.title}
							</option>
						))}
					</select>
					<TextField
						label="Page title"
						value={page.title}
						onChange={(value) =>
							setPage((current) => ({ ...current, title: value }))
						}
					/>
					<TextField
						label="Slug"
						value={page.slug}
						onChange={(value) =>
							setPage((current) => ({ ...current, slug: value }))
						}
					/>
					<label className="grid gap-1 text-sm">
						Description
						<Textarea
							value={page.description}
							onChange={(event) =>
								setPage((current) => ({
									...current,
									description: event.target.value,
								}))
							}
						/>
					</label>
					<SwitchRow
						label="Published"
						checked={page.status === "PUBLISHED"}
						onChange={(value) =>
							setPage((current) => ({
								...current,
								status: value ? "PUBLISHED" : "DRAFT",
							}))
						}
					/>
					<Button
						disabled={savePage.isPending}
						onClick={() =>
							savePage.mutate({
								id: pageId || undefined,
								...page,
								description: page.description || null,
								seo: {},
							})
						}
					>
						Save page
					</Button>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Sections</CardTitle>
					<p className="text-sm text-muted-foreground">
						{selectedPage
							? `${selectedPage.sections.length} section(s) on ${selectedPage.title}`
							: "Save or choose a page before adding sections."}
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{selectedPage?.sections.map((item) => (
						<div
							key={item.id}
							className="flex items-center justify-between rounded-md border p-3"
						>
							<div>
								<p className="font-medium">{item.key}</p>
								<p className="text-xs text-muted-foreground">
									{item.type} · {item.status.toLowerCase()}
								</p>
							</div>
						</div>
					))}
					<select
						className="h-9 w-full rounded-md border bg-background px-3 text-sm"
						value={section.type}
						onChange={(event) =>
							setSection((current) => ({
								...current,
								type: event.target.value as typeof section.type,
							}))
						}
					>
						<option value="hero">Hero</option>
						<option value="rich-text">Rich text</option>
						<option value="category-grid">Category grid</option>
						<option value="offer-grid">Product grid</option>
						<option value="faq">FAQ</option>
						<option value="cta">Call to action</option>
					</select>
					<div className="grid gap-4 sm:grid-cols-2">
						<TextField
							label="Section key"
							value={section.key}
							onChange={(value) =>
								setSection((current) => ({ ...current, key: value }))
							}
						/>
						<TextField
							label="Heading"
							value={section.title}
							onChange={(value) =>
								setSection((current) => ({ ...current, title: value }))
							}
						/>
						<TextField
							label="Image URL"
							value={section.imageUrl}
							onChange={(value) =>
								setSection((current) => ({
									...current,
									imageUrl: value,
								}))
							}
						/>
						<TextField
							label="Action URL"
							value={section.actionUrl}
							onChange={(value) =>
								setSection((current) => ({
									...current,
									actionUrl: value,
								}))
							}
						/>
					</div>
					<label className="grid gap-1 text-sm">
						Body
						<Textarea
							value={section.body}
							onChange={(event) =>
								setSection((current) => ({
									...current,
									body: event.target.value,
								}))
							}
						/>
					</label>
					<SwitchRow
						label="Published"
						checked={section.status === "PUBLISHED"}
						onChange={(value) =>
							setSection((current) => ({
								...current,
								status: value ? "PUBLISHED" : "DRAFT",
							}))
						}
					/>
					<Button
						disabled={!pageId || saveSection.isPending}
						onClick={() =>
							saveSection.mutate({
								pageId,
								key: section.key,
								type: section.type,
								content: {
									title: section.title,
									body: section.body,
									imageUrl: section.imageUrl,
									actionLabel: section.actionLabel,
									actionUrl: section.actionUrl,
								},
								status: section.status,
								sortOrder: selectedPage?.sections.length || 0,
							})
						}
					>
						Add section
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function OperationsTable({
	headers,
	rows,
	loading,
	error,
}: {
	headers: string[];
	rows: React.ReactNode[][];
	loading: boolean;
	error?: string;
}) {
	if (loading) return <p className="py-10 text-center">Loading…</p>;
	if (error)
		return <p className="py-10 text-center text-destructive">{error}</p>;
	if (!rows.length) {
		return (
			<p className="py-10 text-center text-muted-foreground">
				No records found.
			</p>
		);
	}
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b text-left text-muted-foreground">
						{headers.map((header) => (
							<th key={header} className="px-3 py-2 font-medium">
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIndex) => (
						<tr key={rowIndex} className="border-b last:border-0">
							{row.map((cell, cellIndex) => (
								<td key={cellIndex} className="px-3 py-3">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function SwitchRow({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex items-center justify-between rounded-md border p-3 text-sm">
			{label}
			<Switch checked={checked} onCheckedChange={onChange} />
		</label>
	);
}

function NumberField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
}) {
	return (
		<label className="grid gap-1 text-sm">
			{label}
			<Input
				type="number"
				min={0}
				step="0.01"
				value={value}
				onChange={(event) => onChange(Number(event.target.value || 0))}
			/>
		</label>
	);
}

function TextField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="grid gap-1 text-sm">
			{label}
			<Input value={value} onChange={(event) => onChange(event.target.value)} />
		</label>
	);
}
