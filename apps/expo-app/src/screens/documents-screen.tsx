import { BackBtn } from "@/components/back-btn";
import { InsuranceStatusAlert } from "@/components/insurance/insurance-status-alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Linking, ScrollView, Text, View } from "react-native";
import { getInsuranceRequirement } from "@gnd/utils/insurance-documents";

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

export default function DocumentsScreen() {
	const trpc = useTRPC();
	const {
		data: profile,
		isPending,
		refetch,
		isRefetching,
	} = useQuery(trpc.user.getProfile.queryOptions());
	const documents = profile?.documents || [];
	const insuranceStatus = profile ? getInsuranceRequirement(documents) : null;

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

						<View className="mt-4">
							<Button
								variant="outline"
								onPress={() => refetch()}
								disabled={isPending || isRefetching}
								className="rounded-xl"
							>
								<Text>
									{isPending || isRefetching ? "Refreshing..." : "Refresh"}
								</Text>
							</Button>
						</View>
					</View>

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
