import { Icon } from "@/components/ui/icon";
import { Toast } from "@/components/ui/toast";
import {
	type UploadImageMimeType,
	resolveUploadImageMimeType,
} from "@/lib/upload-image-mime";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	type GestureResponderEvent,
	Image,
	PanResponder,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useDispatchProofDraft } from "../hooks/use-dispatch-proof-draft";

export type DispatchCompleteInput = {
	requestId: string;
	expectedManifestRevision: string;
	receivedBy?: string;
	note?: string;
	signaturePath: string;
	attachments?: {
		clientId: string;
		fileName: string;
		contentType: UploadImageMimeType;
		base64: string;
		uri: string;
	}[];
};

type Props = {
	userId: number;
	dispatchId: number;
	manifestRevision: string;
	defaultNoteType?: "dispatch" | "pickup";
	defaultReceivedBy?: string;
	isSubmitting?: boolean;
	onCancel: () => void;
	onSubmit: (input: DispatchCompleteInput) => Promise<void> | void;
};

export function DispatchCompleteForm({
	userId,
	dispatchId,
	manifestRevision,
	defaultNoteType = "dispatch",
	defaultReceivedBy,
	isSubmitting,
	onCancel,
	onSubmit,
}: Props) {
	const proof = useDispatchProofDraft({
		userId,
		dispatchId,
		defaultReceivedBy,
		manifestRevision,
	});
	const {
		draft,
		update,
		addAttachments,
		removeAttachment,
		buildAttachments,
		clear,
	} = proof;
	const pathRef = useRef("");

	useEffect(() => {
		if (!draft.receivedBy && defaultReceivedBy) {
			update({ receivedBy: defaultReceivedBy });
		}
	}, [defaultReceivedBy, draft.receivedBy, update]);

	useEffect(() => {
		pathRef.current = draft.signaturePath;
	}, [draft.signaturePath]);

	const appendSignaturePoint = useCallback(
		(evt: GestureResponderEvent) => {
			const { locationX, locationY } = evt.nativeEvent;
			if (!pathRef.current) {
				pathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
			} else {
				pathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
			}
			update({ signaturePath: pathRef.current });
		},
		[update],
	);

	const clearSignature = () => {
		pathRef.current = "";
		update({ signaturePath: "" });
	};

	const signaturePanResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponder: () => true,
				onPanResponderGrant: appendSignaturePoint,
				onPanResponderMove: appendSignaturePoint,
			}),
		[appendSignaturePoint],
	);

	const hasSignature = draft.signaturePath.trim().length > 0;

	const pickAttachments = async () => {
		if (isSubmitting) return;
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.65,
			allowsMultipleSelection: true,
			base64: false,
		});
		if (result.canceled) return;
		const remaining = Math.max(0, 5 - draft.attachments.length);
		let unsupported = 0;
		const next = result.assets.slice(0, remaining).flatMap((asset, index) => {
			const fileName =
				asset.fileName ||
				`dispatch-attachment-${Date.now()}-${index}.${asset.uri.split(".").pop() || "jpg"}`;
			const contentType = resolveUploadImageMimeType(asset.mimeType, fileName);
			if (!contentType) {
				unsupported += 1;
				return [];
			}
			return [
				{
					clientId: `photo-${Date.now()}-${index}`,
					fileName,
					contentType,
					uri: asset.uri,
				},
			];
		});
		try {
			await addAttachments(next);
			if (unsupported) {
				Toast.show(
					`${unsupported} unsupported photo${unsupported === 1 ? " was" : "s were"} skipped.`,
					{
						type: "warning",
					},
				);
			}
		} catch (error) {
			Toast.show(
				error instanceof Error ? error.message : "Unable to attach photo.",
				{
					type: "error",
				},
			);
		}
	};

	const submitProof = async () => {
		if (draft.manifestRevision !== manifestRevision) {
			Toast.show(
				"This dispatch changed after the proof draft was created. Refresh and review it before completing.",
				{ type: "warning" },
			);
			return;
		}
		update({ attemptState: "submitting" });
		try {
			const attachments = await buildAttachments();
			await onSubmit({
				requestId: draft.requestId,
				expectedManifestRevision: draft.manifestRevision,
				receivedBy: draft.receivedBy || undefined,
				note: draft.note || undefined,
				signaturePath: draft.signaturePath,
				attachments,
			});
			await clear();
		} catch (error) {
			update({ attemptState: "retryable_failure" });
			throw error;
		}
	};

	const cancelProof = () => {
		const hasDraftContent = Boolean(
			draft.signaturePath ||
				draft.note.trim() ||
				draft.attachments.length ||
				draft.receivedBy !== (defaultReceivedBy || ""),
		);
		if (!hasDraftContent) {
			onCancel();
			return;
		}
		Alert.alert(
			"Keep proof draft?",
			"Keep it on this device to continue later, or discard it and its photos.",
			[
				{ text: "Continue editing", style: "cancel" },
				{ text: "Keep draft", onPress: onCancel },
				{
					text: "Discard",
					style: "destructive",
					onPress: () => void clear().then(onCancel),
				},
			],
		);
	};

	return (
		<View className="pb-4">
			<View className="mb-5">
				<Text className="text-xl font-bold text-foreground">
					Complete Dispatch
				</Text>
				<Text className="mt-1 text-sm text-muted-foreground">
					Confirm recipient details and acknowledgement.
				</Text>
			</View>

			<View className="gap-4">
				<View>
					<Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
						Recipient
					</Text>
					<View className="rounded-xl border border-input bg-background px-3 py-2.5">
						<View className="flex-row items-center gap-2">
							<Icon name="User" className="size-14 text-muted-foreground" />
							<TextInput
								value={draft.receivedBy}
								onChangeText={(receivedBy) => update({ receivedBy })}
								editable={!isSubmitting}
								placeholder="Received By"
								className="flex-1 text-foreground"
							/>
						</View>
					</View>
				</View>

				<View>
					<Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
						Completion Type
					</Text>
					<View className="flex-row gap-2">
						{(["dispatch", "pickup"] as const).map((option) => {
							const active = defaultNoteType === option;
							return (
								<Pressable
									key={option}
									disabled
									className={`flex-1 rounded-xl border px-3 py-3 ${
										active
											? "border-primary bg-primary/10"
											: "border-input bg-background"
									}`}
								>
									<Text
										className={`text-center text-sm font-semibold ${
											active ? "text-primary" : "text-foreground"
										}`}
									>
										{option === "dispatch" ? "Dispatch" : "Pickup"}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>

				<View>
					<Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
						Note
					</Text>
					<View className="rounded-xl border border-input bg-background px-3 py-2.5">
						<View className="flex-row items-center gap-2">
							<Icon
								name="FilePenLine"
								className="size-14 text-muted-foreground"
							/>
							<TextInput
								value={draft.note}
								onChangeText={(note) => update({ note })}
								editable={!isSubmitting}
								placeholder="Note (optional)"
								className="flex-1 text-foreground"
							/>
						</View>
					</View>
				</View>

				<View className="rounded-xl border border-input bg-background p-3.5">
					<View className="mb-2 flex-row items-center justify-between">
						<View className="flex-row items-center gap-2">
							<Icon name="Pencil" className="size-14 text-muted-foreground" />
							<Text className="text-sm font-medium text-foreground">
								Signature
							</Text>
						</View>
						<Pressable
							disabled={isSubmitting || !hasSignature}
							onPress={clearSignature}
							className="rounded-full border border-border px-3 py-1 active:opacity-80 disabled:opacity-40"
						>
							<Text className="text-xs font-semibold text-foreground">
								Clear
							</Text>
						</Pressable>
					</View>
					<View
						{...signaturePanResponder.panHandlers}
						className="h-36 rounded-lg border border-dashed border-border bg-card"
					>
						<Svg className="h-full w-full">
							<Path
								d={draft.signaturePath}
								stroke="#111827"
								strokeWidth={2}
								fill="none"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</Svg>
					</View>
					<View className="mt-2 flex-row items-center justify-between">
						<Text className="text-xs text-muted-foreground">
							Sign inside the box.
						</Text>
						{!hasSignature && (
							<Text className="text-xs font-semibold text-destructive">
								Signature required
							</Text>
						)}
					</View>
				</View>

				<View className="rounded-xl border border-input bg-background p-3.5">
					<View className="mb-2 flex-row items-center justify-between">
						<View className="flex-row items-center gap-2">
							<Icon name="Camera" className="size-14 text-muted-foreground" />
							<Text className="text-sm font-medium text-foreground">
								Attach Photos (Optional)
							</Text>
						</View>
						<Pressable
							disabled={isSubmitting}
							onPress={pickAttachments}
							className="rounded-full border border-border px-3 py-1 active:opacity-80 disabled:opacity-40"
						>
							<Text className="text-xs font-semibold text-foreground">
								Add Photos
							</Text>
						</Pressable>
					</View>

					{draft.attachments.length ? (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerClassName="gap-2 pb-1"
						>
							{draft.attachments.map((file) => (
								<View key={`${file.uri}-${file.fileName}`} className="relative">
									<Image
										source={{ uri: file.uri }}
										style={{ width: 72, height: 72, borderRadius: 10 }}
									/>
									<Pressable
										disabled={isSubmitting}
										onPress={() => void removeAttachment(file.uri)}
										className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-destructive"
									>
										<Text className="text-[10px] font-bold text-destructive-foreground">
											x
										</Text>
									</Pressable>
								</View>
							))}
						</ScrollView>
					) : (
						<Text className="text-xs text-muted-foreground">
							No photos attached.
						</Text>
					)}
				</View>
			</View>

			<View className="mt-5 flex-row gap-3">
				<Pressable
					disabled={isSubmitting}
					onPress={cancelProof}
					className="h-11 flex-1 items-center justify-center rounded-xl border border-border px-4 active:opacity-80 disabled:opacity-50"
				>
					<Text className="text-sm font-semibold text-foreground">Cancel</Text>
				</Pressable>
				<Pressable
					disabled={isSubmitting || !hasSignature || !proof.isHydrated}
					onPress={() => void submitProof().catch(() => undefined)}
					className="h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 active:opacity-80 disabled:opacity-40"
				>
					<Text className="text-sm font-semibold text-primary-foreground">
						{isSubmitting ? "Submitting..." : "Complete Dispatch"}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
