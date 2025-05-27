import { useLaborCostModal } from "@/hooks/use-labor-cost-modal";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";

export function LaborCostSetting({}) {
    const { setParams } = useLaborCostModal();

    return (
        <div>
            <Button
                onClick={(e) => {
                    setParams({ laborCostModal: true });
                }}
                className=""
                variant="outline"
                size="icon"
            >
                <Icons.settings2 className="size-4" />
            </Button>
        </div>
    );
}
