import { useBuilderParams } from "@/hooks/use-builder-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { BuilderForm } from "../builder-form";
import { BuilderFormAction } from "../builder-form-action";
import { CustomModal } from "./custom-modal";

export function BuilderFormModal() {
	const { opened, openBuilderId, onClose } = useBuilderParams();
	const safeBuilderId = Number(openBuilderId || 0);
	// const opened = createModelCost;
	const { data: formData } = useQuery(
		useTRPC().community.getBuilderForm.queryOptions(
			{
				builderId: safeBuilderId,
			},
			{
				enabled: opened && safeBuilderId > 0,
			},
		),
	);
	return (
		<CustomModal
			size="3xl"
			title={safeBuilderId > 0 ? "Edit Builder" : "New Builder"}
			description={"Define builder details and standard task templates"}
			open={opened}
			onOpenChange={(open) => {
				if (open) return;
				onClose();
			}}
		>
			<CustomModal.Content className="bg-muted/10 py-2 pb-16">
				<BuilderForm defaultValues={formData}>
					<CustomModal.Footer className="justify-end border-t border-border bg-background/95 pt-4">
						<BuilderFormAction />
					</CustomModal.Footer>
				</BuilderForm>
			</CustomModal.Content>
		</CustomModal>
	);
}
