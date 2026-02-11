import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenJobSheet() {
    const { setParams } = useJobParams();

    return (
        <div>
            <Button variant="outline" size="icon" onClick={() => setParams({})}>
                <Icons.Add />
            </Button>
        </div>
    );
}

