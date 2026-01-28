import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";

interface Props {
    id: number;
}

export function InstallCostBtn({ id }: Props) {
    const { setParams } = useCommunityInstallCostParams();

    return (
        <Button
            variant="outline"
            onClick={() => {
                setParams({
                    editCommunityModelInstallCostId: id,
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

