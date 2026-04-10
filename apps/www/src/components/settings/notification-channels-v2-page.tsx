"use client";

import {
	invalidateQueries,
	invalidateQuery,
} from "@/hooks/use-invalidate-query";
import { useNotificationChannelParams } from "@/hooks/use-notification-channel-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Card } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type NotificationChannel =
	RouterOutputs["notes"]["getNotificationChannels"]["data"][number];

type DeliveryKey = "emailSupport" | "inAppSupport" | "whatsappSupport";
type UpdateNotificationChannelInput =
	RouterInputs["notes"]["updateNotificationChannel"];

const LIST_SKELETON_KEYS = [
	"list-skeleton-1",
	"list-skeleton-2",
	"list-skeleton-3",
	"list-skeleton-4",
	"list-skeleton-5",
	"list-skeleton-6",
];

const PANEL_SKELETON_KEYS = [
	"panel-skeleton-1",
	"panel-skeleton-2",
	"panel-skeleton-3",
];

const DELIVERY_METHODS: Array<{
	key: DeliveryKey;
	label: string;
	description: string;
	icon: keyof typeof Icons;
}> = [
	{
		key: "emailSupport",
		label: "Email",
		description: "Primary work email notifications",
		icon: "Mail",
	},
	{
		key: "inAppSupport",
		label: "In-App",
		description: "Dashboard and app alerts",
		icon: "Smartphone",
	},
	{
		key: "whatsappSupport",
		label: "WhatsApp",
		description: "WhatsApp delivery when supported",
		icon: "WhatsApp",
	},
];

