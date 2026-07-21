"use client";

import { useStorefrontCatalogFilterParams } from "@/hooks/use-storefront-catalog-filter-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
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
import { type FormEvent, useEffect, useState } from "react";

export function StorefrontCatalogItemSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useStorefrontCatalogFilterParams();
	const componentUid = filters.catalogItemId || "";
	const detail = useQuery(
		trpc.storefrontAdmin.catalog.detail.queryOptions(
			{ componentUid },
			{ enabled: Boolean(componentUid) },
		),
	);
	const saveMetadata = useMutation(
		trpc.storefrontAdmin.catalog.saveMetadata.mutationOptions(),
	);
	const setStatus = useMutation(
		trpc.storefrontAdmin.catalog.setStatus.mutationOptions(),
	);
	const setFeatured = useMutation(
		trpc.storefrontAdmin.catalog.setFeatured.mutationOptions(),
	);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [online, setOnline] = useState(false);
	const [featured, setFeaturedValue] = useState(false);

	useEffect(() => {
		if (!detail.data) return;
		setTitle(detail.data.overlay?.title || detail.data.source.title);
		setDescription(detail.data.overlay?.description || "");
		setImageUrl(
			detail.data.overlay?.imageUrl || detail.data.source.imageUrl || "",
		);
		setOnline(
			Boolean(detail.data.overlay?.availableOnStorefront) &&
				detail.data.overlay?.status === "PUBLISHED",
		);
		setFeaturedValue(Boolean(detail.data.offer?.featured));
	}, [detail.data]);

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.list.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.families.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.detail.queryKey({
					componentUid,
				}),
			}),
		]);
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		try {
			await saveMetadata.mutateAsync({
				componentUid,
				title: title.trim() || null,
				description: description.trim() || null,
				imageUrl: imageUrl.trim() || null,
			});
			await setStatus.mutateAsync({ componentUid, online });
			if (detail.data?.offer) {
				await setFeatured.mutateAsync({ componentUid, featured });
			}
			await refresh();
			toast({ title: "Catalog component saved", variant: "success" });
			await setFilters({ catalogItemId: null });
		} catch (error) {
			toast({
				title: "Unable to save catalog component",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		}
	}

	const pending =
		saveMetadata.isPending || setStatus.isPending || setFeatured.isPending;

	return (
		<Sheet
			open={Boolean(componentUid)}
			onOpenChange={(open) => {
				if (!open) void setFilters({ catalogItemId: null });
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader>
					<SheetTitle>Edit catalog component</SheetTitle>
					<SheetDescription>
						Customer-facing metadata stays separate from canonical sales-form
						data.
					</SheetDescription>
				</SheetHeader>
				{detail.isPending ? (
					<div className="p-6 text-sm text-muted-foreground">
						Loading component...
					</div>
				) : detail.error ? (
					<div className="p-6 text-sm text-destructive">
						{detail.error.message}
					</div>
				) : detail.data ? (
					<form onSubmit={submit} className="space-y-5 p-5">
						<div className="overflow-hidden rounded-md border bg-muted">
							{imageUrl ? (
								<img
									src={imageUrl}
									alt=""
									className="aspect-[4/3] w-full object-contain p-4"
								/>
							) : (
								<div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
									No image
								</div>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="catalog-title">Public title</Label>
							<Input
								id="catalog-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="catalog-description">Description</Label>
							<Textarea
								id="catalog-description"
								rows={5}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="catalog-image">Image URL</Label>
							<Input
								id="catalog-image"
								value={imageUrl}
								onChange={(event) => setImageUrl(event.target.value)}
								placeholder={
									detail.data.source.imageUrl || "Default component image"
								}
							/>
						</div>
						<div className="flex items-center justify-between border-y py-4">
							<div>
								<p className="text-sm font-medium">Online</p>
								<p className="text-xs text-muted-foreground">
									Available to public storefront configuration.
								</p>
							</div>
							<Switch checked={online} onCheckedChange={setOnline} />
						</div>
						<div className="flex items-center justify-between border-b pb-4">
							<div>
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium">Featured</p>
									{!detail.data.offer ? (
										<Badge variant="secondary">Product required</Badge>
									) : null}
								</div>
								<p className="text-xs text-muted-foreground">
									Shown in the public featured catalog.
								</p>
							</div>
							<Switch
								disabled={!detail.data.offer}
								checked={featured}
								onCheckedChange={setFeaturedValue}
							/>
						</div>
						<Button type="submit" disabled={pending} className="w-full">
							{pending ? "Saving..." : "Save changes"}
						</Button>
					</form>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
