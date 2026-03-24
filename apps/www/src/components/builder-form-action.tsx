import { useBuilderParams } from "@/hooks/use-builder-params";
import { useTRPC } from "@/trpc/client";
import type { BuilderFormSchema } from "@community/schema";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { _qc } from "./static-trpc";

export function BuilderFormAction() {
	const form = useFormContext<BuilderFormSchema>();
	const { setParams, openBuilderId, onClose } = useBuilderParams();
	const trpc = useTRPC();
	const { mutate: saveBuilder, isPending } = useMutation(
		trpc.community.saveBuilder.mutationOptions({
			onSuccess(data, variables, onMutateResult, context) {
				if (variables) {
					const builderId = Number(variables.id || data.id || 0);
					_qc.invalidateQueries({
						queryKey: trpc.community.getBuilderForm.queryKey({
							builderId,
						}),
					});
					if (openBuilderId < 0 || !openBuilderId) {
						setParams({ openBuilderId: data.id });
						return;
					}
				}
				onClose();
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);
	return (
		<div>
			<SubmitButton
				isSubmitting={isPending}
				type="button"
				onClick={form.handleSubmit(
					(data) => {
						saveBuilder(data);
					},
					(e) => {
						console.log("Form errors:", e);
					},
				)}
			>
				Save Form
			</SubmitButton>
		</div>
	);
}