export function NotificationChannelsV2Page() {
	const trpc = useTRPC();
	const { openNotificationChannelId, setParams } =
		useNotificationChannelParams();
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search);

	const channelsQuery = useQuery(
		trpc.notes.getNotificationChannels.queryOptions({
			q: deferredSearch.trim() || null,
			size: 200,
		}),
	);
	const channels = channelsQuery.data?.data ?? [];
	const channelMeta = channelsQuery.data?.meta as
		| { staticUpdateChecker?: boolean }
		| undefined;
	const needsChannelSync = !!channelMeta?.staticUpdateChecker;

	useEffect(() => {
		if (!channels.length) return;
		if (
			openNotificationChannelId &&
			channels.some((channel) => channel.id === openNotificationChannelId)
		) {
			return;
		}
		setParams({
			openNotificationChannelId: channels[0]?.id ?? null,
		});
	}, [channels, openNotificationChannelId, setParams]);

	const selectedChannelId =
		openNotificationChannelId ?? channels[0]?.id ?? null;
	const selectedFromList = useMemo(
		() => channels.find((channel) => channel.id === selectedChannelId),
		[channels, selectedChannelId],
	);

	const selectedChannelQuery = useQuery(
		trpc.notes.getNotificationChannel.queryOptions(
			{
				id: selectedChannelId ?? 0,
			},
			{
				enabled: !!selectedChannelId,
			},
		),
	);
	const selectedChannel = selectedChannelQuery.data ?? selectedFromList ?? null;

	const rolesQuery = useQuery(
		trpc.hrm.getRoles.queryOptions(undefined, {
			enabled: !!selectedChannelId,
		}),
	);
	const employeesQuery = useQuery(
		trpc.hrm.getEmployees.queryOptions(
			{
				size: 200,
			},
			{
				enabled: !!selectedChannelId,
			},
		),
	);
	const roles = rolesQuery.data ?? [];
	const employees = employeesQuery.data?.data ?? [];

	const availableSubscribers = useMemo(() => {
		const subscriberIds = new Set(selectedChannel?.subscriberIds ?? []);
		return employees.filter((employee) => !subscriberIds.has(employee.id));
	}, [employees, selectedChannel?.subscriberIds]);

	const selectedSubscribers = useMemo(() => {
		const subscriberIds = selectedChannel?.subscriberIds ?? [];
		return subscriberIds.map((subscriberId) => {
			return (
				employees.find((employee) => employee.id === subscriberId) ?? {
					id: subscriberId,
					name: `User ${subscriberId}`,
					email: null,
				}
			);
		});
	}, [employees, selectedChannel?.subscriberIds]);

	const [updatingMethodKey, setUpdatingMethodKey] =
		useState<DeliveryKey | null>(null);
	const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
	const [updatingSubscriberId, setUpdatingSubscriberId] = useState<
		number | null
	>(null);

	const refreshChannelQueries = () => {
		invalidateQueries("notes.getNotificationChannels");
		if (selectedChannelId) {
			invalidateQuery("notes.getNotificationChannel", {
				id: selectedChannelId,
			});
		}
	};

	const updateChannelMutation = useMutation(
		trpc.notes.updateNotificationChannel.mutationOptions({
			onSuccess() {
				refreshChannelQueries();
				setUpdatingMethodKey(null);
			},
			onError() {
				setUpdatingMethodKey(null);
			},
		}),
	);

	const syncChannelsMutation = useMutation(
		trpc.notes.syncNotificationChannels.mutationOptions({
			onSuccess() {
				refreshChannelQueries();
			},
		}),
	);

	const addRoleMutation = useMutation(
		trpc.notes.addNotificationChannelRole.mutationOptions({
			onSuccess() {
				refreshChannelQueries();
				setUpdatingRoleId(null);
			},
			onError() {
				setUpdatingRoleId(null);
			},
		}),
	);

	const removeRoleMutation = useMutation(
		trpc.notes.removeNotificationChannelRole.mutationOptions({
			onSuccess() {
				refreshChannelQueries();
				setUpdatingRoleId(null);
			},
			onError() {
				setUpdatingRoleId(null);
			},
		}),
	);

	const addSubscriberMutation = useMutation(
		trpc.notes.addNotificationChannelSubscriber.mutationOptions({
			onSuccess() {
				refreshChannelQueries();
				setUpdatingSubscriberId(null);
			},
			onError() {
				setUpdatingSubscriberId(null);
			},
		}),
	);

	const removeSubscriberMutation = useMutation(
		trpc.notes.removeNotificationChannelSubscriber.mutationOptions({
			onSuccess() {
				refreshChannelQueries();
				setUpdatingSubscriberId(null);
			},
			onError() {
				setUpdatingSubscriberId(null);
			},
		}),
	);

	const updateDeliveryMethod = (
		channelId: number,
		method: DeliveryKey,
		checked: boolean,
	) => {
		setUpdatingMethodKey(method);
		const payload: UpdateNotificationChannelInput =
			method === "emailSupport"
				? { id: channelId, emailSupport: checked }
				: method === "inAppSupport"
					? { id: channelId, inAppSupport: checked }
					: { id: channelId, whatsappSupport: checked };
		updateChannelMutation.mutate(payload);
	};

	return (
		<div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
			<Card className="flex min-h-0 flex-col overflow-hidden">
				<Card.Header className="shrink-0 space-y-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<Card.Title className="text-lg font-bold">Channels</Card.Title>
							<Card.Description>
								Manage delivery methods and subscribers.
							</Card.Description>
						</div>
						<Badge variant="outline">{channels.length}</Badge>
					</div>
					<div className="relative">
						<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search notification channels..."
							className="pl-9"
						/>
					</div>
					{needsChannelSync ? (
						<div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div className="space-y-1">
									<p className="font-semibold">
										Channel definitions need an update
									</p>
									<p className="text-xs text-amber-900/80">
										Load the current list normally, then run a one-time sync to
										restore any missing built-in channels.
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									className="border-amber-300 bg-white"
									disabled={syncChannelsMutation.isPending}
									onClick={() => syncChannelsMutation.mutate()}
								>
									{syncChannelsMutation.isPending ? (
										<Icons.Loader2 className="mr-2 size-4 animate-spin" />
									) : (
										<Icons.RefreshCcw className="mr-2 size-4" />
									)}
									Update Channels
								</Button>
							</div>
						</div>
					) : null}
				</Card.Header>
				<ScrollArea className="min-h-0 flex-1">
					<Card.Content className="space-y-3">
						{channelsQuery.isPending ? (
							<ListSkeleton />
						) : channelsQuery.error ? (
							<InlineMessage
								icon="XCircle"
								title="Could not load notification channels"
								description={
									channelsQuery.error instanceof Error
										? channelsQuery.error.message
										: "Something went wrong while loading channels."
								}
							/>
						) : channels.length ? (
							channels.map((channel) => (
								<button
									key={channel.id}
									type="button"
									onClick={() =>
										setParams({
											openNotificationChannelId: channel.id,
										})
									}
									className={cn(
										"w-full rounded-2xl border p-4 text-left transition-colors",
										selectedChannelId === channel.id
											? "border-primary bg-primary/5"
											: "hover:bg-muted/40",
									)}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-sm font-bold">{channel.title}</p>
												<Badge variant="secondary" className="text-[10px]">
													{channel.priority}
												</Badge>
											</div>
											<p className="line-clamp-2 text-xs text-muted-foreground">
												{channel.description || channel.name}
											</p>
										</div>
										<div className="flex shrink-0 gap-2 text-muted-foreground">
											<DeliveryIcon
												active={!!channel.emailSupport}
												icon="Mail"
											/>
											<DeliveryIcon
												active={!!channel.inAppSupport}
												icon="Smartphone"
											/>
											<DeliveryIcon
												active={!!channel.whatsappSupport}
												icon="WhatsApp"
											/>
										</div>
									</div>
									<div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
										<Badge variant="outline">
											{channel.category || "General"}
										</Badge>
										<Badge variant="outline">
											{channel.roles.length} role
											{channel.roles.length === 1 ? "" : "s"}
										</Badge>
										<Badge variant="outline">
											{channel.subscriberIds.length} user
											{channel.subscriberIds.length === 1 ? "" : "s"}
										</Badge>
									</div>
								</button>
							))
						) : (
							<InlineMessage
								icon="BellRing"
								title="No notification channels found"
								description="Try a different search or clear the filter."
							/>
						)}
					</Card.Content>
				</ScrollArea>
			</Card>

			<Card className="flex min-h-0 flex-col overflow-hidden">
				{selectedChannel ? (
					<>
						<Card.Header className="shrink-0 space-y-4 border-b">
							<div className="flex items-start justify-between gap-4">
								<div className="space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<Card.Title className="text-xl font-bold">
											{selectedChannel.title}
										</Card.Title>
										<Badge variant="outline">ID: {selectedChannel.id}</Badge>
									</div>
									<Card.Description className="max-w-2xl">
										{selectedChannel.description ||
											"Configure delivery methods, role subscriptions, and manual subscribers for this channel."}
									</Card.Description>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() =>
										setParams({
											openNotificationChannelId: null,
										})
									}
								>
									<Icons.X className="size-4" />
								</Button>
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge variant="secondary">{selectedChannel.priority}</Badge>
								<Badge variant="outline">
									{selectedChannel.category || "General"}
								</Badge>
								{selectedChannel.published ? (
									<Badge variant="outline">Published</Badge>
								) : null}
								{selectedChannel.deletable ? (
									<Badge variant="outline">Custom</Badge>
								) : (
									<Badge variant="outline">Built-in</Badge>
								)}
							</div>
						</Card.Header>
						<ScrollArea className="min-h-0 flex-1">
							<Card.Content className="space-y-8 p-6">
								<section className="space-y-4">
									<SectionHeading
										icon="Settings"
										title="Delivery Methods"
										description="Toggle which delivery mechanisms this channel supports by default."
									/>
									<div className="grid gap-4 md:grid-cols-3">
										{DELIVERY_METHODS.map((method) => {
											const Icon = Icons[method.icon];
											const active = !!selectedChannel[method.key];
											const updating =
												updateChannelMutation.isPending &&
												updatingMethodKey === method.key;
											return (
												<div
													key={method.key}
													className={cn(
														"rounded-2xl border p-4",
														active && "border-primary bg-primary/5",
													)}
												>
													<div className="flex items-start justify-between gap-3">
														<div className="space-y-2">
															<div className="flex items-center gap-2">
																<div className="rounded-lg bg-muted p-2">
																	<Icon className="size-4" />
																</div>
																<p className="font-semibold">{method.label}</p>
															</div>
															<p className="text-sm text-muted-foreground">
																{method.description}
															</p>
														</div>
														<Switch
															checked={active}
															disabled={updateChannelMutation.isPending}
															onCheckedChange={(checked) =>
																updateDeliveryMethod(
																	selectedChannel.id,
																	method.key,
																	checked,
																)
															}
														/>
													</div>
													{updating ? (
														<p className="mt-3 text-xs text-muted-foreground">
															Updating...
														</p>
													) : null}
												</div>
											);
										})}
									</div>
								</section>

								<section className="space-y-4">
									<SectionHeading
										icon="Shield"
										title="Role Subscribers"
										description="Roles subscribed here receive notifications through their members."
									/>
									<div className="flex flex-wrap gap-2">
										{roles.map((role) => {
											const active = selectedChannel.roles.includes(role.name);
											const updating =
												(addRoleMutation.isPending ||
													removeRoleMutation.isPending) &&
												updatingRoleId === role.id;
											return (
												<Button
													key={role.id}
													type="button"
													variant={active ? "default" : "outline"}
													className="rounded-full"
													disabled={updating}
													onClick={() => {
														setUpdatingRoleId(role.id);
														if (active) {
															removeRoleMutation.mutate({
																notificationChannelId: selectedChannel.id,
																roleId: role.id,
															});
															return;
														}
														addRoleMutation.mutate({
															notificationChannelId: selectedChannel.id,
															roleId: role.id,
														});
													}}
												>
													{updating ? (
														<Icons.Loader2 className="mr-2 size-4 animate-spin" />
													) : (
														<Icons.Shield className="mr-2 size-4" />
													)}
													{role.name}
												</Button>
											);
										})}
									</div>
								</section>

								<section className="space-y-4">
									<SectionHeading
										icon="Users"
										title="Manual Subscribers"
										description="Add or remove specific users as direct subscribers for this channel."
									/>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="text-sm text-muted-foreground">
											{selectedSubscribers.length} user
											{selectedSubscribers.length === 1 ? "" : "s"} subscribed
										</div>
										<ComboboxDropdown
											listClassName="w-[320px]"
											searchPlaceholder="Search employees"
											placeholder="Select employee"
											items={availableSubscribers.map((employee) => ({
												id: String(employee.id),
												label: employee.name,
												data: employee,
											}))}
											onSelect={(item) => {
												setUpdatingSubscriberId(item.data.id);
												addSubscriberMutation.mutate({
													notificationChannelId: selectedChannel.id,
													subscriberId: item.data.id,
												});
											}}
											Trigger={
												<Button variant="outline" className="gap-2">
													<Icons.UserPlus className="size-4" />
													Add User
												</Button>
											}
											emptyResults="No available users"
										/>
									</div>
									<div className="space-y-3">
										{selectedSubscribers.length ? (
											selectedSubscribers.map((subscriber) => {
												const removing =
													removeSubscriberMutation.isPending &&
													updatingSubscriberId === subscriber.id;
												return (
													<div
														key={subscriber.id}
														className="flex items-center justify-between gap-3 rounded-2xl border p-4"
													>
														<div className="min-w-0 space-y-1">
															<p className="truncate font-semibold">
																{subscriber.name}
															</p>
															<p className="truncate text-sm text-muted-foreground">
																{subscriber.email || "No email available"}
															</p>
														</div>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															disabled={removing}
															onClick={() => {
																setUpdatingSubscriberId(subscriber.id);
																removeSubscriberMutation.mutate({
																	notificationChannelId: selectedChannel.id,
																	subscriberId: subscriber.id,
																});
															}}
														>
															{removing ? (
																<Icons.Loader2 className="size-4 animate-spin" />
															) : (
																<Icons.Trash2 className="size-4" />
															)}
														</Button>
													</div>
												);
											})
										) : (
											<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
												No manual subscribers assigned yet.
											</div>
										)}
									</div>
								</section>
							</Card.Content>
						</ScrollArea>
					</>
				) : selectedChannelId && selectedChannelQuery.isPending ? (
					<Card.Content className="p-6">
						<PanelSkeleton />
					</Card.Content>
				) : (
					<Card.Content className="flex h-full min-h-[420px] items-center justify-center p-6">
						<InlineMessage
							icon="BellRing"
							title="Select a notification channel"
							description="Choose a channel on the left to manage its delivery methods and subscribers."
						/>
					</Card.Content>
				)}
			</Card>
		</div>
	);
}

