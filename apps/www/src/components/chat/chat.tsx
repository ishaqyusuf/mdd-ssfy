"use client";

import { FileUpload } from "@/components/file-upload";
import { env } from "@/env.mjs";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu as Dropdown } from "@gnd/ui/namespace";
import { Textarea } from "@gnd/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import type { BlobPath } from "@gnd/utils/constants";
import {
	type ChannelName,
	getChannelsOptionList,
	isChannelName,
} from "@notifications/channels";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type PutBlobResult, del } from "@vercel/blob";
import Image from "next/image";
import {
	type FormEvent,
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";

export type ChatOption = {
	label: string;
	value: string;
	icon?: ReactNode;
	disabled?: boolean;
};

export type InboxContact = {
	id: number;
	role?: "employee" | "customer";
};

export type InboxContactGroup = {
	ids: number[];
	role?: "employee" | "customer";
};

export type InboxContacts =
	| InboxContact[]
	| InboxContactGroup[]
	| {
			employee?: number[];
			customer?: number[];
	  };

type OptionFieldConfig = {
	required?: boolean;
	show?: boolean;
};

type ChatState = {
	channel: string;
	message: string;
	meta: Record<string, string>;
	payload: Record<string, string>;
	attachments: string[];
	errors: Record<string, string>;
	isSubmitting: boolean;
	noteColor: string;
};

type ChatContextValue = {
	state: ChatState;
	setChannel: (value: string) => void;
	setMessage: (value: string) => void;
	setMetaValue: (name: string, value: string) => void;
	setPayloadValue: (name: string, value: string) => void;
	setMetaFieldConfig: (name: string, config: OptionFieldConfig) => void;
	setPayloadFieldConfig: (name: string, config: OptionFieldConfig) => void;
	setNoteColor: (value: string) => void;
	submit: () => Promise<void>;
	channelOptions: Array<{ label: string; value: string; description: string }>;
	attachmentName?: string;
	attachmentType?: "image" | "mixed";
	multiAttachmentSupport?: boolean;
	attachmentChannels?: readonly string[];
	attachmentPath?: BlobPath;
	appendAttachments: (pathnames: string[]) => void;
	removeAttachment: (pathname: string) => Promise<void>;
};

export type ChatSubmitData = {
	channel: string;
	message?: string;
	payload: Record<string, unknown>;
	attachments: string[];
	meta: Record<string, string>;
	noteColor: string;
	contacts: InboxContactGroup[];
	transformed: unknown;
};

type TransformSubmitData = (
	payload: Record<string, string>,
	meta: Record<string, string>,
) => Promise<unknown> | unknown;

export type ChatProps = {
	children: ReactNode;
	className?: string;
	channel?: string;
	names?: readonly string[];
	payload?: Record<string, unknown>;
	defaultPayloads?:
		| Record<string, string>
		| Partial<Record<string, Record<string, string>>>;
	contacts?: InboxContacts;
	messageRequired?: boolean;
	transformSubmitData?: TransformSubmitData;
	onSubmitData?: (data: ChatSubmitData) => void | Promise<void>;
	onSent?: () => void;
	attachmentName?: string;
	attachmentType?: "image" | "mixed";
	multiAttachmentSupport?: boolean;
	attachmentChannels?: readonly string[];
	attachmentPath?: BlobPath;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const defaultPalette = [
	"#000000",
	"#00A9FE",
	"#00D084",
	"#FF6900",
	"#EB144C",
	"#8A2BE2",
] as const;

function createErrorKey(scope: "meta" | "payload", name: string) {
	return `${scope}:${name}`;
}

function normalizeContacts(contacts?: InboxContacts): InboxContactGroup[] {
	if (!contacts) return [];

	if (Array.isArray(contacts)) {
		return contacts
			.map((item) => {
				const role: "employee" | "customer" =
					item.role === "customer" ? "customer" : "employee";
				if ("ids" in item) {
					return {
						role,
						ids: item.ids || [],
					};
				}
				return {
					role,
					ids: [item.id],
				};
			})
			.filter((group) => group.ids.length > 0);
	}

	return (
		[
			{
				role: "employee",
				ids: contacts.employee || [],
			},
			{
				role: "customer",
				ids: contacts.customer || [],
			},
		] as InboxContactGroup[]
	).filter((group) => group.ids.length > 0);
}

function mergeSubmitPayload(
	basePayload: Record<string, unknown>,
	dynamicPayload: Record<string, string>,
	transformed: unknown,
) {
	const mergedBase = {
		...(basePayload || {}),
		...dynamicPayload,
	};

	if (
		transformed &&
		typeof transformed === "object" &&
		!Array.isArray(transformed)
	) {
		return {
			...mergedBase,
			...(transformed as Record<string, unknown>),
		};
	}

	return mergedBase;
}

function resolveDefaultPayloadValues(
	defaultPayloads: ChatProps["defaultPayloads"],
	channel?: string,
) {
	if (!defaultPayloads) return {};

	const values = Object.values(defaultPayloads);
	const first = values[0];

	// Flat payload defaults (single map used for every channel)
	if (typeof first === "string" || first == null) {
		return defaultPayloads as Record<string, string>;
	}

	if (!channel) return {};
	return (
		(defaultPayloads as Partial<Record<string, Record<string, string>>>)[
			channel
		] || {}
	);
}

function isAttachmentChannelEnabled(
	channel: string,
	attachmentName?: string,
	attachmentChannels?: readonly string[],
) {
	if (!attachmentName) return false;
	if (!attachmentChannels?.length) return true;
	return attachmentChannels.includes(channel);
}

function getAttachmentExtension(pathname: string) {
	const extension = pathname.split(".").pop()?.toLowerCase();
	return extension || "";
}

function getAttachmentKind(pathname: string) {
	const extension = getAttachmentExtension(pathname);
	if (
		["jpg", "jpeg", "png", "webp", "heic", "heif", "avif", "gif"].includes(
			extension,
		)
	) {
		return "image";
	}
	if (extension === "pdf") {
		return "pdf";
	}
	return "file";
}

function getAttachmentAccept(
	attachmentType: NonNullable<ChatProps["attachmentType"]>,
) {
	if (attachmentType === "image") {
		return {
			"image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"],
		} as const;
	}

	return {
		"image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"],
		"application/pdf": [".pdf"],
	} as const;
}

