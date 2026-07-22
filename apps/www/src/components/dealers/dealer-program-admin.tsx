"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Check, Pause, Play, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";

type CampaignForm = {
	id?: string;
	title: string;
	audienceMode: "ALL_ELIGIBLE" | "SELECTED";
	headline: string;
	benefitText: string;
	ctaLabel: string;
	imageUrl: string;
	accentColor: string;
	placement: "TOP" | "BOTTOM";
	startsAt: string;
	endsAt: string;
	customerProfileIds: number[];
	customerIds: number[];
};

const emptyCampaign: CampaignForm = {
	title: "",
	audienceMode: "ALL_ELIGIBLE",
	headline: "Grow with the GND Dealership Program",
	benefitText:
		"Create customer quotes, manage your margin, and let our office fulfill eligible orders on your behalf.",
	ctaLabel: "Explore dealership partnership",
	imageUrl: "",
	accentColor: "#0f766e",
	placement: "BOTTOM",
	startsAt: "",
	endsAt: "",
	customerProfileIds: [],
	customerIds: [],
};

export function DealerProgramAdmin() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [form, setForm] = useState<CampaignForm>(emptyCampaign);
	const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>(
		{},
	);
	const [applicationStatus, setApplicationStatus] = useState<
		"ALL" | "PENDING" | "APPROVED" | "DENIED"
	>("ALL");
	const [suspensionReasons, setSuspensionReasons] = useState<
		Record<number, string>
	>({});
	const campaignsQuery = useQuery(trpc.dealerProgram.campaigns.queryOptions());
	const applicationsQuery = useQuery(
		trpc.dealerProgram.applications.queryOptions(),
	);
	const optionsQuery = useQuery(
		trpc.dealerProgram.audienceOptions.queryOptions(),
	);
	const dealersQuery = useQuery(
		trpc.dealer.list.queryOptions({ size: 100, search: null }),
	);

	const invalidateProgram = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.dealerProgram.campaigns.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dealerProgram.applications.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dealer.list.pathKey(),
			}),
		]);

	const saveCampaign = useMutation(
		trpc.dealerProgram.saveCampaign.mutationOptions({
			onSuccess: async () => {
				await invalidateProgram();
				setForm(emptyCampaign);
				toast({ title: "Campaign saved.", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Could not save campaign.",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const setCampaignStatus = useMutation(
		trpc.dealerProgram.setCampaignStatus.mutationOptions({
			onSuccess: async () => {
				await invalidateProgram();
				toast({ title: "Campaign status updated.", variant: "success" });
			},
		}),
	);
	const decideApplication = useMutation(
		trpc.dealerProgram.decideApplication.mutationOptions({
			onSuccess: async () => {
				await invalidateProgram();
				toast({ title: "Application updated.", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Could not update application.",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const resetSuppression = useMutation(
		trpc.dealerProgram.resetSuppression.mutationOptions({
			onSuccess: async () => {
				await invalidateProgram();
				toast({ title: "Customer is eligible for re-invitation." });
			},
		}),
	);
	const setSuspension = useMutation(
		trpc.dealerProgram.setDealerSuspension.mutationOptions({
			onSuccess: async () => {
				await invalidateProgram();
				toast({ title: "Dealer account updated.", variant: "success" });
			},
		}),
	);

	const campaigns = campaignsQuery.data ?? [];
	const applications = applicationsQuery.data ?? [];
	const funnel = useMemo(
		() => ({
			sent: campaigns.reduce(
				(total, campaign) =>
					total +
					campaign.invitations.filter((invitation) => invitation.deliveredAt)
						.length,
				0,
			),
			opened: campaigns.reduce(
				(total, campaign) =>
					total +
					campaign.invitations.filter((invitation) => invitation.firstOpenedAt)
						.length,
				0,
			),
			approved: applications.filter((row) => row.status === "APPROVED").length,
			denied: applications.filter((row) => row.status === "DENIED").length,
		}),
		[campaigns, applications],
	);

	function submitCampaign() {
		saveCampaign.mutate({
			...form,
			imageUrl: form.imageUrl || null,
			startsAt: form.startsAt ? new Date(form.startsAt) : null,
			endsAt: form.endsAt ? new Date(form.endsAt) : null,
		});
	}

	return (
		<section className="rounded-lg border bg-background">
			<div className="border-b p-4">
				<h2 className="text-base font-semibold">Dealership recruitment</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage recruitment banners, applications, and dealer access.
				</p>
			</div>
			<Tabs defaultValue="campaigns" className="p-4">
				<TabsList>
					<TabsTrigger value="campaigns">Campaigns</TabsTrigger>
					<TabsTrigger value="applications">
						Applications
						{applications.some((row) => row.status === "PENDING") ? (
							<Badge className="ml-2" variant="secondary">
								{applications.filter((row) => row.status === "PENDING").length}
							</Badge>
						) : null}
					</TabsTrigger>
					<TabsTrigger value="access">Dealer access</TabsTrigger>
				</TabsList>

				<TabsContent value="campaigns" className="mt-4 space-y-5">
					<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
						<Metric label="Banner emails" value={funnel.sent} />
						<Metric label="Landing opens" value={funnel.opened} />
						<Metric label="Applications" value={applications.length} />
						<Metric label="Approved" value={funnel.approved} />
						<Metric label="Denied" value={funnel.denied} />
					</div>
					<div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
						<div className="space-y-4 rounded-lg border p-4">
							<div className="grid gap-3 md:grid-cols-2">
								<Field
									label="Campaign name"
									value={form.title}
									onChange={(title) => setForm({ ...form, title })}
								/>
								<label className="space-y-2 text-sm">
									<span className="font-medium">Audience</span>
									<select
										className="h-9 w-full rounded-md border bg-background px-3"
										value={form.audienceMode}
										onChange={(event) =>
											setForm({
												...form,
												audienceMode: event.target
													.value as CampaignForm["audienceMode"],
											})
										}
									>
										<option value="ALL_ELIGIBLE">All eligible customers</option>
										<option value="SELECTED">
											Selected profiles + customers
										</option>
									</select>
								</label>
								<Field
									label="Headline"
									value={form.headline}
									onChange={(headline) => setForm({ ...form, headline })}
								/>
								<Field
									label="CTA label"
									value={form.ctaLabel}
									onChange={(ctaLabel) => setForm({ ...form, ctaLabel })}
								/>
							</div>
							<div className="block space-y-2 text-sm">
								<span className="font-medium">Benefit text</span>
								<Textarea
									aria-label="Benefit text"
									value={form.benefitText}
									onChange={(event) =>
										setForm({ ...form, benefitText: event.target.value })
									}
								/>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<Field
									label="Optional image URL"
									value={form.imageUrl}
									onChange={(imageUrl) => setForm({ ...form, imageUrl })}
								/>
								<div className="space-y-2 text-sm">
									<span className="font-medium">Accent color</span>
									<Input
										aria-label="Accent color"
										type="color"
										value={form.accentColor}
										onChange={(event) =>
											setForm({ ...form, accentColor: event.target.value })
										}
									/>
								</div>
								<Field
									label="Starts (optional)"
									type="datetime-local"
									value={form.startsAt}
									onChange={(startsAt) => setForm({ ...form, startsAt })}
								/>
								<Field
									label="Ends (optional)"
									type="datetime-local"
									value={form.endsAt}
									onChange={(endsAt) => setForm({ ...form, endsAt })}
								/>
							</div>

							{form.audienceMode === "SELECTED" ? (
								<div className="grid gap-4 md:grid-cols-2">
									<ChoiceList
										label="Customer profiles"
										items={(optionsQuery.data?.profiles ?? []).map(
											(profile) => ({
												id: profile.id,
												label: profile.title,
											}),
										)}
										selected={form.customerProfileIds}
										onChange={(customerProfileIds) =>
											setForm({ ...form, customerProfileIds })
										}
									/>
									<ChoiceList
										label="Individual customers"
										items={(optionsQuery.data?.customers ?? []).map(
											(customer) => ({
												id: customer.id,
												label:
													customer.businessName ||
													customer.name ||
													customer.email ||
													`Customer #${customer.id}`,
											}),
										)}
										selected={form.customerIds}
										onChange={(customerIds) =>
											setForm({ ...form, customerIds })
										}
									/>
								</div>
							) : null}
							<Button
								disabled={
									!form.title ||
									!form.headline ||
									!form.benefitText ||
									saveCampaign.isPending
								}
								onClick={submitCampaign}
							>
								<Save className="mr-2 size-4" />
								{form.id ? "Update campaign" : "Save draft"}
							</Button>
						</div>

						<div className="space-y-4">
							<BannerPreview form={form} />
							{campaigns.map((campaign) => (
								<div className="rounded-lg border p-3" key={campaign.id}>
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="font-medium">{campaign.title}</div>
											<div className="mt-1 text-xs text-muted-foreground">
												{campaign._count.invitations} sent ·{" "}
												{campaign._count.applications} applications
											</div>
										</div>
										<Badge variant="outline">{campaign.status}</Badge>
									</div>
									<div className="mt-3 flex flex-wrap gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												setForm({
													id: campaign.id,
													title: campaign.title,
													audienceMode: campaign.audienceMode,
													headline: campaign.headline,
													benefitText: campaign.benefitText,
													ctaLabel: campaign.ctaLabel,
													imageUrl: campaign.imageUrl || "",
													accentColor: campaign.accentColor,
													placement: campaign.placement,
													startsAt: campaign.startsAt
														? new Date(campaign.startsAt)
																.toISOString()
																.slice(0, 16)
														: "",
													endsAt: campaign.endsAt
														? new Date(campaign.endsAt)
																.toISOString()
																.slice(0, 16)
														: "",
													customerProfileIds: campaign.profiles.map(
														(row) => row.customerProfileId,
													),
													customerIds: campaign.customers.map(
														(row) => row.customerId,
													),
												})
											}
										>
											Edit
										</Button>
										{campaign.status !== "ACTIVE" ? (
											<StatusButton
												icon={Play}
												label="Activate"
												onClick={() =>
													setCampaignStatus.mutate({
														id: campaign.id,
														status: "ACTIVE",
													})
												}
											/>
										) : (
											<StatusButton
												icon={Pause}
												label="Pause"
												onClick={() =>
													setCampaignStatus.mutate({
														id: campaign.id,
														status: "PAUSED",
													})
												}
											/>
										)}
										{campaign.status !== "ARCHIVED" ? (
											<StatusButton
												icon={Archive}
												label="Archive"
												onClick={() =>
													setCampaignStatus.mutate({
														id: campaign.id,
														status: "ARCHIVED",
													})
												}
											/>
										) : null}
									</div>
								</div>
							))}
						</div>
					</div>
				</TabsContent>

				<TabsContent value="applications" className="mt-4 space-y-3">
					<select
						aria-label="Application status"
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={applicationStatus}
						onChange={(event) =>
							setApplicationStatus(
								event.target.value as typeof applicationStatus,
							)
						}
					>
						<option value="ALL">All applications</option>
						<option value="PENDING">Pending</option>
						<option value="APPROVED">Approved</option>
						<option value="DENIED">Denied</option>
					</select>
					{applications
						.filter(
							(application) =>
								applicationStatus === "ALL" ||
								application.status === applicationStatus,
						)
						.map((application) => (
							<div className="rounded-lg border p-4" key={application.id}>
								<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<div>
										<div className="font-medium">
											{application.customer?.businessName ||
												application.customer?.name ||
												application.invitation.recipientEmail}
										</div>
										<div className="text-sm text-muted-foreground">
											{application.invitation.recipientEmail} ·{" "}
											{application.campaign.title}
										</div>
									</div>
									<Badge variant="outline">{application.status}</Badge>
								</div>
								{application.status === "PENDING" ? (
									<div className="mt-3 flex flex-col gap-2 md:flex-row">
										<Input
											placeholder="Optional decision note"
											value={decisionNotes[application.id] || ""}
											onChange={(event) =>
												setDecisionNotes({
													...decisionNotes,
													[application.id]: event.target.value,
												})
											}
										/>
										<Button
											aria-label={`Approve dealership application for ${application.customer?.businessName || application.customer?.name || application.invitation.recipientEmail}`}
											onClick={() =>
												decideApplication.mutate({
													id: application.id,
													decision: "APPROVED",
													note: decisionNotes[application.id] || null,
												})
											}
										>
											<Check className="mr-2 size-4" />
											Approve
										</Button>
										<Button
											aria-label={`Deny dealership application for ${application.customer?.businessName || application.customer?.name || application.invitation.recipientEmail}`}
											variant="outline"
											onClick={() =>
												decideApplication.mutate({
													id: application.id,
													decision: "DENIED",
													note: decisionNotes[application.id] || null,
												})
											}
										>
											Deny
										</Button>
									</div>
								) : application.suppressionResetAt ? (
									<p className="mt-3 text-xs text-muted-foreground">
										Eligibility reset. This customer can receive a future
										invitation.
									</p>
								) : (
									<Button
										aria-label={`Reset dealership application eligibility for ${application.customer?.businessName || application.customer?.name || application.invitation.recipientEmail}`}
										className="mt-3"
										size="sm"
										variant="outline"
										onClick={() =>
											resetSuppression.mutate({
												id: application.id,
												reason: "Super Admin requested re-invitation.",
											})
										}
									>
										<RotateCcw className="mr-2 size-4" />
										Reset and allow re-invite
									</Button>
								)}
							</div>
						))}
					{!applications.length ? (
						<div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
							No dealership applications yet.
						</div>
					) : null}
				</TabsContent>

				<TabsContent value="access" className="mt-4 space-y-3">
					{(dealersQuery.data ?? []).map((dealer) => {
						const suspended =
							dealer.restricted || dealer.status === "suspended";
						return (
							<div
								className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
								key={dealer.id}
							>
								<div>
									<div className="font-medium">
										{dealer.companyName || dealer.name || dealer.email}
									</div>
									<div className="text-sm text-muted-foreground">
										{dealer.email} · {dealer.status || "pending"}
									</div>
								</div>
								<div className="flex flex-col gap-2 sm:flex-row">
									<Input
										aria-label={`Optional ${suspended ? "reactivation" : "suspension"} reason for ${dealer.companyName || dealer.name || dealer.email}`}
										placeholder="Optional reason"
										value={suspensionReasons[dealer.id] || ""}
										onChange={(event) =>
											setSuspensionReasons({
												...suspensionReasons,
												[dealer.id]: event.target.value,
											})
										}
									/>
									<Button
										aria-label={`${suspended ? "Reactivate" : "Suspend"} dealer ${dealer.companyName || dealer.name || dealer.email}`}
										disabled={setSuspension.isPending}
										variant={suspended ? "default" : "outline"}
										onClick={() =>
											setSuspension.mutate({
												dealerId: dealer.id,
												suspended: !suspended,
												reason: suspensionReasons[dealer.id] || null,
											})
										}
									>
										{suspended ? "Reactivate" : "Suspend"}
									</Button>
								</div>
							</div>
						);
					})}
				</TabsContent>
			</Tabs>
		</section>
	);
}

function Field({
	label,
	value,
	onChange,
	type = "text",
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: string;
}) {
	return (
		<div className="space-y-2 text-sm">
			<span className="font-medium">{label}</span>
			<Input
				aria-label={label}
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}

function ChoiceList({
	label,
	items,
	selected,
	onChange,
}: {
	label: string;
	items: { id: number; label: string }[];
	selected: number[];
	onChange: (ids: number[]) => void;
}) {
	return (
		<div>
			<div className="mb-2 text-sm font-medium">{label}</div>
			<div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
				{items.map((item) => (
					<Label className="flex items-center gap-2 font-normal" key={item.id}>
						<Checkbox
							checked={selected.includes(item.id)}
							onCheckedChange={(checked) =>
								onChange(
									checked
										? [...selected, item.id]
										: selected.filter((id) => id !== item.id),
								)
							}
						/>
						<span className="truncate">{item.label}</span>
					</Label>
				))}
			</div>
		</div>
	);
}

function BannerPreview({ form }: { form: CampaignForm }) {
	return (
		<div className="rounded-lg border p-4">
			<div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Email banner preview · {form.placement.toLowerCase()}
			</div>
			<div
				className="overflow-hidden rounded-xl p-5 text-white"
				style={{
					backgroundColor: form.accentColor,
					backgroundImage: form.imageUrl
						? `linear-gradient(90deg, ${form.accentColor}f2, ${form.accentColor}b0), url("${form.imageUrl}")`
						: undefined,
					backgroundPosition: "center",
					backgroundSize: "cover",
				}}
			>
				<div className="text-lg font-semibold">{form.headline}</div>
				<p className="mt-2 text-sm leading-5 text-white/90">
					{form.benefitText}
				</p>
				<div className="mt-4 inline-flex rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900">
					{form.ctaLabel}
				</div>
			</div>
		</div>
	);
}

function StatusButton({
	icon: Icon,
	label,
	onClick,
}: {
	icon: typeof Play;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button size="sm" variant="outline" onClick={onClick}>
			<Icon className="mr-2 size-4" />
			{label}
		</Button>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-md border bg-muted/20 p-3">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="mt-1 text-xl font-semibold">{value}</div>
		</div>
	);
}
