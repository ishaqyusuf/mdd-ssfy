"use client";

import { InstallCostBtn } from "@/components/install-cost-btn";
import { ModelTemplateSetting } from "@/components/model-template-setting";
import { openLink } from "@/lib/open-link";
import { Button, buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { PageTitle } from "@gnd/ui/custom/page-title";
import Portal from "@gnd/ui/custom/portal";
import { Icons } from "@gnd/ui/icons";
import { SubmitButton } from "@gnd/ui/submit-button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCommunityTemplateV1 } from "./context";

export function V1FormHeader() {
	const { templateData, isSaving, save } = useCommunityTemplateV1();
	const router = useRouter();

	return (
		<div className="space-y-2">
			<PageTitle>{templateData?.modelName}</PageTitle>
			<Portal noDelay nodeId={"goBackSlot"}>
				<button
					type="button"
					className={cn(
						buttonVariants({
							size: "xs",
							variant: "secondary",
							className: "rounded-full",
						}),
					)}
					onClick={() => {
						router.back();
					}}
				>
					<Icons.ChevronLeft className="size-4" />
				</button>
			</Portal>
			<div className="flex flex-wrap gap-2 justify-end">
				<div className="flex-1" />
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						openLink(
							"p/model-template",
							{
								version: "v1",
								preview: true,
								templateSlug: templateData?.slug,
							},
							true,
						);
					}}
				>
					<Icons.Eye className="size-4" />
					Preview
				</Button>
				<Link
					className={cn(
						buttonVariants({
							variant: "outline",
							size: "sm",
						}),
					)}
					href={`/community/model-template/${templateData?.slug}`}
				>
					V2
				</Link>
				<InstallCostBtn templateEditMode id={templateData?.id!} />
				<ModelTemplateSetting
					id={templateData?.id!}
					pivotModelCostId={templateData?.pivotModelCostId}
					defaultValues={{
						version: templateData?.version,
					}}
					slug={templateData?.slug}
				/>
				<SubmitButton size="sm" isLoading={isSaving} onClick={save}>
					Save
				</SubmitButton>
			</div>
		</div>
	);
}
