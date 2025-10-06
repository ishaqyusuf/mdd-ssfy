import { Menu } from "@/components/(clean-code)/menu";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { DataSkeleton } from "@/components/data-skeleton";
import { useSalesDeliveryUpdate } from "@/hooks/use-sales-delivery-update";
import { useTRPC } from "@/trpc/client";
import { DeliveryOption as DispatchOption } from "@/types/sales";
import { salesDeliveryMode } from "@gnd/utils/constants";
import { useQuery } from "@gnd/ui/tanstack";

export function DeliveryOption({ salesId }) {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.dispatch.salesDeliveryInfo.queryOptions(
            {
                salesId,
            },
            {
                enabled: !!salesId,
            },
        ),
    );
    const dispatch = data?.deliveries?.[0];
    const delivery = useSalesDeliveryUpdate({
        salesId,
        defaultOption: data?.deliveryOption,
        deliveryId: dispatch?.id,
    });

    const handleUpdate = (payload) => {
        delivery.update({
            ...payload,
        });
    };
    const mode: DispatchOption = (dispatch?.deliveryMode ||
        data?.deliveryOption) as any;
    return (
        <DataSkeleton className="font-medium" placeholder="Standard">
            <Menu
                Icon={null}
                variant="secondary"
                label={<p className="font-medium uppercase">{mode}</p>}
            >
                {salesDeliveryMode.map((d) => (
                    <Menu.Item
                        onClick={(e) => {
                            handleUpdate({
                                option: d,
                            });
                        }}
                        className="capitalize"
                        key={d}
                    >
                        {d}
                    </Menu.Item>
                ))}
            </Menu>
            <DatePicker
                placeholder={
                    mode == "delivery" ? `Delivery Date` : "Pickup Date"
                }
                hideIcon
                value={dispatch?.dueDate}
                onSelect={(e) => {
                    handleUpdate({
                        date: e,
                    });
                }}
                variant="secondary"
                className="w-auto"
            />
        </DataSkeleton>
    );
}

