import { SubmitButton } from "@gnd/ui/submit-button";
import { ModelTemplateSetting } from "./model-template-setting";
import { InstallCostBtn } from "./install-cost-btn";

interface Props {
    id: number;
    pivotModelCostId?;
    version?: string;
    slug?: string;
    isSaving?: boolean;
    save?;
}

export function CommunityTemplateActions(props: Props) {
    const { id, pivotModelCostId, version, slug, isSaving, save } = props;
    return (
        <>
            <InstallCostBtn id={id!} />
            <SubmitButton size="sm" isLoading={isSaving} onClick={save}>
                Save
            </SubmitButton>
            <ModelTemplateSetting
                pivotModelCostId={pivotModelCostId}
                id={id!}
                defaultValues={{
                    version,
                }}
                slug={slug}
            />
        </>
    );
}

