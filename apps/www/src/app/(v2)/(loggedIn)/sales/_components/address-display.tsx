import { Icons } from "@/components/_v1/icons";
import { ICustomer } from "@/types/customers";
import { IAddressBook } from "@/types/sales";

import { Label } from "@gnd/ui/label";

interface Props {
    type: "shipping" | "billing";
    address: IAddressBook;
    customer?: ICustomer;
}
export default function AddressDisplay({
    type = "billing",
    address,
    customer,
}) {
    function Display({ Icon, children }: { Icon?; children? }) {
        return (
            <div className="flex space-x-2 uppercase">
                {Icon && <Icon className="h-4 w-4" />}
                <span className="leading-tight">{children}</span>
            </div>
        );
    }
    return (
        <div className="space-y-4">
            <Label className="capitalize">{type} Address</Label>
            <div className="space-y-2">
                <Display Icon={Icons.user}>
                    {customer?.businessName || address?.name}
                </Display>
                <Display Icon={Icons.phone}>
                    {address?.phoneNo || customer?.phoneNo}
                </Display>
                <Display Icon={Icons.address}>
                    {address?.address1}
                    {address?.address1 && <br />}
                    {[address?.city, address?.state, address?.meta?.zip_code]
                        .filter(Boolean)
                        .join(", ")}
                </Display>
            </div>
        </div>
    );
}
