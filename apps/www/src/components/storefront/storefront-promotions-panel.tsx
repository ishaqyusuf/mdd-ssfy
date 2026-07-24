"use client";

import {
	CheckList,
	DateTimeField,
	NumberField,
	TargetSection,
	TextField,
} from "@/components/storefront/storefront-promotion-fields";
import { useTRPC } from "@/trpc/client";
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
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

const BUSINESS_TIME_ZONE = "America/New_York";
const emptyForm = {
	id: undefined as string | undefined,
	internalName: "",
	publicTitle: "",
	description: null as string | null,
	badgeText: "",
	bannerText: null as string | null,
	bannerHref: null as string | null,
	percentageOff: 10,
	priority: 0,
	audienceMode: "EVERYONE" as "EVERYONE" | "TARGETED",
	scopeMode: "ALL_OFFERS" as "ALL_OFFERS" | "TARGETED",
	startsAt: "",
	endsAt: "",
	customerIds: [] as number[],
	customerProfileIds: [] as number[],
	categoryIds: [] as string[],
	offerIds: [] as string[],
};

function zonedInputValue(value: string | Date | null | undefined) {
	if (!value) return "";
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: BUSINESS_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(value));
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value || "";
	return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function businessTimeToUtc(value: string) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
	if (!match) return new Date(value).toISOString();
	const [, year, month, day, hour, minute] = match;
	const desiredUtc = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
	);
	let candidate = desiredUtc;
	for (let pass = 0; pass < 2; pass += 1) {
		const rendered = zonedInputValue(new Date(candidate));
		const renderedMatch = rendered.match(
			/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
		);
		if (!renderedMatch) break;
		const renderedUtc = Date.UTC(
			Number(renderedMatch[1]),
			Number(renderedMatch[2]) - 1,
			Number(renderedMatch[3]),
			Number(renderedMatch[4]),
			Number(renderedMatch[5]),
		);
		candidate += desiredUtc - renderedUtc;
	}
	return new Date(candidate).toISOString();
}

