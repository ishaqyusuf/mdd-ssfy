import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenJobSheet() {
    const { setParams } = useJobFormParams();
    return (
        <div>
            <Button
                variant="outline"
                size="icon"
                onClick={() =>
                    setParams({
                        step: 1,
                    })
                }
            >
                <Icons.Add />
            </Button>
        </div>
    );
}

