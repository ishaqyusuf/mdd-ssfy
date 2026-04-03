import { BackBtn } from "@/components/back-btn";
import { InsuranceStatusAlert } from "@/components/insurance/insurance-status-alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTRPC } from "@/trpc/client";
import {
	INSURANCE_DOCUMENT_TITLES,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Linking, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

function formatDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

const uploadTitleOptions = [...INSURANCE_DOCUMENT_TITLES] as string[];

export default function DocumentsScreen() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [showUploadForm, setShowUploadForm] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<{
		base64: string;
		fileName: string;
		mimeType?: string;
		uri: string;
	} | null>(null);
	const [title, setTitle] = useState(uploadTitleOptions[0] || "Insurance");
	const [expiresAt, setExpiresAt] = useState("");
	const {
		data: profile,
		isPending,
		refetch,
		isRefetching,
	} = useQuery(trpc.user.getProfile.queryOptions());
	const documents = profile?.documents || [];
	const insuranceStatus = profile ? getInsuranceRequirement(documents) : null;

	const uploadAssetMutation = useMutation(
		trpc.user.uploadDocumentAsset.mutationOptions(),
	);
	const saveDocumentMutation = useMutation(
		trpc.user.saveDocument.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					refetch(),
					queryClient.invalidateQueries({
						queryKey: trpc.user.getProfile.queryKey(),
					}),
				]);
				resetUploadForm();
				Toast.show({
					type: "success",
					text1: "Document uploaded",
					text2: "Your document is now pending review.",
				});
			},
			onError: (error) => {
				Toast.show({
					type: "error",
					text1: "Upload failed",
					text2: error.message || "Unable to save document.",
				});
			},
		}),
	);

	const isUploading =
		uploadAssetMutation.isPending || saveDocumentMutation.isPending;

	const selectedFileLabel = useMemo(() => {
		if (!selectedAsset) return "No file selected";
		return (
			selectedAsset.fileName || selectedAsset.uri.split("/").pop() || "Image"
		);
	}, [selectedAsset]);

	function resetUploadForm() {
		setShowUploadForm(false);
		setSelectedAsset(null);
		setTitle(uploadTitleOptions[0] || "Insurance");
		setExpiresAt("");
	}

	async function pickDocumentImage() {
		if (isUploading) return;
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.8,
			allowsEditing: false,
			base64: true,
		});

		if (result.canceled) return;
		const asset = result.assets[0];
		if (!asset?.base64) {
			Toast.show({
				type: "error",
				text1: "Unable to read file",
				text2: "Please choose another image and try again.",
			});
			return;
		}

		setSelectedAsset({
			base64: asset.base64,
			fileName:
				asset.fileName ||
				`employee-document-${Date.now()}.${asset.uri.split(".").pop() || "jpg"}`,
			mimeType: asset.mimeType || "image/jpeg",
			uri: asset.uri,
		});
	}

	async function handleUpload() {
		if (!selectedAsset) {
			Toast.show({
				type: "error",
				text1: "No file selected",
				text2: "Pick an image before uploading.",
			});
			return;
		}

		try {
			const uploaded = await uploadAssetMutation.mutateAsync({
				filename: selectedAsset.fileName,
				contentType: selectedAsset.mimeType,
				content: selectedAsset.base64,
			});

			await saveDocumentMutation.mutateAsync({
				title,
				url: uploaded.url,
				expiresAt: expiresAt.trim() || undefined,
				description: "Uploaded from mobile documents screen.",
			});
		} catch (error) {
			if (error instanceof Error) {
				Toast.show({
					type: "error",
					text1: "Upload failed",
					text2: error.message,
				});
				return;
			}

			Toast.show({
				type: "error",
				text1: "Upload failed",
				text2: "Something went wrong while uploading your document.",
			});
		}
	}

	return (
		<View className="flex-1 bg-background">
			<View className="border-b border-border bg-background px-4 pb-4 pt-14">
				<View className="flex-row items-center justify-between">
					<BackBtn />
					<Text className="text-lg font-bold text-foreground">Documents</Text>
					<View className="h-10 w-10" />
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 64 }}
			>
				<View className="gap-4 p-4">
					{insuranceStatus ? (
						<InsuranceStatusAlert status={insuranceStatus} showWhenValid />
					) : null}

					<View className="rounded-2xl border border-border bg-card p-4">
						<Text className="text-base font-semibold text-foreground">
							Insurance documents
						</Text>
						<Text className="mt-1 text-sm text-muted-foreground">
							Review the latest insurance and workers comp documents tied to
							your account.
						</Text>

						<View className="mt-4 flex-row gap-3">
							<Button
								variant="outline"
								onPress={() => refetch()}
								disabled={isPending || isRefetching || isUploading}
								className="flex-1 rounded-xl"
							>
								<Text>
									{isPending || isRefetching ? "Refreshing..." : "Refresh"}
								</Text>
							</Button>
							<Button
								onPress={() => setShowUploadForm((prev) => !prev)}
								disabled={isUploading}
								className="flex-1 rounded-xl"
							>
								<Text>{showUploadForm ? "Close upload" : "Upload image"}</Text>
							</Button>
						</View>
					</View>

					{showUploadForm ? (
						<View className="rounded-2xl border border-border bg-card p-4">
							<Text className="text-base font-semibold text-foreground">
								Upload document
							</Text>
							<Text className="mt-1 text-sm text-muted-foreground">
								Upload an image of your insurance or workers comp document. PDF
								upload is not available on mobile yet.
							</Text>

							<View className="mt-4 gap-3">
								<View className="gap-2">
									<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
										Document type
									</Text>
									<View className="flex-row gap-2">
										{uploadTitleOptions.map((option) => {
											const isActive = title === option;
											return (
												<Button
													key={option}
													variant={isActive ? "default" : "outline"}
													size="sm"
													onPress={() => setTitle(option)}
													className="rounded-full"
												>
													<Text>{option}</Text>
												</Button>
											);
										})}
									</View>
								</View>

								<View className="gap-2">
									<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
										Expiry date
									</Text>
									<TextInput
										value={expiresAt}
										onChangeText={setExpiresAt}
										editable={!isUploading}
										placeholder="YYYY-MM-DD"
										placeholderTextColor="#9CA3AF"
										className="rounded-xl border border-border bg-background px-3 py-3 text-foreground"
									/>
								</View>

								<View className="rounded-xl border border-dashed border-border bg-background p-4">
									<View className="flex-row items-center gap-3">
										<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
											<Icon
												name="FileText"
												className="text-primary"
												size={18}
											/>
										</View>
										<View className="flex-1">
											<Text className="text-sm font-semibold text-foreground">
												{selectedFileLabel}
											</Text>
											<Text className="text-xs text-muted-foreground">
												Pick a photo from your gallery
											</Text>
										</View>
									</View>

									<View className="mt-3 flex-row gap-3">
										<Button
											variant="outline"
											onPress={pickDocumentImage}
											disabled={isUploading}
											className="flex-1 rounded-xl"
										>
											<Text>
												{selectedAsset ? "Replace image" : "Choose image"}
											</Text>
										</Button>
										<Button
											onPress={handleUpload}
											disabled={!selectedAsset || isUploading}
											className="flex-1 rounded-xl"
										>
											<Text>{isUploading ? "Uploading..." : "Submit"}</Text>
										</Button>
									</View>
								</View>
							</View>
						</View>
					) : null}

					{!documents.length ? (
						<View className="rounded-2xl border border-dashed border-border bg-card p-5">
							<Text className="text-base font-semibold text-foreground">
								No documents found
							</Text>
							<Text className="mt-1 text-sm text-muted-foreground">
								Your uploaded insurance documents will appear here after they
								sync to your account.
							</Text>
						</View>
					) : null}

					{documents.map((document) => {
						const createdAt = formatDate(document.createdAt);
						const expiresAt = formatDate(document.expiresAt);
						const status = document.status
							? `${document.status.charAt(0).toUpperCase()}${document.status.slice(1)}`
							: "Pending";

						return (
							<View
								key={document.id}
								className="rounded-2xl border border-border bg-card p-4"
							>
								<View className="flex-row items-start gap-3">
									<View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
										<Icon name="FileText" className="text-primary" size={18} />
									</View>
									<View className="flex-1 gap-2">
										<View>
											<Text className="text-base font-semibold text-foreground">
												{document.title || "Document"}
											</Text>
											<Text className="text-xs uppercase tracking-wide text-muted-foreground">
												{status}
											</Text>
										</View>

										{document.description ? (
											<Text className="text-sm text-muted-foreground">
												{document.description}
											</Text>
										) : null}

										<View className="gap-1">
											{createdAt ? (
												<Text className="text-xs text-muted-foreground">
													Uploaded: {createdAt}
												</Text>
											) : null}
											{expiresAt ? (
												<Text className="text-xs text-muted-foreground">
													Expires: {expiresAt}
												</Text>
											) : null}
										</View>

										<Button
											variant="outline"
											size="sm"
											className="mt-1 self-start rounded-xl"
											onPress={() => Linking.openURL(document.url)}
										>
											<Text>Open document</Text>
										</Button>
									</View>
								</View>
							</View>
						);
					})}
				</View>
			</ScrollView>
		</View>
	);
}