export function StorefrontPromotionsPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [promotionId, setPromotionId] = useQueryState(
		"promotionId",
		parseAsString,
	);
	const [customerSearch, setCustomerSearch] = useState("");
	const [offerSearch, setOfferSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		"" | "DRAFT" | "PUBLISHED" | "ARCHIVED"
	>("");
	const [form, setForm] = useState(emptyForm);
	const promotions = useQuery(
		trpc.storefrontAdmin.promotions.list.queryOptions({
			limit: 50,
			status: statusFilter || undefined,
		}),
	);
	const profiles = useQuery(
		trpc.storefrontAdmin.promotions.profiles.queryOptions(undefined, {
			enabled: Boolean(promotionId && form.audienceMode === "TARGETED"),
		}),
	);
	const categories = useQuery(
		trpc.storefrontAdmin.promotions.categories.queryOptions(undefined, {
			enabled: Boolean(promotionId && form.scopeMode === "TARGETED"),
		}),
	);
	const customers = useQuery(
		trpc.storefrontAdmin.promotions.searchOptions.queryOptions(
			{
				type: "CUSTOMER",
				query: customerSearch,
				limit: 50,
			},
			{
				enabled: Boolean(promotionId && form.audienceMode === "TARGETED"),
			},
		),
	);
	const offers = useQuery(
		trpc.storefrontAdmin.promotions.searchOptions.queryOptions(
			{
				type: "OFFER",
				query: offerSearch,
				limit: 50,
			},
			{
				enabled: Boolean(promotionId && form.scopeMode === "TARGETED"),
			},
		),
	);
	const detail = useQuery(
		trpc.storefrontAdmin.promotions.detail.queryOptions(
			{ id: promotionId || "" },
			{ enabled: Boolean(promotionId && promotionId !== "new") },
		),
	);

	useEffect(() => {
		if (promotionId === "new") {
			setForm({
				...emptyForm,
				startsAt: zonedInputValue(new Date()),
			});
			return;
		}
		if (!detail.data) return;
		setForm({
			id: detail.data.id,
			internalName: detail.data.internalName,
			publicTitle: detail.data.publicTitle,
			description: detail.data.description,
			badgeText: detail.data.badgeText,
			bannerText: detail.data.bannerText,
			bannerHref: detail.data.bannerHref,
			percentageOff: detail.data.percentageOff,
			priority: detail.data.priority,
			audienceMode: detail.data.audienceMode,
			scopeMode: detail.data.scopeMode,
			startsAt: zonedInputValue(detail.data.startsAt),
			endsAt: zonedInputValue(detail.data.endsAt),
			customerIds: detail.data.customerIds,
			customerProfileIds: detail.data.customerProfileIds,
			categoryIds: detail.data.categoryIds,
			offerIds: detail.data.offerIds,
		});
	}, [detail.data, promotionId]);

	const invalidate = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.storefrontAdmin.promotions.list.queryKey(),
		});
	};
	const save = useMutation(
		trpc.storefrontAdmin.promotions.save.mutationOptions({
			onSuccess: async (result) => {
				await invalidate();
				await setPromotionId(result.id);
				toast({ title: "Promotion saved", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to save promotion",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const publish = useMutation(
		trpc.storefrontAdmin.promotions.publish.mutationOptions({
			onSuccess: async () => {
				await invalidate();
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.promotions.detail.queryKey(),
				});
				toast({ title: "Promotion published", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to publish promotion",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const archive = useMutation(
		trpc.storefrontAdmin.promotions.archive.mutationOptions({
			onSuccess: async () => {
				await invalidate();
				await setPromotionId(null);
				toast({ title: "Promotion archived", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to archive promotion",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);

	return (
		<>
			<Card>
				<CardHeader className="flex-row items-center justify-between gap-4">
					<div>
						<CardTitle>Storefront promotions</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Scheduled percentage discounts layered over customer profile
							pricing.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<select
							aria-label="Filter promotions by status"
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={statusFilter}
							onChange={(event) =>
								setStatusFilter(event.target.value as typeof statusFilter)
							}
						>
							<option value="">All statuses</option>
							<option value="DRAFT">Draft</option>
							<option value="PUBLISHED">Published</option>
							<option value="ARCHIVED">Archived</option>
						</select>
						<Button onClick={() => void setPromotionId("new")}>
							New promotion
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-md border">
						<table className="w-full text-sm">
							<thead className="border-b bg-muted/50 text-left">
								<tr>
									<th className="px-3 py-2 font-medium">Campaign</th>
									<th className="px-3 py-2 font-medium">Discount</th>
									<th className="px-3 py-2 font-medium">Audience</th>
									<th className="px-3 py-2 font-medium">Products</th>
									<th className="px-3 py-2 font-medium">State</th>
									<th className="px-3 py-2 font-medium">Schedule</th>
									<th className="px-3 py-2" aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{promotions.isPending ? (
									<tr>
										<td className="px-3 py-8 text-muted-foreground" colSpan={7}>
											Loading promotions…
										</td>
									</tr>
								) : promotions.data?.items.length ? (
									promotions.data.items.map((promotion) => (
										<tr key={promotion.id} className="border-b last:border-0">
											<td className="px-3 py-3">
												<p className="font-medium">{promotion.internalName}</p>
												<p className="text-muted-foreground">
													{promotion.publicTitle}
												</p>
											</td>
											<td className="px-3 py-3 font-medium">
												{promotion.percentageOff}%
											</td>
											<td className="px-3 py-3">
												{promotion.audienceMode === "EVERYONE"
													? "Everyone"
													: `${promotion.customerIds.length} customers · ${promotion.customerProfileIds.length} profiles`}
											</td>
											<td className="px-3 py-3">
												{promotion.scopeMode === "ALL_OFFERS"
													? "All offers"
													: `${promotion.offerIds.length} offers · ${promotion.categoryIds.length} categories`}
											</td>
											<td className="px-3 py-3">
												<Badge variant="secondary">{promotion.state}</Badge>
											</td>
											<td className="px-3 py-3 text-muted-foreground">
												{zonedInputValue(promotion.startsAt).replace("T", " ")}
											</td>
											<td className="px-3 py-3 text-right">
												<Button
													size="sm"
													variant="outline"
													onClick={() => void setPromotionId(promotion.id)}
												>
													Edit
												</Button>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td className="px-3 py-8 text-muted-foreground" colSpan={7}>
											No promotions yet.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			<Sheet
				open={Boolean(promotionId)}
				onOpenChange={(open) => {
					if (!open) void setPromotionId(null);
				}}
			>
				<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
					<SheetHeader>
						<SheetTitle>
							{form.id ? "Edit promotion" : "New promotion"}
						</SheetTitle>
						<SheetDescription>
							Only the best eligible promotion is applied. Times below use
							America/New_York.
						</SheetDescription>
					</SheetHeader>
					<form
						className="mt-6 space-y-6 pb-8"
						onSubmit={(event) => {
							event.preventDefault();
							save.mutate({
								...form,
								description: form.description || null,
								bannerText: form.bannerText || null,
								bannerHref: form.bannerHref || null,
								startsAt: businessTimeToUtc(form.startsAt),
								endsAt: form.endsAt ? businessTimeToUtc(form.endsAt) : null,
							});
						}}
					>
						<div className="grid gap-4 sm:grid-cols-2">
							<TextField
								label="Internal campaign name"
								value={form.internalName}
								onChange={(internalName) =>
									setForm((current) => ({ ...current, internalName }))
								}
							/>
							<TextField
								label="Public title"
								value={form.publicTitle}
								onChange={(publicTitle) =>
									setForm((current) => ({ ...current, publicTitle }))
								}
							/>
							<TextField
								label="Badge text"
								value={form.badgeText}
								onChange={(badgeText) =>
									setForm((current) => ({ ...current, badgeText }))
								}
								placeholder="Summer Sale"
							/>
							<NumberField
								label="Percentage off"
								value={form.percentageOff}
								onChange={(percentageOff) =>
									setForm((current) => ({ ...current, percentageOff }))
								}
								min={0.01}
								max={100}
							/>
							<NumberField
								label="Priority"
								value={form.priority}
								onChange={(priority) =>
									setForm((current) => ({ ...current, priority }))
								}
								min={-10000}
								max={10000}
							/>
							<TextField
								label="Banner destination"
								value={form.bannerHref || ""}
								onChange={(bannerHref) =>
									setForm((current) => ({
										...current,
										bannerHref: bannerHref || null,
									}))
								}
								placeholder="/categories/doors"
							/>
						</div>
						<label
							htmlFor="promotion-description"
							className="grid gap-1 text-sm"
						>
							Description
							<Textarea
								id="promotion-description"
								value={form.description || ""}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										description: event.target.value || null,
									}))
								}
							/>
						</label>
						<TextField
							label="Announcement bar text"
							value={form.bannerText || ""}
							onChange={(bannerText) =>
								setForm((current) => ({
									...current,
									bannerText: bannerText || null,
								}))
							}
							placeholder="Save on qualifying summer projects"
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<DateTimeField
								label="Starts"
								value={form.startsAt}
								onChange={(startsAt) =>
									setForm((current) => ({ ...current, startsAt }))
								}
							/>
							<DateTimeField
								label="Ends (optional)"
								value={form.endsAt}
								onChange={(endsAt) =>
									setForm((current) => ({ ...current, endsAt }))
								}
							/>
						</div>

						<TargetSection
							title="Audience"
							mode={form.audienceMode}
							allValue="EVERYONE"
							allLabel="Everyone"
							targetedLabel="Selected customers or profiles"
							onModeChange={(audienceMode) =>
								setForm((current) => ({ ...current, audienceMode }))
							}
						>
							{form.audienceMode === "TARGETED" ? (
								<div className="grid gap-4 sm:grid-cols-2">
									<CheckList
										title="Customer profiles"
										items={(profiles.data || []).map((profile) => ({
											id: profile.id,
											label: profile.title,
										}))}
										selected={form.customerProfileIds}
										onChange={(customerProfileIds) =>
											setForm((current) => ({
												...current,
												customerProfileIds,
											}))
										}
									/>
									<div className="space-y-2">
										<Input
											aria-label="Search customers"
											value={customerSearch}
											onChange={(event) =>
												setCustomerSearch(event.target.value)
											}
											placeholder="Search customers"
										/>
										<CheckList
											title="Customers"
											items={(customers.data || []).map((customer) => ({
												id: customer.id,
												label:
													customer.businessName ||
													customer.name ||
													customer.email ||
													`Customer ${customer.id}`,
											}))}
											selected={form.customerIds}
											onChange={(customerIds) =>
												setForm((current) => ({
													...current,
													customerIds,
												}))
											}
										/>
									</div>
								</div>
							) : null}
						</TargetSection>

						<TargetSection
							title="Product scope"
							mode={form.scopeMode}
							allValue="ALL_OFFERS"
							allLabel="All storefront offers"
							targetedLabel="Selected categories or offers"
							onModeChange={(scopeMode) =>
								setForm((current) => ({ ...current, scopeMode }))
							}
						>
							{form.scopeMode === "TARGETED" ? (
								<div className="grid gap-4 sm:grid-cols-2">
									<CheckList
										title="Categories"
										items={(categories.data || []).map((category) => ({
											id: category.id,
											label: category.title,
										}))}
										selected={form.categoryIds}
										onChange={(categoryIds) =>
											setForm((current) => ({ ...current, categoryIds }))
										}
									/>
									<div className="space-y-2">
										<Input
											aria-label="Search storefront offers"
											value={offerSearch}
											onChange={(event) => setOfferSearch(event.target.value)}
											placeholder="Search offers"
										/>
										<CheckList
											title="Offers"
											items={(offers.data || []).map((offer) => ({
												id: offer.id,
												label: `${offer.title} · ${offer.category.title}`,
											}))}
											selected={form.offerIds}
											onChange={(offerIds) =>
												setForm((current) => ({ ...current, offerIds }))
											}
										/>
									</div>
								</div>
							) : null}
						</TargetSection>

						<div className="flex flex-wrap justify-between gap-3 border-t pt-5">
							<div>
								{form.id ? (
									<Button
										type="button"
										variant="destructive"
										disabled={archive.isPending}
										onClick={() => {
											if (form.id) archive.mutate({ id: form.id });
										}}
									>
										Archive
									</Button>
								) : null}
							</div>
							<div className="flex gap-2">
								<Button
									type="submit"
									variant="outline"
									disabled={save.isPending || !form.startsAt}
								>
									{save.isPending ? "Saving…" : "Save"}
								</Button>
								{form.id ? (
									<Button
										type="button"
										disabled={publish.isPending}
										onClick={() => {
											if (form.id) publish.mutate({ id: form.id });
										}}
									>
										Publish
									</Button>
								) : null}
							</div>
						</div>
					</form>
				</SheetContent>
			</Sheet>
		</>
	);
}
