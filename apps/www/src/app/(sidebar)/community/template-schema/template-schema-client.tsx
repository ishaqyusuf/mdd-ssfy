"use client";

import dynamic from "next/dynamic";
import Portal from "@gnd/ui/custom/portal";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { NewBlockAction } from "@/components/forms/community-template/new-block-action";

const CommunityTemplateForm = dynamic(
	() =>
		import("@/components/forms/community-template/community-template-form").then(
			(mod) => mod.CommunityTemplateForm,
		),
	{
		loading: () => <Skeletons.Dashboard />,
	},
);

export function TemplateSchemaClient() {
	return (
		<CommunityTemplateForm>
			<Portal nodeId="blockAction">
				<NewBlockAction />
			</Portal>
		</CommunityTemplateForm>
	);
}