function attachmentButtonLabel(
	attachmentType: NonNullable<ChatProps["attachmentType"]>,
	hasExistingAttachments: boolean,
) {
	if (attachmentType === "image") {
		return hasExistingAttachments ? "Add another image" : "Attach image";
	}

	return hasExistingAttachments
		? "Add another image or PDF"
		: "Attach image or PDF";
}

export function useChat() {
	const ctx = useContext(ChatContext);
	if (!ctx) {
		throw new Error("useChat must be used within <Chat>");
	}
	return ctx;
}

type BaseSlotProps = {
	children?: ReactNode;
	className?: string;
};

function ChatHeader({ children, className }: BaseSlotProps) {
	return (
		<div
			className={cn(
				"flex flex-row items-center gap-1.5 px-2 py-1.5",
				className,
			)}
		>
			{children}
		</div>
	);
}

function ChatFooter({ children, className }: BaseSlotProps) {
	return (
		<div
			className={cn(
				"flex flex-row items-center gap-1.5 px-2 py-1.5",
				className,
			)}
		>
			{children}
		</div>
	);
}

type ChatChannelsOptionProps = {
	names?: readonly string[];
	className?: string;
	placeholder?: string;
};

function ChatChannelsOption({
	names,
	className,
	placeholder = "Type or select a channel",
}: ChatChannelsOptionProps) {
	const { state, setChannel, channelOptions } = useChat();

	const options = useMemo(
		() =>
			names?.length
				? channelOptions.filter((item) => names.includes(item.value))
				: channelOptions,
		[channelOptions, names],
	);

	return (
		<div className={cn("w-auto space-y-1", className)}>
			<Dropdown.Root>
				<TooltipProvider delayDuration={120}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Dropdown.Trigger asChild>
								<Button
									type="button"
									variant="outline"
									className="h-7 w-fit min-w-[170px] max-w-[240px] justify-between rounded-md border border-transparent bg-transparent px-2 shadow-none"
								>
									<span className="truncate">
										{options.find((option) => option.value === state.channel)
											?.label || placeholder}
									</span>
									<Icons.ChevronDown className="size-3.5 text-muted-foreground" />
								</Button>
							</Dropdown.Trigger>
						</TooltipTrigger>
						<TooltipContent side="top" className="px-2 py-1 text-xs">
							Channel
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<Dropdown.Content>
					<Dropdown.Label>Channel</Dropdown.Label>
					<Dropdown.Separator />
					{options.map((option) => (
						<Dropdown.Item
							key={option.value}
							onSelect={() => setChannel(option.value)}
						>
							{option.label}
						</Dropdown.Item>
					))}
				</Dropdown.Content>
			</Dropdown.Root>
			{state.errors.channel ? (
				<p className="text-xs text-destructive">{state.errors.channel}</p>
			) : null}
		</div>
	);
}

