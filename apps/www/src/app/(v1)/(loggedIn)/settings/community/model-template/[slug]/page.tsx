import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { Metadata } from "next";
import ModelForm from "../../_components/model-form/model-form";
import { getHomeTemplate } from "../../_components/home-template";

export const metadata: Metadata = {
    title: "Edit Model Template",
};

export default async function ModelTemplatePage({ params }) {
    const response = await getHomeTemplate(params.slug);
    console.log(response);
    return (
        <AuthGuard can={["editProject"]}>
            <DataPageShell
                data={{
                    community: false,
                    ...response,
                }}
                className="space-y-4 px-8"
            >
                <Breadcrumbs>
                    <BreadLink isFirst title="Settings" />
                    <BreadLink title="Community" />
                    <BreadLink
                        link="/settings/community/model-templates"
                        title="Model Templates"
                    />
                    <BreadLink title={response.modelName as any} isLast />
                </Breadcrumbs>

                <ModelForm data={response as any} />
            </DataPageShell>
        </AuthGuard>
    );
}
