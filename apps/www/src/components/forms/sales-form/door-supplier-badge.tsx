import { useStepContext } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/components-section/ctx";
import { useTRPC } from "@/trpc/client";
import { Menu } from "@gnd/ui/custom/menu";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
    BadgeDollarSign,
    CheckCheckIcon,
    CheckSquare,
    Factory,
    Square,
    Star,
} from "lucide-react";
import { Suspense } from "react";

export function DoorSupplierBadge({ itemStepUid }) {
    return (
        <Suspense fallback={<Skeleton className="w-24 h-8" />}>
            <Content itemStepUid={itemStepUid} />
        </Suspense>
    );
}
export function Content({ itemStepUid }) {
    const ctx = useStepContext(itemStepUid);
    const isDoor = ctx.cls.isDoor();
    const door = ctx.cls?.getDoorStepForm2();
    const supplier = door?.form?.formStepMeta;
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.sales.getSuppliers.queryOptions({}));
    const select = (uid?, name?) => {
        ctx.cls.setDoorSupplier(door.itemStepUid, {
            uid,
            name,
        });
    };
    return (
        <>
            <Menu
                Icon={Factory}
                label={
                    <span>
                        Supplier: {supplier?.supplierName || "GND MILLWORK"}
                    </span>
                }
            >
                <Menu.Item Icon={Star}>Best Price</Menu.Item>
                <Menu.Item
                    onClick={(e) => select()}
                    Icon={!supplier?.supplierUid ? CheckSquare : Square}
                >
                    GND MILLWORK
                </Menu.Item>
                {data?.stepProducts?.map((s) => (
                    <Menu.Item
                        onClick={(e) => select(s.uid, s.name)}
                        Icon={
                            supplier?.supplierUid == s?.uid
                                ? CheckSquare
                                : Square
                        }
                        key={s.id}
                    >
                        {s.name}
                    </Menu.Item>
                ))}
            </Menu>
            {/* {!supplier?.supplierUid || (
                <div className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">Supplier:</span>
                    <Label>{supplier?.supplierName}</Label>
                </div>
            )} */}
        </>
    );
}

