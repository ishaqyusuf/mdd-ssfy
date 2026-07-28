import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenCustomerServiceSheet() {
    const { setParams } = useCustomerServiceParams();

    return (
        <div>
            <Button
                onClick={() =>
                    setParams({
                        openCustomerServiceId: -1,
                    })
                }
            >
                <Icons.Add />
                <span>New</span>
            </Button>
        </div>
    );
}

