"use client";

import dynamic from "next/dynamic";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { FormHeader } from "@/components/forms/community-template/form-header";

const CommunityTemplateForm = dynamic(
	() =>
		import("@/components/forms/community-template/community-template-form").then(
			(mod) => mod.CommunityTemplateForm,
		),
	{
		loading: () => <Skeletons.Dashboard />,
	},
);

type Props = {
	modelSlug: string;
};

export function ModelTemplateClient({ modelSlug }: Props) {
	return (
		<CommunityTemplateForm modelSlug={modelSlug}>
			<FormHeader />
		</CommunityTemplateForm>
	);
}
