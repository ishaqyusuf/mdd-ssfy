"use client";

import { prepareSalesPdfPreview } from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@gnd/api/trpc/routers/_app";
import type { SalesPrintSettings } from "@gnd/settings";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { type ReactNode, useEffect, useState } from "react";

type PrintSettingsResult = RouterOutputs["sales"]["getPrintSettings"];
type DealerDeliveryPricing = PrintSettingsResult["dealerDeliveryPricing"];
type PreviewOrder = RouterOutputs["sales"]["getPrintPreviewOrders"][number];

const TEMPLATE_OPTIONS = [
	{
		id: "template-2",
		name: "Modern",
		version: "V2",
		description: "The current compact sales document with cleaner hierarchy.",
	},
	{
		id: "template-1",
		name: "Classic",
		version: "V1",
		description: "The original invoice layout with a traditional header.",
	},
] as const;

const PAGE_BREAK_OPTIONS = [
	{
		id: "header",
		name: "Compact",
		description:
			"Start the next section in the remaining space when its heading and first row fit.",
	},
	{
		id: "section",
		name: "Keep sections together",
		description:
			"Move a complete section to a new page when it fits there as one block.",
	},
	{
		id: "fullHeader",
		name: "Repeat full details",
		description:
			"Repeat door configuration details when a long section continues on another page.",
	},
] as const;

