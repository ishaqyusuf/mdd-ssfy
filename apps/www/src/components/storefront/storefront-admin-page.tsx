"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMemo, useState } from "react";

type Workspace = RouterOutputs["storefrontAdmin"]["workspace"];
type Category = Workspace["categories"][number];
type Offer = Category["offers"][number];
type RouteStep = Workspace["routeData"]["stepsByUid"][string];
type RouteComponent = RouteStep["components"][number];
type SaveOfferInput = RouterInputs["storefrontAdmin"]["saveOffer"];

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function SectionHeader({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="border-b px-4 py-3">
			<h2 className="font-semibold">{title}</h2>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

export function StorefrontAdminPage() {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const canView =
		auth.roleTitle?.toLowerCase() === "super admin" ||
		Boolean(auth.can?.viewStorefront || auth.can?.editStorefront);
	const workspace = useQuery(
		trpc.storefrontAdmin.workspace.queryOptions(undefined, {
			enabled: auth.enabled && canView,
		}),
	);
	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.storefrontAdmin.workspace.queryKey(),
		});
	};
	const saveCategory = useMutation(
		trpc.storefrontAdmin.saveCategory.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({ title: "Storefront category saved", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to save category",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const saveComponent = useMutation(
		trpc.storefrontAdmin.saveComponent.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({ title: "Component availability saved", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to save component",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const saveOffer = useMutation(
		trpc.storefrontAdmin.saveOffer.mutationOptions({
			async onSuccess(data) {
				await refresh();
				toast({
					title: "Storefront product saved",
					description: data.readiness.ready
						? "The configuration is ready to publish."
						: `${data.readiness.issues.length} readiness issue(s) remain.`,
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save storefront product",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (!canView) {
		return (
			<div className="rounded-md border bg-background p-6">
				<div className="flex items-start gap-3">
					<Icons.AlertCircle className="mt-0.5 size-5 text-muted-foreground" />
					<div>
						<h2 className="font-semibold">Storefront access required</h2>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							A Super Admin must grant Storefront permissions before you can
							view or publish customer-facing products.
						</p>
					</div>
				</div>
			</div>
		);
	}
	if (workspace.isError) {
		return (
			<div className="rounded-md border border-destructive/30 bg-destructive/5 p-6">
				<h2 className="font-semibold">Unable to load Storefront</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{workspace.error.message}
				</p>
			</div>
		);
	}
	if (workspace.isPending || !workspace.data) {
		return (
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={index}
						className="h-36 animate-pulse rounded-md border bg-muted/40"
					/>
				))}
			</div>
		);
	}
	const data = workspace.data;
	const publishedCategories = data.categories.filter(
		(category) => category.status === "PUBLISHED",
	).length;
	const offers = data.categories.flatMap((category) => category.offers);
	const publishedOffers = offers.filter(
		(offer) => offer.status === "PUBLISHED",
	).length;
	const publishedComponents = data.components.filter(
		(component) =>
			component.availableOnStorefront && component.status === "PUBLISHED",
	).length;

	return (
		<div className="space-y-5">
			<div className="grid gap-3 sm:grid-cols-3">
				<Metric label="Published categories" value={publishedCategories} />
				<Metric label="Published products" value={publishedOffers} />
				<Metric label="Available components" value={publishedComponents} />
			</div>

			<section className="overflow-hidden rounded-md border bg-background">
				<SectionHeader
					title="Item Type categories"
					description="Each enabled Item Type becomes /categories/category-slug. The Dyke route remains the source of its configuration."
				/>
				<div className="grid gap-3 p-4 lg:grid-cols-2">
					{data.routeData.rootComponents.map((component) => (
						<CategoryEditor
							key={component.uid}
							component={component}
							rootStepUid={data.routeData.rootStepUid || ""}
							steps={Object.values(data.routeData.stepsByUid)}
							category={data.categories.find(
								(category) => category.rootComponentUid === component.uid,
							)}
							pending={saveCategory.isPending}
							onSave={(value) => saveCategory.mutate(value)}
						/>
					))}
				</div>
			</section>

			<ComponentAvailability
				data={data}
				pending={saveComponent.isPending}
				onSave={(value) => saveComponent.mutate(value)}
			/>

			<OfferManager
				data={data}
				pending={saveOffer.isPending}
				onSave={(value) => saveOffer.mutate(value)}
			/>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-md border bg-background p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
		</div>
	);
}

function CategoryEditor({
	component,
	rootStepUid,
	steps,
	category,
	pending,
	onSave,
}: {
	component: RouteComponent;
	rootStepUid: string;
	steps: RouteStep[];
	category?: Category;
	pending: boolean;
	onSave: (value: {
		id?: string;
		rootStepUid: string;
		rootComponentUid: string;
		listingStepUid?: string | null;
		slug: string;
		title: string;
		description?: string | null;
		imageUrl?: string | null;
		status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
		sortOrder: number;
	}) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [title, setTitle] = useState(category?.title || component.title || "");
	const [slug, setSlug] = useState(
		category?.slug || slugify(component.title || component.uid || ""),
	);
	const [description, setDescription] = useState(category?.description || "");
	const [imageUrl, setImageUrl] = useState(
		category?.imageUrl || component.img || "",
	);
	const [listingStepUid, setListingStepUid] = useState(
		category?.listingStepUid || "",
	);
	const [published, setPublished] = useState(category?.status === "PUBLISHED");

	return (
		<div className="rounded-md border">
			<div className="flex items-center justify-between gap-3 p-3">
				<div className="min-w-0">
					<p className="truncate font-medium">
						{category?.title || component.title || "Untitled Item Type"}
					</p>
					<p className="truncate text-xs text-muted-foreground">
						{category
							? `/categories/${category.slug}`
							: "Not available on the storefront"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={
							published
								? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800"
								: "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
						}
					>
						{published ? "Published" : category ? "Draft" : "Hidden"}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setExpanded((value) => !value)}
					>
						{expanded ? "Close" : "Configure"}
					</Button>
				</div>
			</div>
			{expanded ? (
				<form
					className="grid gap-3 border-t bg-muted/15 p-3"
					onSubmit={(event) => {
						event.preventDefault();
						onSave({
							id: category?.id,
							rootStepUid,
							rootComponentUid: component.uid || "",
							listingStepUid: listingStepUid || null,
							slug,
							title,
							description: description || null,
							imageUrl: imageUrl || null,
							status: published ? "PUBLISHED" : "DRAFT",
							sortOrder: category?.sortOrder || 0,
						});
					}}
				>
					<label className="grid gap-1 text-sm">
						Public title
						<Input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							required
						/>
					</label>
					<label className="grid gap-1 text-sm">
						Category slug
						<Input
							value={slug}
							onChange={(event) => setSlug(slugify(event.target.value))}
							required
						/>
					</label>
					<label className="grid gap-1 text-sm">
						Product listing step
						<select
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={listingStepUid}
							onChange={(event) => setListingStepUid(event.target.value)}
						>
							<option value="">Choose later</option>
							{steps
								.filter((step) => step.uid !== rootStepUid)
								.map((step) => (
									<option key={step.uid} value={step.uid || ""}>
										{step.title || step.uid}
									</option>
								))}
						</select>
					</label>
					<label className="grid gap-1 text-sm">
						Description
						<Textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={3}
						/>
					</label>
					<label className="grid gap-1 text-sm">
						Image URL override
						<Input
							value={imageUrl}
							onChange={(event) => setImageUrl(event.target.value)}
						/>
					</label>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<label className="flex items-center gap-2 text-sm">
							<Switch checked={published} onCheckedChange={setPublished} />
							Publish category
						</label>
						<Button disabled={pending || !title || !slug} type="submit">
							Save category
						</Button>
					</div>
				</form>
			) : null}
		</div>
	);
}

function ComponentAvailability({
	data,
	pending,
	onSave,
}: {
	data: Workspace;
	pending: boolean;
	onSave: (value: {
		sourceStepUid: string;
		sourceComponentUid: string;
		availableOnStorefront: boolean;
		title?: string | null;
		description?: string | null;
		imageUrl?: string | null;
		status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
		sortOrder: number;
	}) => void;
}) {
	const steps = Object.values(data.routeData.stepsByUid);
	const [stepUid, setStepUid] = useState(
		steps.find((step) => step.title?.toLowerCase() === "door")?.uid ||
			steps[0]?.uid ||
			"",
	);
	const step = data.routeData.stepsByUid[stepUid];
	return (
		<section className="overflow-hidden rounded-md border bg-background">
			<SectionHeader
				title="Component storefront availability"
				description="Expose existing Doors, Mouldings, Shelf Items, and valid supporting choices. Compatibility and pricing are still managed by the sales form."
			/>
			<div className="border-b p-4">
				<label className="grid max-w-sm gap-1 text-sm">
					Sales form step
					<select
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={stepUid}
						onChange={(event) => setStepUid(event.target.value)}
					>
						{steps.map((item) => (
							<option key={item.uid} value={item.uid || ""}>
								{item.title || item.uid}
							</option>
						))}
					</select>
				</label>
			</div>
			<div className="divide-y">
				{step?.components.map((component) => {
					const overlay = data.components.find(
						(item) => item.sourceComponentUid === component.uid,
					);
					return (
						<ComponentRow
							key={component.uid}
							stepUid={stepUid}
							component={component}
							overlay={overlay}
							pending={pending}
							onSave={onSave}
						/>
					);
				})}
				{!step?.components.length ? (
					<p className="p-6 text-sm text-muted-foreground">
						No components are configured for this sales step.
					</p>
				) : null}
			</div>
		</section>
	);
}

function ComponentRow({
	stepUid,
	component,
	overlay,
	pending,
	onSave,
}: {
	stepUid: string;
	component: RouteComponent;
	overlay?: Workspace["components"][number];
	pending: boolean;
	onSave: (value: {
		sourceStepUid: string;
		sourceComponentUid: string;
		availableOnStorefront: boolean;
		title?: string | null;
		description?: string | null;
		imageUrl?: string | null;
		status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
		sortOrder: number;
	}) => void;
}) {
	const [enabled, setEnabled] = useState(
		overlay?.availableOnStorefront ?? false,
	);
	const [title, setTitle] = useState(overlay?.title || component.title || "");
	const [imageUrl, setImageUrl] = useState(overlay?.imageUrl || "");
	return (
		<form
			className="grid items-end gap-3 p-3 md:grid-cols-[auto_minmax(180px,1fr)_minmax(220px,1fr)_auto]"
			onSubmit={(event) => {
				event.preventDefault();
				onSave({
					sourceStepUid: stepUid,
					sourceComponentUid: component.uid || "",
					availableOnStorefront: enabled,
					title: title || null,
					imageUrl: imageUrl || null,
					status: enabled ? "PUBLISHED" : "DRAFT",
					sortOrder: overlay?.sortOrder || 0,
				});
			}}
		>
			<label className="flex h-9 items-center gap-2 text-sm">
				<Switch checked={enabled} onCheckedChange={setEnabled} />
				Online
			</label>
			<label className="grid gap-1 text-xs text-muted-foreground">
				Public title
				<Input
					value={title}
					onChange={(event) => setTitle(event.target.value)}
				/>
			</label>
			<label className="grid gap-1 text-xs text-muted-foreground">
				Image override
				<Input
					value={imageUrl}
					onChange={(event) => setImageUrl(event.target.value)}
					placeholder={component.img || "Use Dyke image"}
				/>
			</label>
			<Button type="submit" variant="outline" disabled={pending}>
				Save
			</Button>
		</form>
	);
}

function OfferManager({
	data,
	pending,
	onSave,
}: {
	data: Workspace;
	pending: boolean;
	onSave: (value: SaveOfferInput) => void;
}) {
	const [categoryId, setCategoryId] = useState(data.categories[0]?.id || "");
	const category = data.categories.find((item) => item.id === categoryId);
	const sourceStepUid =
		category?.listingStepUid ||
		data.routeData.composedRouter[category?.rootComponentUid || ""]
			?.routeSequence[0]?.uid ||
		"";
	const sourceStep = data.routeData.stepsByUid[sourceStepUid];
	const [sourceComponentUid, setSourceComponentUid] = useState("");
	const selectedComponent = sourceStep?.components.find(
		(component) => component.uid === sourceComponentUid,
	);
	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const offers = data.categories.flatMap((category) =>
		category.offers.map((offer) => ({ offer, category })),
	);
	const routeSteps = useMemo(() => {
		if (!category) return [];
		const route =
			data.routeData.composedRouter[category.rootComponentUid] || null;
		return (route?.routeSequence || [])
			.map((item) => data.routeData.stepsByUid[item.uid])
			.filter(Boolean);
	}, [category, data.routeData]);

	return (
		<section className="overflow-hidden rounded-md border bg-background">
			<SectionHeader
				title="Storefront products and configuration"
				description="A product is a customer-facing entry into an existing Dyke route. Configure visible steps and valid automatic defaults after saving the draft."
			/>
			<div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
				<div className="space-y-2">
					{offers.map(({ offer, category: offerCategory }) => (
						<OfferPolicyEditor
							key={offer.id}
							offer={offer}
							category={offerCategory}
							data={data}
							pending={pending}
							onSave={onSave}
						/>
					))}
					{!offers.length ? (
						<div className="rounded-md border border-dashed p-8 text-center">
							<p className="font-medium">No storefront products yet</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Publish component availability, then create the first Door,
								Moulding, or Shelf Item product.
							</p>
						</div>
					) : null}
				</div>
				<form
					className="h-fit space-y-3 rounded-md border bg-muted/15 p-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!category || !selectedComponent) return;
						onSave({
							categoryId: category.id,
							sourceStepUid,
							sourceComponentUid: selectedComponent.uid,
							slug,
							title,
							description: description || null,
							imageUrl: selectedComponent.img || null,
							availability: {
								purchasable: true,
								mode: "MADE_TO_ORDER",
								leadTimeMinDays: null,
								leadTimeMaxDays: null,
								message: null,
							},
							status: "DRAFT",
							sortOrder: category.offers.length,
							configurationVersion: 1,
							stepPolicies: routeSteps.map((step, index) => ({
								stepUid: step.uid,
								visible: true,
								required: true,
								allowSkip: false,
								autoSelect: false,
								sortOrder: index,
							})),
							componentPolicies: [
								{
									stepUid: sourceStepUid,
									sourceComponentUid: selectedComponent.uid,
									enabled: true,
									defaultSelected: true,
									sortOrder: 0,
								},
							],
						});
					}}
				>
					<h3 className="font-medium">Add storefront product</h3>
					<label className="grid gap-1 text-sm">
						Category
						<select
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={categoryId}
							onChange={(event) => {
								setCategoryId(event.target.value);
								setSourceComponentUid("");
							}}
						>
							<option value="">Choose category</option>
							{data.categories.map((item) => (
								<option key={item.id} value={item.id}>
									{item.title}
								</option>
							))}
						</select>
					</label>
					<label className="grid gap-1 text-sm">
						Existing sales component
						<select
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={sourceComponentUid}
							onChange={(event) => {
								const uid = event.target.value;
								const component = sourceStep?.components.find(
									(item) => item.uid === uid,
								);
								setSourceComponentUid(uid);
								setTitle(component?.title || "");
								setSlug(slugify(component?.title || uid));
							}}
						>
							<option value="">Choose product</option>
							{sourceStep?.components.map((component) => (
								<option key={component.uid} value={component.uid || ""}>
									{component.title || component.uid}
								</option>
							))}
						</select>
					</label>
					<label className="grid gap-1 text-sm">
						Public title
						<Input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							required
						/>
					</label>
					<label className="grid gap-1 text-sm">
						Product slug
						<Input
							value={slug}
							onChange={(event) => setSlug(slugify(event.target.value))}
							required
						/>
					</label>
					<label className="grid gap-1 text-sm">
						Description
						<Textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={4}
						/>
					</label>
					<Button
						className="w-full"
						type="submit"
						disabled={
							pending || !category || !selectedComponent || !title || !slug
						}
					>
						Create draft product
					</Button>
				</form>
			</div>
		</section>
	);
}

function OfferPolicyEditor({
	offer,
	category,
	data,
	pending,
	onSave,
}: {
	offer: Offer & { categoryTitle?: string };
	category: Category;
	data: Workspace;
	pending: boolean;
	onSave: (value: any) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [policies, setPolicies] = useState(
		offer.stepPolicies.map((policy) => ({ ...policy })),
	);
	const storedAvailability =
		offer.availability &&
		typeof offer.availability === "object" &&
		!Array.isArray(offer.availability)
			? offer.availability
			: {};
	const [availability, setAvailability] = useState({
		purchasable:
			typeof storedAvailability.purchasable === "boolean"
				? storedAvailability.purchasable
				: true,
		mode:
			storedAvailability.mode === "IN_STOCK" ||
			storedAvailability.mode === "BACKORDER"
				? storedAvailability.mode
				: ("MADE_TO_ORDER" as "IN_STOCK" | "MADE_TO_ORDER" | "BACKORDER"),
		leadTimeMinDays:
			typeof storedAvailability.leadTimeMinDays === "number"
				? storedAvailability.leadTimeMinDays
				: null,
		leadTimeMaxDays:
			typeof storedAvailability.leadTimeMaxDays === "number"
				? storedAvailability.leadTimeMaxDays
				: null,
		message:
			typeof storedAvailability.message === "string"
				? storedAvailability.message
				: null,
	});
	const route =
		data.routeData.composedRouter[category.rootComponentUid] || null;
	const steps = (route?.routeSequence || [])
		.map((item) => data.routeData.stepsByUid[item.uid])
		.filter(Boolean);
	const save = (publish: boolean) => {
		onSave({
			id: offer.id,
			categoryId: offer.categoryId,
			sourceStepUid: offer.sourceStepUid,
			sourceComponentUid: offer.sourceComponentUid,
			slug: offer.slug,
			title: offer.title,
			description: offer.description,
			imageUrl: offer.imageUrl,
			seo: offer.seo || {},
			availability,
			status: publish ? "PUBLISHED" : "DRAFT",
			sortOrder: offer.sortOrder,
			configurationVersion: offer.configurationVersion + 1,
			stepPolicies: steps.map((step, index) => {
				const policy = policies.find((item) => item.stepUid === step.uid);
				return {
					stepUid: step.uid,
					title: policy?.title,
					helpText: policy?.helpText,
					visible: policy?.visible ?? true,
					required: policy?.required ?? true,
					allowSkip: policy?.allowSkip ?? false,
					autoSelect: policy?.autoSelect ?? false,
					defaultComponentUid: policy?.defaultComponentUid,
					sortOrder: policy?.sortOrder ?? index,
					metadata: policy?.metadata || {},
				};
			}),
			componentPolicies: offer.componentPolicies.map((policy) => ({
				stepUid: policy.stepUid,
				sourceComponentUid: policy.sourceComponentUid,
				enabled: policy.enabled,
				defaultSelected: policy.defaultSelected,
				sortOrder: policy.sortOrder,
				metadata: policy.metadata || {},
			})),
		});
	};
	return (
		<div className="rounded-md border">
			<div className="flex flex-wrap items-center justify-between gap-3 p-3">
				<div>
					<p className="font-medium">{offer.title}</p>
					<p className="text-xs text-muted-foreground">
						{offer.categoryTitle} · /products/{offer.slug}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="rounded-full bg-muted px-2 py-1 text-xs">
						{offer.status.toLowerCase()}
					</span>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setExpanded((value) => !value)}
					>
						{expanded ? "Close" : "Steps"}
					</Button>
					<Button
						size="sm"
						disabled={pending}
						onClick={() => save(offer.status !== "PUBLISHED")}
					>
						{offer.status === "PUBLISHED" ? "Unpublish" : "Publish"}
					</Button>
				</div>
			</div>
			{expanded ? (
				<div className="space-y-3 border-t bg-muted/15 p-3">
					<div className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-4">
						<label className="flex items-center gap-2 text-sm">
							<Switch
								checked={availability.purchasable}
								onCheckedChange={(purchasable) =>
									setAvailability((current) => ({
										...current,
										purchasable,
									}))
								}
							/>
							Can purchase
						</label>
						<label className="grid gap-1 text-xs text-muted-foreground">
							Availability
							<select
								className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
								value={availability.mode}
								onChange={(event) =>
									setAvailability((current) => ({
										...current,
										mode: event.target.value as typeof availability.mode,
									}))
								}
							>
								<option value="IN_STOCK">In stock</option>
								<option value="MADE_TO_ORDER">Made to order</option>
								<option value="BACKORDER">Backorder</option>
							</select>
						</label>
						<label className="grid gap-1 text-xs text-muted-foreground">
							Minimum lead days
							<Input
								type="number"
								min={0}
								value={availability.leadTimeMinDays ?? ""}
								onChange={(event) =>
									setAvailability((current) => ({
										...current,
										leadTimeMinDays: event.target.value
											? Number(event.target.value)
											: null,
									}))
								}
							/>
						</label>
						<label className="grid gap-1 text-xs text-muted-foreground">
							Maximum lead days
							<Input
								type="number"
								min={0}
								value={availability.leadTimeMaxDays ?? ""}
								onChange={(event) =>
									setAvailability((current) => ({
										...current,
										leadTimeMaxDays: event.target.value
											? Number(event.target.value)
											: null,
									}))
								}
							/>
						</label>
						<label className="grid gap-1 text-xs text-muted-foreground md:col-span-4">
							Customer message
							<Input
								value={availability.message || ""}
								onChange={(event) =>
									setAvailability((current) => ({
										...current,
										message: event.target.value || null,
									}))
								}
								placeholder="Built to order; typical lead time shown above."
							/>
						</label>
					</div>
					{steps.map((step, index) => {
						const policy = policies.find((item) => item.stepUid === step.uid);
						const visible = policy?.visible ?? true;
						return (
							<div
								key={step.uid}
								className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[minmax(140px,1fr)_auto_minmax(180px,1fr)]"
							>
								<div>
									<p className="text-sm font-medium">
										{policy?.title || step.title || step.uid}
									</p>
									<p className="text-xs text-muted-foreground">
										{step.components.length} canonical choices
									</p>
								</div>
								<label className="flex items-center gap-2 text-sm">
									<Switch
										checked={visible}
										onCheckedChange={(checked) => {
											setPolicies((current) => {
												const next = current.filter(
													(item) => item.stepUid !== step.uid,
												);
												return [
													...next,
													{
														...(policy || {
															id: "",
															offerId: offer.id,
															stepUid: step.uid || "",
															title: null,
															helpText: null,
															required: true,
															allowSkip: false,
															autoSelect: !checked,
															defaultComponentUid: null,
															sortOrder: index,
															metadata: null,
															createdAt: new Date().toISOString(),
															updatedAt: new Date().toISOString(),
														}),
														visible: checked,
													},
												];
											});
										}}
									/>
									Show customer
								</label>
								<label className="grid gap-1 text-xs text-muted-foreground">
									{visible ? "Optional default" : "Required hidden default"}
									<select
										className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
										value={policy?.defaultComponentUid || ""}
										onChange={(event) => {
											const defaultComponentUid = event.target.value || null;
											setPolicies((current) => [
												...current.filter((item) => item.stepUid !== step.uid),
												{
													...(policy || {
														id: "",
														offerId: offer.id,
														stepUid: step.uid || "",
														title: null,
														helpText: null,
														visible,
														required: true,
														allowSkip: false,
														autoSelect: true,
														sortOrder: index,
														metadata: null,
														createdAt: new Date().toISOString(),
														updatedAt: new Date().toISOString(),
													}),
													defaultComponentUid,
												},
											]);
										}}
									>
										<option value="">No default</option>
										{step.components.map((component) => (
											<option key={component.uid} value={component.uid || ""}>
												{component.title || component.uid}
											</option>
										))}
									</select>
								</label>
							</div>
						);
					})}
					<div className="flex justify-end">
						<Button disabled={pending} onClick={() => save(false)}>
							Save step policy
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