function SectionHeading({
	icon,
	title,
	description,
}: {
	icon: keyof typeof Icons;
	title: string;
	description: string;
}) {
	const Icon = Icons[icon];
	return (
		<div className="space-y-1">
			<div className="flex items-center gap-2">
				<Icon className="size-4 text-primary" />
				<h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
			</div>
			<p className="text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function InlineMessage({
	icon,
	title,
	description,
}: {
	icon: keyof typeof Icons;
	title: string;
	description: string;
}) {
	const Icon = Icons[icon];
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center">
			<div className="rounded-full bg-muted p-3">
				<Icon className="size-6 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<p className="font-semibold">{title}</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

function DeliveryIcon({
	active,
	icon,
}: {
	active: boolean;
	icon: keyof typeof Icons;
}) {
	const Icon = Icons[icon];
	return (
		<div
			className={cn(
				"rounded-md p-1.5",
				active
					? "bg-primary/10 text-primary"
					: "bg-muted text-muted-foreground",
			)}
		>
			<Icon className="size-4" />
		</div>
	);
}

function ListSkeleton() {
	return (
		<div className="space-y-3">
			{LIST_SKELETON_KEYS.map((key) => (
				<div
					key={key}
					className="h-28 animate-pulse rounded-2xl border bg-muted/40"
				/>
			))}
		</div>
	);
}

function PanelSkeleton() {
	return (
		<div className="space-y-4">
			<div className="h-8 w-56 animate-pulse rounded bg-muted/40" />
			<div className="h-4 w-full animate-pulse rounded bg-muted/40" />
			<div className="h-4 w-2/3 animate-pulse rounded bg-muted/40" />
			<div className="grid gap-4 md:grid-cols-3">
				{PANEL_SKELETON_KEYS.map((key) => (
					<div
						key={key}
						className="h-32 animate-pulse rounded-2xl border bg-muted/40"
					/>
				))}
			</div>
		</div>
	);
}
