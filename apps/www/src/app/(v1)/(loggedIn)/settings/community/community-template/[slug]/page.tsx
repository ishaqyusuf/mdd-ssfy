import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { transformCommunityTemplate } from "@/lib/community/community-template";
import { Metadata } from "next";
import ModelForm from "../../_components/model-form/model-form";
import { getCommunityTemplate } from "../../_components/home-template";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Edit Community Template",
};

export default async function CommunityModelTemplatePage(props) {
    const params = await props.params;
    const response: any = await getCommunityTemplate(params.slug);

    if (response.meta?.design) {
        response.meta.design = transformCommunityTemplate(response.meta.design);
    }
    return (
        <AuthGuard can={["editProject"]}>
            <DataPageShell
                data={{
                    community: true,
                }}
                className="space-y-4 px-8"
            >
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink title="Community" />
                    <BreadLink
                        link="/settings/community/community-templates"
                        title="Community Templates"
                    />
                    <BreadLink title={response.modelName} isLast />
                </Breadcrumbs>

                <ModelForm
                    title={
                        <div className="">
                            <span>Edit Community Model</span>
                        </div>
                    }
                    data={response as any}
                />
            </DataPageShell>
        </AuthGuard>
    );
}