function formatOrderLabel(order: PreviewOrder) {
	const date = order.createdAt
		? new Intl.DateTimeFormat("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			}).format(new Date(order.createdAt))
		: "No date";
	return `${order.orderId} · ${order.customerName} · ${date}`;
}

export function SalesPrintSettingsPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(trpc.sales.getPrintSettings.queryOptions());
	const canManage = settingsQuery.data?.canManage ?? false;
	const ordersQuery = useQuery(
		trpc.sales.getPrintPreviewOrders.queryOptions(undefined, {
			enabled: canManage,
		}),
	);
	const orders = ordersQuery.data ?? [];
	const [settings, setSettings] = useState<SalesPrintSettings | null>(null);
	const [dealerDeliveryPricing, setDealerDeliveryPricing] =
		useState<DealerDeliveryPricing | null>(null);
	const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [previewPending, setPreviewPending] = useState(false);

	useEffect(() => {
		if (settingsQuery.data?.settings && !settings) {
			setSettings(settingsQuery.data.settings);
		}
	}, [settings, settingsQuery.data?.settings]);

	useEffect(() => {
		if (settingsQuery.data?.dealerDeliveryPricing && !dealerDeliveryPricing) {
			setDealerDeliveryPricing(settingsQuery.data.dealerDeliveryPricing);
		}
	}, [dealerDeliveryPricing, settingsQuery.data?.dealerDeliveryPricing]);

	useEffect(() => {
		if (selectedOrderId == null && orders[0]) {
			setSelectedOrderId(orders[0].id);
		}
	}, [orders, selectedOrderId]);

	useEffect(() => {
		if (!settings || selectedOrderId == null || !canManage) return;
		let cancelled = false;
		const timeout = window.setTimeout(async () => {
			setPreviewPending(true);
			setPreviewError(null);
			try {
				const url = await prepareSalesPdfPreview({
					salesIds: [selectedOrderId],
					mode: "invoice",
					printConfig: settings,
				});
				if (!cancelled) setPreviewUrl(url);
			} catch (error) {
				if (!cancelled) {
					setPreviewError(
						error instanceof Error
							? error.message
							: "Unable to prepare this preview.",
					);
				}
			} finally {
				if (!cancelled) setPreviewPending(false);
			}
		}, 250);

		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
		};
	}, [canManage, selectedOrderId, settings]);

	const updateSettings = useMutation(
		trpc.sales.updatePrintSettings.mutationOptions({
			async onSuccess(data) {
				setSettings(data.settings);
				await queryClient.invalidateQueries({
					queryKey: trpc.sales.getPrintSettings.queryKey(),
				});
				toast({
					title: "Sales print settings saved",
					description: "New prints will use this configuration.",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save sales print settings",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const updateDealerDeliveryPricing = useMutation(
		trpc.sales.updateDealerDeliveryPricingSettings.mutationOptions({
			async onSuccess(data) {
				setDealerDeliveryPricing(data.dealerDeliveryPricing);
				await queryClient.invalidateQueries({
					queryKey: trpc.sales.getPrintSettings.queryKey(),
				});
				toast({
					title: "Dealer delivery pricing saved",
					description:
						"New dealer requests will show the configured office suggestion.",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save dealer delivery pricing",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (settingsQuery.isPending || !settings || !dealerDeliveryPricing) {
		return <SalesPrintSettingsSkeleton />;
	}

	if (!canManage) {
		return (
			<div className="rounded-md border bg-background p-6">
				<div className="flex items-start gap-3">
					<Icons.AlertCircle className="mt-0.5 size-5 text-muted-foreground" />
					<div>
						<h2 className="font-semibold">Super Admin access required</h2>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							Only Super Admin users can change the default sales print template
							and pagination behavior.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-10">
			<SettingsCard
				title="Document template"
				description="Choose the layout used for invoices, quotes, packing slips, and production prints."
			>
				<div className="grid gap-3 sm:grid-cols-2">
					{TEMPLATE_OPTIONS.map((template) => {
						const selected = settings.templateId === template.id;
						return (
							<button
								key={template.id}
								type="button"
								onClick={() =>
									setSettings((current) =>
										current ? { ...current, templateId: template.id } : current,
									)
								}
								className={cn(
									"group flex min-h-36 items-stretch overflow-hidden rounded-md border bg-background text-left transition-colors hover:border-foreground/25",
									selected && "border-primary ring-1 ring-primary",
								)}
								aria-pressed={selected}
							>
								<div className="flex w-28 shrink-0 items-center justify-center border-r bg-muted/35 p-4">
									<div
										className={cn(
											"relative h-24 w-16 border bg-background shadow-sm",
											template.id === "template-2" && "rounded-sm",
										)}
									>
										<div className="absolute left-2 right-2 top-2 h-2 bg-foreground/75" />
										<div className="absolute left-2 top-7 h-7 w-5 bg-muted" />
										<div className="absolute left-9 right-2 top-7 space-y-1">
											<div className="h-1 bg-muted-foreground/35" />
											<div className="h-1 bg-muted-foreground/25" />
											<div className="h-1 bg-muted-foreground/25" />
										</div>
										<div className="absolute bottom-3 left-2 right-2 space-y-1">
											<div className="h-1 bg-muted-foreground/30" />
											<div className="h-1 bg-muted-foreground/20" />
										</div>
									</div>
								</div>
								<div className="flex flex-1 flex-col p-4">
									<div className="flex items-center justify-between gap-3">
										<p className="font-medium">{template.name}</p>
										<span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
											{template.version}
										</span>
									</div>
									<p className="mt-2 text-sm leading-5 text-muted-foreground">
										{template.description}
									</p>
									{selected ? (
										<p className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-medium text-primary">
											<Icons.Check className="size-3.5" />
											Selected
										</p>
									) : null}
								</div>
							</button>
						);
					})}
				</div>
			</SettingsCard>

			<SettingsCard
				title="Page breaks"
				description="Control how product sections flow across printed pages."
			>
				<div className="grid gap-2">
					{PAGE_BREAK_OPTIONS.map((option) => (
						<label
							key={option.id}
							className={cn(
								"flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors hover:bg-muted/30",
								settings.pageBreakMode === option.id &&
									"border-primary bg-primary/[0.03]",
							)}
						>
							<input
								type="radio"
								name="pageBreakMode"
								value={option.id}
								checked={settings.pageBreakMode === option.id}
								onChange={() =>
									setSettings((current) =>
										current
											? { ...current, pageBreakMode: option.id }
											: current,
									)
								}
								className="mt-1 accent-primary"
							/>
							<span>
								<span className="block text-sm font-medium">{option.name}</span>
								<span className="mt-1 block text-sm leading-5 text-muted-foreground">
									{option.description}
								</span>
							</span>
						</label>
					))}
				</div>
			</SettingsCard>

			<SettingsCard
				title="Document content"
				description="Fine-tune what appears in generated sales documents."
			>
				<div className="divide-y rounded-md border">
					<SwitchRow
						title="Show product images"
						description="Include available line-item images in sales documents."
						checked={settings.showImages}
						onCheckedChange={(showImages) =>
							setSettings((current) =>
								current ? { ...current, showImages } : current,
							)
						}
					/>
					<SwitchRow
						title="Full headline on first page only"
						description="Keep continuation pages compact by omitting the invoice header after page one."
						checked={settings.headlineFirstPage}
						onCheckedChange={(headlineFirstPage) =>
							setSettings((current) =>
								current ? { ...current, headlineFirstPage } : current,
							)
						}
					/>
				</div>
			</SettingsCard>

			<SettingsCard
				title="Dealer delivery pricing"
				description="Suggest delivery and shipping charges during office approval. Reviewers retain the final override."
			>
				<div className="space-y-5">
					<SwitchRow
						title="Enable automated suggestions"
						description="Pre-fill the review dialog from these rules without auto-approving the request."
						checked={dealerDeliveryPricing.enabled}
						onCheckedChange={(enabled) =>
							setDealerDeliveryPricing((current) =>
								current ? { ...current, enabled } : current,
							)
						}
					/>
					<div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="dealer-delivery-base-cost">
								Delivery base cost
							</Label>
							<Input
								id="dealer-delivery-base-cost"
								type="number"
								min="0"
								step="0.01"
								value={dealerDeliveryPricing.deliveryBaseCost}
								onChange={(event) =>
									setDealerDeliveryPricing((current) =>
										current
											? {
													...current,
													deliveryBaseCost: Number(event.target.value),
												}
											: current,
									)
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="dealer-ship-base-cost">Shipping base cost</Label>
							<Input
								id="dealer-ship-base-cost"
								type="number"
								min="0"
								step="0.01"
								value={dealerDeliveryPricing.shipBaseCost}
								onChange={(event) =>
									setDealerDeliveryPricing((current) =>
										current
											? {
													...current,
													shipBaseCost: Number(event.target.value),
												}
											: current,
									)
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="dealer-free-delivery-minimum">
								Free-delivery minimum
							</Label>
							<Input
								id="dealer-free-delivery-minimum"
								type="number"
								min="0"
								step="0.01"
								placeholder="No threshold"
								value={dealerDeliveryPricing.freeDeliveryOrderMinimum ?? ""}
								onChange={(event) =>
									setDealerDeliveryPricing((current) =>
										current
											? {
													...current,
													freeDeliveryOrderMinimum: event.target.value
														? Number(event.target.value)
														: null,
												}
											: current,
									)
								}
							/>
						</div>
					</div>
					<div className="flex justify-end">
						<Button
							variant="outline"
							disabled={updateDealerDeliveryPricing.isPending}
							onClick={() =>
								updateDealerDeliveryPricing.mutate(dealerDeliveryPricing)
							}
						>
							{updateDealerDeliveryPricing.isPending ? (
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Icons.Save className="mr-2 size-4" />
							)}
							Save delivery rules
						</Button>
					</div>
				</div>
			</SettingsCard>

			<SettingsCard
				title="Preview"
				description="Use a recent order to see the current draft configuration before saving."
			>
				<div className="space-y-4">
					<div className="max-w-xl">
						<Select
							value={selectedOrderId?.toString() ?? ""}
							onValueChange={(value) => setSelectedOrderId(Number(value))}
						>
							<SelectTrigger aria-label="Preview order">
								<SelectValue placeholder="Select a recent order" />
							</SelectTrigger>
							<SelectContent>
								{orders.map((order) => (
									<SelectItem key={order.id} value={order.id.toString()}>
										{formatOrderLabel(order)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="relative min-h-[520px] overflow-hidden rounded-md border bg-muted/20">
						{previewUrl ? (
							<iframe
								key={previewUrl}
								src={previewUrl}
								title="Sales document preview"
								className="h-[720px] w-full bg-background"
							/>
						) : (
							<div className="flex min-h-[520px] items-center justify-center p-8 text-center">
								<div>
									<Icons.FileText className="mx-auto size-8 text-muted-foreground" />
									<p className="mt-3 text-sm font-medium">
										Select a recent order to preview
									</p>
									<p className="mt-1 text-sm text-muted-foreground">
										The preview uses your unsaved choices.
									</p>
								</div>
							</div>
						)}
						{previewPending ? (
							<div className="absolute inset-x-0 top-0 flex h-10 items-center gap-2 border-b bg-background/95 px-4 text-xs text-muted-foreground backdrop-blur">
								<Icons.Loader2 className="size-3.5 animate-spin" />
								Updating preview…
							</div>
						) : null}
						{previewError ? (
							<div className="absolute inset-x-4 top-4 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
								{previewError}
							</div>
						) : null}
					</div>
				</div>
			</SettingsCard>

			<div className="sticky bottom-0 -mx-2 flex items-center justify-end border-t bg-background/95 px-2 py-4 backdrop-blur">
				<Button
					onClick={() => updateSettings.mutate(settings)}
					disabled={updateSettings.isPending}
				>
					{updateSettings.isPending ? (
						<Icons.Loader2 className="mr-2 size-4 animate-spin" />
					) : (
						<Icons.Save className="mr-2 size-4" />
					)}
					Save changes
				</Button>
			</div>
		</div>
	);
}

function SettingsCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="rounded-md border bg-background">
			<div className="border-b px-5 py-4">
				<h2 className="font-semibold">{title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			<div className="p-5">{children}</div>
		</section>
	);
}

function SwitchRow({
	title,
	description,
	checked,
	onCheckedChange,
}: {
	title: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-6 p-4">
			<div>
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				aria-label={title}
			/>
		</div>
	);
}

function SalesPrintSettingsSkeleton() {
	return (
		<div className="space-y-10">
			{["template", "breaks", "content", "preview"].map((key, index) => (
				<div
					key={key}
					className="animate-pulse rounded-md border bg-background"
				>
					<div className="space-y-2 border-b p-5">
						<div className="h-4 w-40 rounded bg-muted" />
						<div className="h-3 w-80 max-w-full rounded bg-muted" />
					</div>
					<div
						className={cn(
							"m-5 rounded bg-muted/70",
							index === 3 ? "h-96" : "h-28",
						)}
					/>
				</div>
			))}
		</div>
	);
}
