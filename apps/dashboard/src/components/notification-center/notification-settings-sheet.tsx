"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@gnd/ui/sheet";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type DeliveryKey = "emailEnabled" | "inAppEnabled" | "whatsappEnabled";

const DELIVERY_METHODS: Array<{
	key: DeliveryKey;
	supportKey: "email" | "inApp" | "whatsapp";
	preferenceKey: "email" | "inApp" | "whatsapp";
	label: string;
	icon: "Mail" | "Smartphone" | "WhatsApp";
}> = [
	{
		key: "emailEnabled",
		supportKey: "email",
		preferenceKey: "email",
		label: "Email",
		icon: "Mail",
	},
	{
		key: "inAppEnabled",
		supportKey: "inApp",
		preferenceKey: "inApp",
		label: "In-App",
		icon: "Smartphone",
	},
	{
		key: "whatsappEnabled",
		supportKey: "whatsapp",
		preferenceKey: "whatsapp",
		label: "WhatsApp",
		icon: "WhatsApp",
	},
];

export function NotificationSettingsSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [updating, setUpdating] = useState<{
		channelId: number;
		key: DeliveryKey;
	} | null>(null);

	const preferencesQuery = useQuery(
		trpc.notes.myNotificationPreferences.queryOptions(undefined, {
			enabled: open,
		}),
	);
	const preferences = preferencesQuery.data ?? [];

	const invalidateNotificationQueries = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.notes.myNotificationPreferences.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.notes.listMine.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.notes.notificationTypeSummary.pathKey(),
			}),
		]);
	};

	const updatePreferenceMutation = useMutation(
		trpc.notes.updateMyNotificationPreference.mutationOptions({
			onSuccess: async () => {
				await invalidateNotificationQueries();
				setUpdating(null);
			},
			onError: (error) => {
				toast.error(error.message || "Unable to update notification preference");
				setUpdating(null);
			},
		}),
	);

	const updatePreference = (
		channelId: number,
		key: DeliveryKey,
		checked: boolean,
	) => {
		setUpdating({ channelId, key });
		updatePreferenceMutation.mutate(
			key === "emailEnabled"
				? { channelId, emailEnabled: checked }
				: key === "inAppEnabled"
					? { channelId, inAppEnabled: checked }
					: { channelId, whatsappEnabled: checked },
		);
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="size-8 items-center justify-center rounded-full bg-transparent transition-colors hover:bg-accent"
					aria-label="Notification settings"
				>
					<Icons.Settings size={16} />
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
				<SheetHeader className="border-b px-5 py-4">
					<SheetTitle>Notification Settings</SheetTitle>
					<SheetDescription>
						Manage the channels and delivery methods available to you.
					</SheetDescription>
				</SheetHeader>
				<ScrollArea className="min-h-0 flex-1">
					<div className="space-y-3 p-5">
						{preferencesQuery.isPending ? (
							<SettingsSkeleton />
						) : preferencesQuery.error ? (
							<InlineMessage
								title="Could not load notification settings"
								description={preferencesQuery.error.message}
							/>
						) : preferences.length ? (
							preferences.map((channel) => (
								<div
									key={channel.id}
									className="rounded-lg border bg-background p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="truncate text-sm font-semibold">
													{channel.title}
												</p>
												<Badge variant="outline" className="text-[10px]">
													{channel.priority}
												</Badge>
											</div>
											<p className="line-clamp-2 text-xs text-muted-foreground">
												{channel.description || channel.name}
											</p>
										</div>
										<Badge variant="secondary" className="shrink-0 text-[10px]">
											{channel.category || "General"}
										</Badge>
									</div>
									<div className="mt-4 grid gap-2">
										{DELIVERY_METHODS.map((method) => {
											const Icon = Icons[method.icon];
											const supported = channel.supports[method.supportKey];
											const checked =
												channel.preferences[method.preferenceKey] && supported;
											const isUpdating =
												updatePreferenceMutation.isPending &&
												updating?.channelId === channel.id &&
												updating.key === method.key;

											return (
												<div
													key={method.key}
													className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
												>
													<div className="flex min-w-0 items-center gap-2">
														<Icon className="size-4 shrink-0 text-muted-foreground" />
														<span className="text-sm">{method.label}</span>
														{!supported ? (
															<span className="text-[11px] text-muted-foreground">
																Not supported
															</span>
														) : null}
													</div>
													<Switch
														checked={checked}
														disabled={
															!supported || updatePreferenceMutation.isPending
														}
														onCheckedChange={(nextChecked) =>
															updatePreference(
																channel.id,
																method.key,
																nextChecked,
															)
														}
													/>
													{isUpdating ? (
														<span className="sr-only">Updating</span>
													) : null}
												</div>
											);
										})}
									</div>
								</div>
							))
						) : (
							<InlineMessage
								title="No channels available"
								description="You do not currently have access to any notification channels."
							/>
						)}
					</div>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}

function SettingsSkeleton() {
	return (
		<div className="space-y-3">
			{["settings-skeleton-1", "settings-skeleton-2", "settings-skeleton-3"].map(
				(key) => (
					<div key={key} className="rounded-lg border p-4">
						<div className="h-4 w-2/3 rounded bg-muted" />
						<div className="mt-2 h-3 w-full rounded bg-muted" />
						<div className="mt-4 grid gap-2">
							<div className="h-9 rounded-md bg-muted" />
							<div className="h-9 rounded-md bg-muted" />
							<div className="h-9 rounded-md bg-muted" />
						</div>
					</div>
				),
			)}
		</div>
	);
}

function InlineMessage({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-lg border border-dashed p-6 text-center">
			<p className="text-sm font-semibold">{title}</p>
			<p className="mt-1 text-xs text-muted-foreground">{description}</p>
		</div>
	);
}
