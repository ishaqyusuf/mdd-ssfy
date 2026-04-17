"use client";

import Btn from "@/components/_v1/btn";
import { InstallCostBtn } from "@/components/install-cost-btn";
import { ModelTemplateSetting } from "@/components/model-template-setting";
import { _qc, _trpc } from "@/components/static-trpc";
import { useAuth } from "@/hooks/use-auth";
import { openLink } from "@/lib/open-link";
import { useCommunityModelStore } from "@/store/community-model";
import { extractCommunityFormValueData } from "@community/utils/template-form";
import { Button, buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { useMutation } from "@gnd/ui/tanstack";
import { isCommunityUnitRestrictedAccess } from "@gnd/utils/constants";
import Link from "next/link";
import { useTemplateSchemaContext } from "./context";

export function FormHeader() {
	const store = useCommunityModelStore();
	const ctx = useTemplateSchemaContext();
	const auth = useAuth();
	const isCommunityUnit = isCommunityUnitRestrictedAccess(auth.can);
	const templateId = ctx.communityTemplate?.id;
	if (!templateId) return null;

	const { isPending, mutate } = useMutation(
		_trpc.community.saveCommunityModel.mutationOptions({
			meta: {
				toastTitle: {
					error: "Something went wrong",
					loading: "Saving...",
					success: "Success",
				},
			},
			onSuccess(data, variables, context) {
				_qc.invalidateQueries({
					queryKey: _trpc.print.modelTemplate.queryKey({}),
				});
			},
		}),
	);

	const onSubmit = () => {
		const data = extractCommunityFormValueData(Object.values(store.blocks));
		mutate({
			...data,
			modelId: templateId,
			authorName: auth?.name,
		});
	};

	return (
		<div className="flex gap-4 justify-end">
			<div className="flex-1" />
			<Button
				onClick={(e) => {
					openLink(
						"p/model-template",
						{
							preview: true,
							// slugs: [item.id].join(","),
							// slugs: "",
							version: "v2",
							templateSlug: ctx?.modelSlug,
						},
						true,
					);
				}}
			>
				Previews
			</Button>
			<Link
				className={cn(
					buttonVariants({
						variant: "destructive",
					}),
				)}
				href={`/community/community-template/${ctx?.modelSlug}/v1`}
			>
				V1
			</Link>
			{isCommunityUnit ? null : <InstallCostBtn id={templateId} />}
			<ModelTemplateSetting
				id={templateId}
				pivotModelCostId={ctx?.communityTemplate?.pivotModelCostId}
				defaultValues={{
					version: ctx?.communityTemplate?.version,
				}}
				slug={ctx?.modelSlug}
			/>
			<Btn onClick={onSubmit} isLoading={isPending} type="button">
				Save
			</Btn>
		</div>
	);
}
