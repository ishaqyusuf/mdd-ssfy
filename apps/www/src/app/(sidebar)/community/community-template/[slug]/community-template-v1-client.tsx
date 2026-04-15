"use client";

import dynamic from "next/dynamic";
import { Skeletons } from "@gnd/ui/custom/skeletons";

const CommunityTemplateV1Form = dynamic(
	() =>
		import("@/components/forms/community-template-v1").then(
			(mod) => mod.CommunityTemplateV1Form,
		),
	{
		loading: () => <Skeletons.Dashboard />,
	},
);

type Props = {
	slug: string;
};

export function CommunityTemplateV1Client({ slug }: Props) {
	return <CommunityTemplateV1Form slug={slug} />;
}
