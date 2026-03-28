"use client";

import { CommunityTemplateV1Provider } from "./context";
import { V1FormHeader } from "./v1-form-header";
import { TemplateFormTabs } from "./template-form-tabs";
import { InstallCostResizablePanel } from "./install-cost-resizable-panel";

interface Props {
    slug: string;
}

export function CommunityTemplateV1Form({ slug }: Props) {
    return (
        <CommunityTemplateV1Provider slug={slug}>
            <InstallCostResizablePanel>
                <div className="flex h-full min-h-0 flex-col gap-4">
                    <V1FormHeader />
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <TemplateFormTabs />
                    </div>
                </div>
            </InstallCostResizablePanel>
        </CommunityTemplateV1Provider>
    );
}
