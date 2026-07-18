"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { ShortLinksColumnVisibility } from "@/components/tables-2/short-links/column-visibility";
import type { ShortLinkRow } from "@/components/tables-2/short-links/columns";
import { DataTable } from "@/components/tables-2/short-links/data-table";
import { ShortLinksSkeleton } from "@/components/tables-2/short-links/skeleton";
import { useShortLinksFilterParams } from "@/hooks/use-short-links-filter-params";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Switch } from "@gnd/ui/switch";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense, useCallback, useMemo, useState } from "react";

type FormState = {
	id: string | null;
	targetUrl: string;
	slug: string;
	title: string;
	sourceType: string;
	sourceId: string;
	expiresOn: string;
	active: boolean;
};

type Props = {
	initialSettings?: Partial<TableSettings>;
};

const EMPTY_FORM: FormState = {
	id: null,
	targetUrl: "",
	slug: "",
	title: "",
	sourceType: "",
	sourceId: "",
	expiresOn: "",
	active: true,
};

function toDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInput(value?: string | Date | null) {
	return toDate(value)?.toISOString().slice(0, 10) ?? "";
}

function expiryInputToIso(value: string) {
	if (!value) return null;
	return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function formFromLink(link: ShortLinkRow): FormState {
	return {
		id: link.id,
		targetUrl: link.targetUrl,
		slug: link.slug,
		title: link.title ?? "",
		sourceType: link.sourceType ?? "",
		sourceId: link.sourceId ?? "",
		expiresOn: toDateInput(link.expiresAt),
		active: !!link.active,
	};
}

export function ShortLinksSettingsPage({ initialSettings }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useShortLinksFilterParams();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);

	const refresh = useCallback(async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.shortLinks.list.queryKey(),
		});
	}, [queryClient, trpc]);

	const createMutation = useMutation(
		trpc.shortLinks.create.mutationOptions({
			async onSuccess(link) {
				await refresh();
				setDialogOpen(false);
				setForm(EMPTY_FORM);
				toast({
					title: "Short link created",
					description: link.shortUrl,
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to create short link",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const updateMutation = useMutation(
		trpc.shortLinks.update.mutationOptions({
			async onSuccess(link) {
				await refresh();
				setDialogOpen(false);
				setForm(EMPTY_FORM);
				toast({
					title: "Short link updated",
					description: link.shortUrl,
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to update short link",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const deactivateMutation = useMutation(
		trpc.shortLinks.deactivate.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({
					title: "Short link deactivated",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to deactivate short link",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const handleEdit = useCallback((link: ShortLinkRow) => {
		setForm(formFromLink(link));
		setDialogOpen(true);
	}, []);

	const handleDeactivate = useCallback(
		(link: ShortLinkRow) => {
			deactivateMutation.mutate({ id: link.id });
		},
		[deactivateMutation],
	);

	const tableActions = useMemo(
		() => ({
			onEdit: handleEdit,
			onDeactivate: handleDeactivate,
			isDeactivating: deactivateMutation.isPending,
		}),
		[deactivateMutation.isPending, handleDeactivate, handleEdit],
	);

	const isSaving = createMutation.isPending || updateMutation.isPending;

	return (
		<div className="space-y-6 px-4 pb-8 md:px-8">
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle>Short Links</CardTitle>
							<CardDescription>
								Create compact URLs for SMS, email, and customer-facing links.
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<ShortLinksColumnVisibility />
							<Button
								type="button"
								onClick={() => {
									setForm(EMPTY_FORM);
									setDialogOpen(true);
								}}
							>
								<Icons.AddLink className="mr-2 size-4" />
								New Short Link
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="relative max-w-xl flex-1">
							<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={filters.q ?? ""}
								onChange={(event) =>
									setFilters({
										q: event.target.value.trim() || null,
									})
								}
								placeholder="Search slug, title, target, or source..."
								className="pl-9"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Switch
								checked={filters.includeInactive === true}
								onCheckedChange={(includeInactive) =>
									setFilters({
										includeInactive: includeInactive || null,
									})
								}
								aria-label="Show inactive short links"
							/>
							<span className="text-sm text-muted-foreground">
								Show inactive
							</span>
						</div>
					</div>

					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<ShortLinksSkeleton initialSettings={initialSettings} />
							}
						>
							<DataTable
								initialSettings={initialSettings}
								defaultFilters={{ size: 100 } as RouterInputs["shortLinks"]["list"]}
								actions={tableActions}
							/>
						</Suspense>
					</ErrorBoundary>
				</CardContent>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{form.id ? "Edit short link" : "Create short link"}
						</DialogTitle>
						<DialogDescription>
							Use a custom slug or leave it blank to generate one.
						</DialogDescription>
					</DialogHeader>
					<form
						className="space-y-5"
						onSubmit={(event) => {
							event.preventDefault();
							const payload = {
								targetUrl: form.targetUrl.trim(),
								slug: form.slug.trim() || null,
								title: form.title.trim() || null,
								sourceType: form.sourceType.trim() || null,
								sourceId: form.sourceId.trim() || null,
								expiresAt: expiryInputToIso(form.expiresOn),
								active: form.active,
							};

							if (form.id) {
								updateMutation.mutate({
									id: form.id,
									...payload,
								});
							} else {
								createMutation.mutate(payload);
							}
						}}
					>
						<div className="space-y-2">
							<Label htmlFor="short-link-target">Target URL</Label>
							<Textarea
								id="short-link-target"
								value={form.targetUrl}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										targetUrl: event.target.value,
									}))
								}
								placeholder="https://gndprodesk.com/checkout/..."
								rows={3}
								required
							/>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="short-link-slug">Slug</Label>
								<Input
									id="short-link-slug"
									value={form.slug}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											slug: event.target.value,
										}))
									}
									placeholder="lorem-ipsum"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="short-link-title">Title</Label>
								<Input
									id="short-link-title"
									value={form.title}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											title: event.target.value,
										}))
									}
									placeholder="Invoice payment link"
								/>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-3">
							<div className="space-y-2">
								<Label htmlFor="short-link-source-type">Source Type</Label>
								<Input
									id="short-link-source-type"
									value={form.sourceType}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											sourceType: event.target.value,
										}))
									}
									placeholder="sms"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="short-link-source-id">Source ID</Label>
								<Input
									id="short-link-source-id"
									value={form.sourceId}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											sourceId: event.target.value,
										}))
									}
									placeholder="order-123"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="short-link-expiry">Expiry Date</Label>
								<Input
									id="short-link-expiry"
									type="date"
									value={form.expiresOn}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											expiresOn: event.target.value,
										}))
									}
								/>
							</div>
						</div>

						<div className="flex items-center gap-3 rounded-lg border p-3">
							<Switch
								checked={form.active}
								onCheckedChange={(active) =>
									setForm((current) => ({
										...current,
										active,
									}))
								}
								aria-label="Short link active"
							/>
							<div>
								<div className="text-sm font-medium">Active</div>
								<div className="text-xs text-muted-foreground">
									Inactive links return a 404 from the public `/sh` route.
								</div>
							</div>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSaving || !form.targetUrl.trim()}
							>
								{isSaving
									? "Saving..."
									: form.id
										? "Save Changes"
										: "Create Link"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
