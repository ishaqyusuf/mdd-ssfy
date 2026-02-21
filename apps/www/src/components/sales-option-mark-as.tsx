import { Menu, useMenuContext } from "@gnd/ui/custom/menu";
interface Props {
    Trigger?: React.ReactNode;
    produceable?: boolean;
}
export function SalesOptionMarkAs(props: Props) {
    const { produceable = false } = props;
    const ctx = useMenuContext();
    return (
        <>
            <Menu.Item
                disabled={!produceable}
                onClick={(e) => {
                    e.preventDefault();
                    // batchSales.markAsProductionCompleted(item.id);
                }}
            >
                Production Complete
            </Menu.Item>
        </>
    );
}

