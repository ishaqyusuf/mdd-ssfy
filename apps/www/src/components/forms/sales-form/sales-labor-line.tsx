import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@gnd/ui/cn";
import { Label } from "@gnd/ui/label";
import { SuperAdminGuard } from "@/components/auth-guard";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import Button from "@/components/common/button";
import { useLaborCostModal } from "@/hooks/use-labor-cost-modal";
import { useEffect, useMemo } from "react";
import { SettingsClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";

export function SalesLaborLine({}) {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const { setParams, params } = useLaborCostModal();
    const setting = useMemo(() => new SettingsClass(), []);

    useEffect(() => {
        if (params?.costUpdate) {
            zus.dotUpdate("metaData.laborConfig", params.costUpdate);
            zus.dotUpdate("metaData.salesLaborConfig", params.costUpdate);

            setting.calculateTotalPrice();

            setParams(null);
        }
    }, [params.costUpdate]);
    return (
        <LineContainer
            label={
                <div className="text-sm">
                    <span>Labor Cost ({md?.laborConfig?.rate}$)</span>
                </div>
            }
        >
            <div className="text-right items-center flex gap-2">
                <AnimatedNumber value={md?.extraCosts?.Labor?.amount || 0} />
                <SuperAdminGuard>
                    <Button
                        onClick={(e) => {
                            setParams({ laborCostModal: true });
                        }}
                        className="border-b h-6"
                        variant="link"
                        size="xs"
                    >
                        <span>edit</span>
                    </Button>
                </SuperAdminGuard>
            </div>
        </LineContainer>
    );
}
function LineContainer({ label, lg = false, className = "", children }) {
    return (
        <div
            className={cn(
                "items-center gap-4 font-mono uppercase",
                label && "grid grid-cols-5",
            )}
        >
            <div className="col-span-3 flex justify-end text-black/70 dark:text-muted-foreground">
                {!label ||
                    (typeof label === "string" ? (
                        <Label className="">{label}:</Label>
                    ) : (
                        label
                    ))}
            </div>
            <div className={cn(lg && "col-span-2", "flex flex-1")}>
                {children}
            </div>
        </div>
    );
}
