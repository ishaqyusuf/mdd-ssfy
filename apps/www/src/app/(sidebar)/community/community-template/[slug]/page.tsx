import AuthGuard from "@/app-deps/(v2)/(loggedIn)/_components/auth-guard";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";

import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { transformCommunityTemplate } from "@/lib/community/community-template";
import { Metadata } from "next";

import { getCommunityTemplate } from "@/app-deps/(v1)/(loggedIn)/settings/community/_components/home-template";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { InstallCostSidebar } from "@/components/install-cost-sidebar";
import ModelForm from "@/app-deps/(v1)/(loggedIn)/settings/community/_components/model-form/model-form";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Edit Community Template",
};

export default async function Page(props) {
    const params = await props.params;
    return redirect(`/community/community-template/${params.slug}/v1`);
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
                className="space-y-4 p-8"
            >
                <PageTitle>{response?.modelName}</PageTitle>

                <ModelForm
                    title={
                        <div className="">
                            <span>Edit Community Model</span>
                        </div>
                    }
                    data={response as any}
                />
            </DataPageShell>
            <InstallCostSidebar />
        </AuthGuard>
    );
}

