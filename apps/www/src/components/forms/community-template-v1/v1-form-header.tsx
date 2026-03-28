"use client";

import { useCommunityTemplateV1 } from "./context";
import { Button, buttonVariants } from "@gnd/ui/button";
import { SubmitButton } from "@gnd/ui/submit-button";
import { ModelTemplateSetting } from "@/components/model-template-setting";
import { InstallCostBtn } from "@/components/install-cost-btn";
import { openLink } from "@/lib/open-link";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import { Eye } from "lucide-react";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { GoBack } from "@/components/go-back";

export function V1FormHeader() {
    const { templateData, isSaving, save } = useCommunityTemplateV1();

    return (
        <div className="space-y-2">
            <PageTitle>{templateData?.modelName}</PageTitle>
            <GoBack href="/community/templates" />
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
                    <Eye className="size-4" />
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
                <InstallCostBtn
                    templateEditMode
                    id={templateData?.id!}
                />
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
