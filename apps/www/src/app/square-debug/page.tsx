import { Label } from "@gnd/ui/label";
import { getSquareDevicesAction } from "./action";
import { Item } from "@gnd/ui/composite";
import { Action } from "./client";
import { squareClient } from "@gnd/square";
import { consoleLog } from "@gnd/utils";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { Separator } from "@gnd/ui/separator";
import { DeviceCodes } from "./device-codes";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Square Debug | GND",
    });
}
export default async function Page({}) {
    const devices = await getSquareDevicesAction();
    // const merchants = await squareClient.merchants.list({});
    const deviceCodes = await squareClient.devices.codes.list({});

    // consoleLog("MERCHANTS", merchants.data);
    consoleLog("DEVICES CODES:", deviceCodes.data?.length);

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
            <Separator />
            <DeviceCodes />
        </div>
    );
}

