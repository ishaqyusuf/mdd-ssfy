import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

interface Props {
    id: number;
    templateEditMode?: boolean;
}

export function InstallCostBtn({ id, templateEditMode }: Props) {
    const { setParams } = useCommunityInstallCostParams();

    return (
        <Button
            variant="outline"
            onClick={() => {
                setParams({
                    editCommunityModelInstallCostId: id,
                    view: templateEditMode ? "template-edit" : "template-list",
                    // : pivotModelCostId || -1,
                });
            }}
            className="justify-start gap-2"
        >
            <Icons.installation className="size-4" />
            Install Cost
        </Button>
    );
}

