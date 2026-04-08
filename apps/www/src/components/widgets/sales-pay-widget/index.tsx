import { Menu } from "@gnd/ui/custom/menu";
import { salesPaymentMethods } from "@/utils/constants";
import { Icons } from "@gnd/ui/icons";

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
                Icon={Icons.Payment}
            >
                {salesPaymentMethods.map((method) => (
                    <Menu.Item>{method.label}</Menu.Item>
                ))}
            </Menu>
        </>
    );
}