function ChatOptions({ children, className }: BaseSlotProps) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-1.5 px-2 py-0.5",
				className,
			)}
		>
			{children}
		</div>
	);
}

type ChatMetaOptionProps = {
	show?: boolean;
	required?: boolean;
	name: string;
	label?: string;
	icon?: ReactNode;
	options?: ChatOption[];
	className?: string;
	placeholder?: string;
};

type DropdownOptionFieldProps = {
	value?: string;
	name: string;
	label?: string;
	placeholder?: string;
	options: ChatOption[];
	onSelect: (value: string) => void;
	className?: string;
	error?: string;
};

function DropdownOptionField({
	value,
	name,
	label,
	placeholder,
	options,
	onSelect,
	className,
	error,
}: DropdownOptionFieldProps) {
	const selectedLabel =
		options.find((option) => option.value === value)?.label ||
		placeholder ||
		(label ? `Select ${label}` : "Select option");
	const triggerLabel = label ? `${label}: ${selectedLabel}` : selectedLabel;

	return (
		<div className={cn("w-auto space-y-1", className)}>
			<Dropdown.Root>
				<TooltipProvider delayDuration={120}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Dropdown.Trigger asChild>
								<Button
									type="button"
									variant="outline"
									className="h-7 w-auto justify-between rounded-md border border-transparent bg-transparent px-2 shadow-none font-normal"
								>
									<span className="truncate">{triggerLabel}</span>
									<Icons.ChevronDown className="size-3.5 text-muted-foreground" />
								</Button>
							</Dropdown.Trigger>
						</TooltipTrigger>
						<TooltipContent side="top" className="px-2 py-1 text-xs">
							{label || name}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<Dropdown.Content>
					<Dropdown.Label>{label || name}</Dropdown.Label>
					<Dropdown.Separator />
					{options.map((option) => (
						<Dropdown.Item
							key={option.value}
							disabled={option.disabled}
							onSelect={() => onSelect(option.value)}
						>
							{option.label}
						</Dropdown.Item>
					))}
				</Dropdown.Content>
			</Dropdown.Root>
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}

function ChatMetaOption({
	show = true,
	required,
	name,
	label,
	icon: _icon,
	options = [],
	className,
	placeholder,
}: ChatMetaOptionProps) {
	const { state, setMetaValue, setMetaFieldConfig } = useChat();

	useEffect(() => {
		setMetaFieldConfig(name, { required, show });
	}, [name, required, setMetaFieldConfig, show]);

	if (!show) return null;

	const errorKey = createErrorKey("meta", name);

	return (
		<DropdownOptionField
			value={state.meta[name]}
			name={name}
			label={label}
			placeholder={placeholder}
			options={options}
			onSelect={(value) => setMetaValue(name, value)}
			className={className}
			error={state.errors[errorKey]}
		/>
	);
}

type ChatPayloadOptionProps = {
	show?: boolean;
	required?: boolean;
	name: string;
	label?: string;
	icon?: ReactNode;
	options: ChatOption[];
	className?: string;
};

function ChatPayloadOption({
	show = true,
	required,
	name,
	label,
	icon: _icon,
	options,
	className,
}: ChatPayloadOptionProps) {
	const { state, setPayloadValue, setPayloadFieldConfig } = useChat();

	useEffect(() => {
		setPayloadFieldConfig(name, { required, show });
	}, [name, required, setPayloadFieldConfig, show]);

	if (!show) return null;

	const errorKey = createErrorKey("payload", name);

	return (
		<DropdownOptionField
			value={state.payload[name]}
			name={name}
			label={label}
			options={options}
			onSelect={(value) => setPayloadValue(name, value)}
			className={className}
			error={state.errors[errorKey]}
		/>
	);
}

type ChatContentProps = {
	className?: string;
	placeholder?: string;
};

export function ChatContent({
	className,
	placeholder = "Write a note...",
}: ChatContentProps) {
	const { state, setMessage, submit } = useChat();
	const context = useContext(ChatContext);

	if (!context) {
		throw new Error("useChat must be used within <Chat>");
	}

	const {
		attachmentName,
		attachmentType = "image",
		multiAttachmentSupport = false,
		attachmentPath = "inbound-documents",
		attachmentChannels,
		appendAttachments,
		removeAttachment,
	} = context;
	const attachmentsEnabled = isAttachmentChannelEnabled(
		state.channel,
		attachmentName,
		attachmentChannels,
	);
	const canAddMoreAttachments =
		multiAttachmentSupport || state.attachments.length === 0;

	return (
		<div className={cn("space-y-1 px-2 py-1", className)}>
			<Textarea
				value={state.message}
				onChange={(event) => setMessage(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && event.altKey) {
						event.preventDefault();
						void submit();
					}
				}}
				placeholder={placeholder}
				className="min-h-[56px] resize-none rounded-lg border-0 bg-transparent px-1 py-0.5 shadow-none focus-visible:border-0 focus-visible:ring-0"
			/>
			{state.errors.message ? (
				<p className="text-xs text-destructive">{state.errors.message}</p>
			) : null}
			{state.errors.submit ? (
				<p className="text-xs text-destructive">{state.errors.submit}</p>
			) : null}
			{attachmentsEnabled ? (
				<div className="space-y-2 pt-2">
					{state.attachments.length ? (
						<div className="flex flex-wrap gap-2">
							{state.attachments.map((pathname) => (
								<div
									key={pathname}
									className="relative overflow-hidden rounded-lg border bg-muted/20"
								>
									<a
										href={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${pathname}`}
										target="_blank"
										rel="noreferrer"
										className="flex min-h-[72px] min-w-[72px] items-center justify-center"
									>
										{getAttachmentKind(pathname) === "image" ? (
											<Image
												src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${pathname}`}
												alt={pathname}
												width={72}
												height={72}
												className="h-[72px] w-[72px] object-cover"
											/>
										) : (
											<div className="flex h-[72px] w-[160px] items-center gap-2 px-3">
												<Icons.FileText className="size-5 shrink-0 text-muted-foreground" />
												<div className="min-w-0">
													<p className="truncate text-xs font-medium text-foreground">
														{pathname.split("/").pop()}
													</p>
													<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
														{getAttachmentKind(pathname) === "pdf"
															? "PDF"
															: "File"}
													</p>
												</div>
											</div>
										)}
									</a>
									<Button
										type="button"
										variant="secondary"
										size="icon"
										className="absolute right-1 top-1 h-6 w-6 rounded-full"
										onClick={() => void removeAttachment(pathname)}
									>
										<Icons.X className="size-3.5" />
										<span className="sr-only">Remove attachment</span>
									</Button>
								</div>
							))}
						</div>
					) : null}
					{canAddMoreAttachments ? (
						<FileUpload
							path={attachmentPath}
							maxFiles={multiAttachmentSupport ? 25 : 1}
							accept={getAttachmentAccept(attachmentType)}
							dragDescription={
								attachmentType === "image"
									? "Drop an image here."
									: "Drop an image or PDF here."
							}
							dragActiveDescription={
								attachmentType === "image"
									? "Release to attach this image."
									: "Release to attach this image or PDF."
							}
							onUploadComplete={(results: PutBlobResult[]) => {
								appendAttachments(results.map((result) => result.pathname));
							}}
						>
							<div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-3 transition-colors hover:bg-muted/30">
								<div className="flex items-center gap-3">
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
										{attachmentType === "image" ? (
											<Icons.Camera className="size-4 text-muted-foreground" />
										) : (
											<Icons.UploadCloud className="size-4 text-muted-foreground" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-foreground">
											{attachmentButtonLabel(
												attachmentType,
												state.attachments.length > 0,
											)}
										</p>
										<p className="text-xs text-muted-foreground">
											{attachmentType === "image"
												? "Drag and drop or browse from your device."
												: "Drag and drop images or PDFs, or browse from your device."}
										</p>
									</div>
								</div>
							</div>
						</FileUpload>
					) : null}
				</div>
			) : null}
		</div>
	);
}

