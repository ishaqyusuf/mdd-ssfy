import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { Controller } from "react-hook-form";
import { Text, View } from "react-native";
import { NeoCard } from "../ui/neo-card";

export function MissingTaskConfig() {
	const {
		admin,
		form,
		defaultValues,
		params,
		isRequestingTaskConfiguration,
		requestTaskConfiguration,
		openInstallCostStep,
	} = useJobFormV2Context();

	const taskName = (defaultValues as any)?.job?.subtitle || "selected task";
	const projectName = (defaultValues as any)?.job?.title || "this job";
	const selectedBuilderTaskId = (defaultValues as any)?.builderTaskId || null;
	const jobDetails = form.watch("job.description");

	return (
		<NeoCard className="border-border bg-card gap-2">
			<View className="items-center gap-4">
				<View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-muted">
					<Icon name="TriangleAlert" className="text-destructive" size={20} />
				</View>
				<Text className="text-center text-xl font-black text-foreground">
					Task Configuration Missing
				</Text>
				<Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
					{`"${taskName}" for ${projectName} has no configured task quantity yet.`}
				</Text>
			</View>

			<View className="mt-5 gap-2">
				{admin ? (
					<Button
						variant="outline"
						className="rounded-2xl border-border bg-background px-4"
						onPress={() => openInstallCostStep(selectedBuilderTaskId)}
						disabled={!params.modelId}
					>
						<Icon name="Wrench" className="text-foreground" size={16} />
						<Text className="text-foreground">Configure Task</Text>
					</Button>
				) : null}

				{!admin ? (
					<View className="mb-2 gap-2">
						<Text className="text-xs font-bold uppercase tracking-[1px] text-foreground">
							Add Job Details
						</Text>
						<Controller
							control={form.control}
							name="job.description"
							render={({ field: { onChange, value } }) => (
								<Textarea
									value={value || ""}
									onChangeText={onChange}
									placeholder="Describe the work needed, measurements, special instructions, or anything admin should know before configuring this install task."
									className="min-h-28 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
								/>
							)}
						/>
						<Text className="text-xs leading-4 text-muted-foreground">
							Add a quick job summary so the install task can be configured
							correctly.
						</Text>
					</View>
				) : null}

				<Button
					onPress={requestTaskConfiguration}
					className="rounded-2xl h-12 gap-4 bg-primary"
					disabled={
						isRequestingTaskConfiguration || (!admin && !jobDetails?.trim())
					}
				>
					<Icon name="Mail" className="text-primary-foreground" size={16} />
					<Text className="text-primary-foreground">
						{isRequestingTaskConfiguration
							? "Requesting..."
							: "Request Configuration & Save Draft"}
					</Text>
				</Button>
			</View>

			<View className="mt-4 rounded-xl border border-border bg-muted p-3">
				<Text className="text-[11px] leading-4 text-muted-foreground">
					{admin
						? "Configure Task opens the next configuration step for this model. Request Configuration saves draft and sends a review request email."
						: "This saves the draft and sends a configuration request email to Admin."}
				</Text>
			</View>
		</NeoCard>
	);
}
