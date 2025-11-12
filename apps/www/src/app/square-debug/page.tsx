import { Label } from "@gnd/ui/label";
import { getSquareDevicesAction } from "./action";
import { Item } from "@gnd/ui/composite";
import { Action } from "./client";

export default async function Page({}) {
    const devices = await getSquareDevicesAction();

    return (
        <div>
            <Label>Devices</Label>

            <div>
                {devices?.terminals?.map((term, tid) => (
                    <Item
                        key={tid}
                        variant={
                            term.status === "AVAILABLE" ? "default" : "outline"
                        }
                    >
                        <Item.Content className="flex gap-2 flex-row">
                            <Item.Title>{term?.label}</Item.Title>
                            <Item.Description>{term?.status}</Item.Description>
                            <Item.Actions>
                                <Action deviceId={term.value} />
                            </Item.Actions>
                        </Item.Content>
                    </Item>
                ))}
            </div>
            {JSON.stringify(devices.errors)}
        </div>
    );
}

