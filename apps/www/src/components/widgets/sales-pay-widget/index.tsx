import { Menu } from "@/components/(clean-code)/menu";
import { salesPaymentMethods } from "@/utils/constants";
import { Icons } from "@gnd/ui/custom/icons";

interface Props {
    label?;
    className?: string;
}
export function SalesPayWidget(props: Props) {
    return (
        <>
            <Menu
                variant="default"
                label={props?.label || "Pay"}
                Icon={Icons.payment}
            >
                {salesPaymentMethods.map((method) => (
                    <Menu.Item>{method.label}</Menu.Item>
                ))}
            </Menu>
        </>
    );
}

