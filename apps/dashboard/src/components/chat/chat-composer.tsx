"use client";

import { FileUpload } from "@/components/file-upload";
import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
} from "@gnd/ui/attachment";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Field, FieldGroup } from "@gnd/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@gnd/ui/input-group";
import {
	ArrowUp,
	FileText,
	Hash,
	ImageIcon,
	LoaderCircle,
	Plus,
	X,
} from "lucide-react";
import { getAttachmentAccept, useChat } from "./chat";

const noteColors = [
	{ label: "Black", value: "#000000" },
	{ label: "Blue", value: "#00A9FE" },
	{ label: "Green", value: "#00D084" },
	{ label: "Orange", value: "#FF6900" },
	{ label: "Red", value: "#EB144C" },
	{ label: "Purple", value: "#8A2BE2" },
];

export function ChatComposer({
	placeholder = "Write a note...",
	sendLabel = "Send note",
}: {
	placeholder?: string;
	sendLabel?: string;
}) {
	const chat = useChat();
	const { state, attachmentName, attachmentChannels, multiAttachmentSupport } =
		chat;
	const attachmentType = chat.attachmentType ?? "image";
	const attachmentsEnabled =
		Boolean(attachmentName) &&
		(!attachmentChannels?.length || attachmentChannels.includes(state.channel));
	const canAddAttachments =
		attachmentsEnabled &&
		(multiAttachmentSupport || state.attachments.length === 0);
	const hasContent = Boolean(state.message.trim() || state.attachments.length);
	const selectedChannel = chat.channelOptions.find(
		(option) => option.value === state.channel,
	);
	const defaultChannel =
		chat.channelOptions.find((option) => option.value === "sales_info") ??
		chat.channelOptions[0];
	const selectedColor = noteColors.find(
		(color) => color.value === state.noteColor,
	);
	const channelLabel = selectedChannel?.label ?? state.channel;
	const colorLabel = selectedColor?.label ?? "Custom color";

	return (
		<FileUpload
			path={chat.attachmentPath ?? "inbound-documents"}
			accept={getAttachmentAccept(attachmentType)}
			maxFiles={multiAttachmentSupport ? 25 : 1}
			disabled={!canAddAttachments || state.isSubmitting}
			onUploadComplete={(results) =>
				chat.appendAttachments(results.map((result) => result.pathname))
			}
		>
			{({ open, isUploading }) => (
				<FieldGroup>
					<Field>
						<InputGroup>
							<InputGroupTextarea
								aria-label="Activity note"
								placeholder={placeholder}
								value={state.message}
								onChange={(event) => chat.setMessage(event.target.value)}
								rows={2}
								className="max-h-48 min-h-20"
								aria-invalid={Boolean(state.errors.message)}
								disabled={state.isSubmitting}
								onKeyDown={(event) => {
									if (
										event.key === "Enter" &&
										!event.shiftKey &&
										!event.nativeEvent.isComposing
									) {
										event.preventDefault();
										if (hasContent && !isUploading && !state.isSubmitting)
											void chat.submit();
									}
								}}
							/>
							{state.attachments.length ? (
								<InputGroupAddon align="block-start">
									<AttachmentGroup className="max-h-32 w-full overflow-y-auto">
										{state.attachments.map((pathname) => {
											const name = pathname.split("/").pop() ?? pathname;
											return (
												<Attachment key={pathname} size="sm">
													<AttachmentMedia>
														{pathname.toLowerCase().endsWith(".pdf") ? (
															<FileText />
														) : (
															<ImageIcon />
														)}
													</AttachmentMedia>
													<AttachmentContent>
														<AttachmentTitle>{name}</AttachmentTitle>
													</AttachmentContent>
													<AttachmentActions>
														<AttachmentAction
															type="button"
															aria-label={`Remove ${name}`}
															disabled={state.isSubmitting || isUploading}
															onClick={() =>
																void chat.removeAttachment(pathname)
															}
														>
															<X />
														</AttachmentAction>
													</AttachmentActions>
												</Attachment>
											);
										})}
									</AttachmentGroup>
								</InputGroupAddon>
							) : null}
							<InputGroupAddon align="block-end">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<InputGroupButton
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label="Add to activity"
											disabled={state.isSubmitting || isUploading}
										>
											{isUploading ? (
												<LoaderCircle className="animate-spin" />
											) : (
												<Plus />
											)}
										</InputGroupButton>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="start"
										side="top"
										className="w-60"
									>
										<DropdownMenuItem
											onSelect={open}
											disabled={!canAddAttachments}
											className="gap-2"
										>
											<ImageIcon className="size-4" aria-hidden="true" />
											{attachmentType === "image"
												? "Attach image"
												: "Attach image or PDF"}
										</DropdownMenuItem>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger className="gap-2">
												<Hash className="size-4" aria-hidden="true" />
												Channel
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent>
												<DropdownMenuRadioGroup
													value={state.channel}
													onValueChange={chat.setChannel}
												>
													{chat.channelOptions.map((option) => (
														<DropdownMenuRadioItem
															key={option.value}
															value={option.value}
														>
															{option.label}
														</DropdownMenuRadioItem>
													))}
												</DropdownMenuRadioGroup>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger className="gap-2">
												<FileText className="size-4" aria-hidden="true" />
												Note color
												<span
													className="ml-auto size-3 rounded-full border"
													style={{ backgroundColor: state.noteColor }}
												/>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent>
												<DropdownMenuRadioGroup
													value={state.noteColor}
													onValueChange={chat.setNoteColor}
												>
													{noteColors.map((color) => (
														<DropdownMenuRadioItem
															key={color.value}
															value={color.value}
															className="gap-2"
														>
															<span
																className="size-3 rounded-full border"
																style={{ backgroundColor: color.value }}
															/>
															{color.label}
														</DropdownMenuRadioItem>
													))}
												</DropdownMenuRadioGroup>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
									</DropdownMenuContent>
								</DropdownMenu>
								<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
									<InputGroupButton
										type="button"
										variant="ghost"
										size="xs"
										className="group min-w-0 max-w-full gap-1 rounded-md text-xs font-normal"
										aria-label={`Remove ${channelLabel} channel`}
										title={`Reset channel to ${defaultChannel?.label ?? "Sales Info"}`}
										disabled={state.isSubmitting || isUploading}
										onClick={() =>
											chat.setChannel(defaultChannel?.value ?? "sales_info")
										}
									>
										<Hash
											className="size-3.5 shrink-0 group-hover:hidden group-focus-visible:hidden"
											aria-hidden="true"
										/>
										<X
											className="hidden size-3.5 shrink-0 group-hover:block group-focus-visible:block"
											aria-hidden="true"
										/>
										<span className="truncate">{channelLabel}</span>
									</InputGroupButton>
									<InputGroupButton
										type="button"
										variant="ghost"
										size="xs"
										className="group gap-1 rounded-md text-xs font-normal"
										aria-label={`Remove ${colorLabel} color`}
										title="Reset color to Black"
										disabled={state.isSubmitting || isUploading}
										onClick={() => chat.setNoteColor("#000000")}
									>
										<span
											className="size-3 shrink-0 rounded-full border group-hover:hidden group-focus-visible:hidden"
											style={{ backgroundColor: state.noteColor }}
											aria-hidden="true"
										/>
										<X
											className="hidden size-3.5 shrink-0 group-hover:block group-focus-visible:block"
											aria-hidden="true"
										/>
										{colorLabel}
									</InputGroupButton>
								</div>
								{isUploading ? <output>Attaching files…</output> : null}
								<InputGroupButton
									type="submit"
									variant="default"
									size="icon-sm"
									className="ml-auto"
									disabled={!hasContent || state.isSubmitting || isUploading}
									aria-label={state.isSubmitting ? "Sending..." : sendLabel}
								>
									{state.isSubmitting ? (
										<LoaderCircle className="animate-spin" />
									) : (
										<ArrowUp />
									)}
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						{Object.entries(state.errors).map(([key, error]) =>
							error ? (
								<p key={key} role="alert" className="text-xs text-destructive">
									{error}
								</p>
							) : null,
						)}
					</Field>
				</FieldGroup>
			)}
		</FileUpload>
	);
}