type ChatColorPickerProps = {
	className?: string;
	label?: string;
	palette?: readonly string[];
};

function ChatColorPicker({
	className,
	label = "Note color",
	palette = defaultPalette,
}: ChatColorPickerProps) {
	const { state, setNoteColor } = useChat();

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Dropdown.Root>
				<TooltipProvider delayDuration={120}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Dropdown.Trigger asChild>
								<Button
									type="button"
									variant="outline"
									className="h-7 w-auto justify-between rounded-md border border-transparent bg-transparent px-2 shadow-none font-normal"
								>
									<span className="truncate lowercase">{label}:</span>
									<span
										className="size-3 rounded-full border"
										style={{ backgroundColor: state.noteColor }}
									/>
									<Icons.ChevronDown className="size-3.5 text-muted-foreground" />
								</Button>
							</Dropdown.Trigger>
						</TooltipTrigger>
						<TooltipContent side="top" className="px-2 py-1 text-xs">
							{label}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<Dropdown.Content align="start" className="w-36 p-1.5">
					<Dropdown.Label>Note color</Dropdown.Label>
					<Dropdown.Separator />
					<div className="grid grid-cols-5 gap-1">
						{palette.map((color) => (
							<Dropdown.Item
								key={color}
								className={cn(
									"h-5 w-5 min-w-0 rounded-sm p-0",
									state.noteColor === color && "ring-1 ring-foreground/50",
								)}
								onSelect={() => setNoteColor(color)}
								aria-label={`Select ${color} note color`}
							>
								<span
									className="h-full w-full rounded-[5px] border"
									style={{ backgroundColor: color }}
								/>
							</Dropdown.Item>
						))}
					</div>
				</Dropdown.Content>
			</Dropdown.Root>
		</div>
	);
}

type ChatSendButtonProps = {
	className?: string;
	label?: string;
};

function ChatSendButton({ className, label = "Send" }: ChatSendButtonProps) {
	const { state } = useChat();
	const resolvedLabel = state.isSubmitting ? "Sending..." : label;

	return (
		<TooltipProvider delayDuration={120}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="submit"
						disabled={state.isSubmitting}
						className={cn("h-7 w-7 rounded-full p-0", className)}
						aria-label={resolvedLabel}
						title={resolvedLabel}
					>
						<Icons.ArrowOutward className="size-4" />
						<span className="sr-only">{resolvedLabel}</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top" className="px-2 py-1 text-xs">
					{resolvedLabel}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function ChatRoot({
	children,
	className,
	channel,
	names,
	payload,
	defaultPayloads,
	contacts,
	messageRequired,
	transformSubmitData,
	onSubmitData,
	onSent,
	attachmentName,
	attachmentType,
	multiAttachmentSupport,
	attachmentChannels,
	attachmentPath,
}: ChatProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const defaultChannelOptions = useMemo(
		() => getChannelsOptionList({ names }),
		[names],
	);

	const resolvedDefaultChannel = useMemo(() => {
		if (channel && isChannelName(channel)) {
			return channel;
		}
		return defaultChannelOptions[0]?.value || "";
	}, [channel, defaultChannelOptions]);

	const [state, setState] = useState<ChatState>({
		channel: resolvedDefaultChannel,
		message: "",
		meta: {},
		payload: resolveDefaultPayloadValues(
			defaultPayloads,
			resolvedDefaultChannel,
		),
		attachments: [],
		errors: {},
		isSubmitting: false,
		noteColor: "#000000",
	});

	const [metaFieldConfigs, setMetaFieldConfigs] = useState<
		Record<string, OptionFieldConfig>
	>({});
	const [payloadFieldConfigs, setPayloadFieldConfigs] = useState<
		Record<string, OptionFieldConfig>
	>({});

	const normalizedContacts = useMemo(
		() => normalizeContacts(contacts),
		[contacts],
	);

	const fallbackMutation = useMutation(
		trpc.notes.createInboxActivity.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: trpc.notes.activityTree.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.notes.list.pathKey(),
				});
			},
		}),
	);

	useEffect(() => {
		if (!state.channel && defaultChannelOptions.length > 0) {
			setState((prev) => ({
				...prev,
				channel: defaultChannelOptions[0].value,
				payload: resolveDefaultPayloadValues(
					defaultPayloads,
					defaultChannelOptions[0].value,
				),
			}));
		}
	}, [defaultChannelOptions, defaultPayloads, state.channel]);

	const channelOptions = useMemo(() => {
		const options = getChannelsOptionList({ names });
		if (!channel || !isChannelName(channel)) {
			return options;
		}
		const hasDefault = options.some((item) => item.value === channel);
		if (hasDefault) {
			return options;
		}
		const fallback = getChannelsOptionList({ channel })[0];
		return fallback ? [fallback, ...options] : options;
	}, [channel, names]);

	const submit = useCallback(async () => {
		const errors: Record<string, string> = {};

		if (!state.channel) {
			errors.channel = "Please select a channel.";
		} else if (!isChannelName(state.channel)) {
			errors.channel = "Please select a valid channel.";
		}

		if (messageRequired && !state.message.trim()) {
			errors.message = "Message is required.";
		}

		for (const [name, config] of Object.entries(metaFieldConfigs)) {
			if (config.show === false || !config.required) continue;
			if (!state.meta[name]?.trim()) {
				errors[createErrorKey("meta", name)] = "This field is required.";
			}
		}

		for (const [name, config] of Object.entries(payloadFieldConfigs)) {
			if (config.show === false || !config.required) continue;
			if (!state.payload[name]?.trim()) {
				errors[createErrorKey("payload", name)] = "This field is required.";
			}
		}

		if (Object.keys(errors).length > 0) {
			setState((prev) => ({ ...prev, errors }));
			return;
		}

		setState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));

		try {
			const transformed = transformSubmitData
				? await transformSubmitData(state.payload, state.meta)
				: undefined;

			const finalPayload = mergeSubmitPayload(
				payload || {},
				state.payload,
				transformed,
			);
			const payloadWithAttachments = {
				...finalPayload,
				...(attachmentName && state.attachments.length
					? {
							[attachmentName]: multiAttachmentSupport
								? state.attachments
								: [state.attachments[0]],
						}
					: {}),
			};
			const trimmedMessage = state.message.trim();
			const hasPayload = Object.keys(payloadWithAttachments).length > 0;

			if (!trimmedMessage && !hasPayload) {
				setState((prev) => ({
					...prev,
					errors: {
						...prev.errors,
						submit: "Message is empty",
					},
					isSubmitting: false,
				}));
				return;
			}

			const submitData: ChatSubmitData = {
				channel: state.channel,
				message: trimmedMessage || undefined,
				payload: payloadWithAttachments,
				attachments: state.attachments,
				meta: state.meta,
				noteColor: state.noteColor,
				contacts: normalizedContacts,
				transformed,
			};

			if (onSubmitData) {
				await onSubmitData(submitData);
			} else {
				if (!isChannelName(submitData.channel)) {
					throw new Error("Invalid channel for inbox activity");
				}
				await fallbackMutation.mutateAsync({
					channel: submitData.channel as ChannelName,
					payload: submitData.payload,
					contacts: submitData.contacts,
					message: submitData.message,
					noteColor: submitData.noteColor,
				});
			}

			setState((prev) => ({
				...prev,
				message: "",
				payload: {},
				meta: {},
				attachments: [],
			}));
			onSent?.();
			toast.success("Message sent");
		} catch (error) {
			setState((prev) => ({
				...prev,
				errors: {
					...prev.errors,
					submit:
						error instanceof Error ? error.message : "Failed to send message",
				},
			}));
			toast.error(
				error instanceof Error ? error.message : "Failed to send message",
			);
		} finally {
			setState((prev) => ({ ...prev, isSubmitting: false }));
		}
	}, [
		attachmentName,
		fallbackMutation,
		messageRequired,
		metaFieldConfigs,
		multiAttachmentSupport,
		normalizedContacts,
		onSent,
		onSubmitData,
		payload,
		payloadFieldConfigs,
		state,
		transformSubmitData,
	]);

	const setChannel = useCallback(
		(value: string) => {
			setState((prev) => ({
				...prev,
				channel: value,
				payload: resolveDefaultPayloadValues(defaultPayloads, value),
				attachments: isAttachmentChannelEnabled(
					value,
					attachmentName,
					attachmentChannels,
				)
					? prev.attachments
					: [],
				errors: { ...prev.errors, channel: "" },
			}));
		},
		[attachmentChannels, attachmentName, defaultPayloads],
	);

	const setMessage = useCallback((value: string) => {
		setState((prev) => ({
			...prev,
			message: value,
			errors: { ...prev.errors, message: "" },
		}));
	}, []);

	const setMetaValue = useCallback((name: string, value: string) => {
		setState((prev) => ({
			...prev,
			meta: { ...prev.meta, [name]: value },
			errors: { ...prev.errors, [createErrorKey("meta", name)]: "" },
		}));
	}, []);

	const setPayloadValue = useCallback((name: string, value: string) => {
		setState((prev) => ({
			...prev,
			payload: { ...prev.payload, [name]: value },
			errors: { ...prev.errors, [createErrorKey("payload", name)]: "" },
		}));
	}, []);

	const setMetaFieldConfig = useCallback(
		(name: string, config: OptionFieldConfig) => {
			setMetaFieldConfigs((prev) => {
				const current = prev[name];
				if (
					current?.required === config.required &&
					current?.show === config.show
				) {
					return prev;
				}
				return { ...prev, [name]: config };
			});
		},
		[],
	);

	const setPayloadFieldConfig = useCallback(
		(name: string, config: OptionFieldConfig) => {
			setPayloadFieldConfigs((prev) => {
				const current = prev[name];
				if (
					current?.required === config.required &&
					current?.show === config.show
				) {
					return prev;
				}
				return { ...prev, [name]: config };
			});
		},
		[],
	);

	const setNoteColor = useCallback((value: string) => {
		setState((prev) => ({ ...prev, noteColor: value }));
	}, []);

	const appendAttachments = useCallback(
		(pathnames: string[]) => {
			if (!pathnames.length) return;
			setState((prev) => ({
				...prev,
				attachments: multiAttachmentSupport
					? [...prev.attachments, ...pathnames]
					: [pathnames[0]],
			}));
		},
		[multiAttachmentSupport],
	);

	const removeAttachment = useCallback(async (pathname: string) => {
		try {
			await del(pathname);
		} catch {}

		setState((prev) => ({
			...prev,
			attachments: prev.attachments.filter((value) => value !== pathname),
		}));
	}, []);

	const contextValue = useMemo<ChatContextValue>(
		() => ({
			state,
			setChannel,
			setMessage,
			setMetaValue,
			setPayloadValue,
			setMetaFieldConfig,
			setPayloadFieldConfig,
			setNoteColor,
			submit,
			channelOptions,
			attachmentName,
			attachmentType,
			multiAttachmentSupport,
			attachmentChannels,
			attachmentPath,
			appendAttachments,
			removeAttachment,
		}),
		[
			appendAttachments,
			attachmentChannels,
			attachmentName,
			attachmentPath,
			attachmentType,
			channelOptions,
			multiAttachmentSupport,
			removeAttachment,
			setChannel,
			setMessage,
			setMetaFieldConfig,
			setMetaValue,
			setNoteColor,
			setPayloadFieldConfig,
			setPayloadValue,
			state,
			submit,
		],
	);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await submit();
	}

	return (
		<ChatContext.Provider value={contextValue}>
			<form
				className={cn(
					"space-y-1 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20",
					className,
				)}
				onSubmit={handleSubmit}
			>
				{children}
			</form>
		</ChatContext.Provider>
	);
}

type ChatComponent = ((props: ChatProps) => ReactNode) & {
	Header: typeof ChatHeader;
	Footer: typeof ChatFooter;
	ChannelsOption: typeof ChatChannelsOption;
	Options: typeof ChatOptions;
	MetaOption: typeof ChatMetaOption;
	PayloadOption: typeof ChatPayloadOption;
	Content: typeof ChatContent;
	SendButton: typeof ChatSendButton;
	ColorPicker: typeof ChatColorPicker;
};

export const Chat: ChatComponent = Object.assign(ChatRoot, {
	Header: ChatHeader,
	Footer: ChatFooter,
	ChannelsOption: ChatChannelsOption,
	Options: ChatOptions,
	MetaOption: ChatMetaOption,
	PayloadOption: ChatPayloadOption,
	Content: ChatContent,
	SendButton: ChatSendButton,
	ColorPicker: ChatColorPicker,
});
