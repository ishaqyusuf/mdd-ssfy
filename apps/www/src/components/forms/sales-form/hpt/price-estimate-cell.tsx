import { LineInput } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { Menu } from "@/components/(clean-code)/menu";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import Money from "@/components/_v1/money";
import { Label } from "@gnd/ui/label";
import { useHpt, useHptLine } from "../context";

export function PriceEstimateCell({}) {
    const ctx = useHpt();
    const line = useHptLine();
    const { size, zDoor, lineUid, valueChanged } = line;
    return (
        <Menu
            noSize
            Icon={null}
            triggerSize="xs"
            label={<Money value={zDoor?.pricing?.unitPrice} />}
        >
            <div className="min-w-[300px] p-2">
                <div>
                    <Label>Price Summary</Label>
                </div>
                <dl>
                    {ctx.pricedSteps?.map((step) => (
                        <DataLine
                            size="sm"
                            key={step.title}
                            label={step.title}
                            value={
                                <div className="flex items-center justify-end gap-4">
                                    <span>{step.value}</span>
                                    <MoneyBadge>{step.price}</MoneyBadge>
                                </div>
                            }
                        />
                    ))}
                    <DataLine
                        size="sm"
                        label="Door"
                        value={
                            <div className="flex items-center justify-end gap-4">
                                <span>{`${size?.size}`}</span>
                                <MoneyBadge>
                                    {zDoor?.pricing?.itemPrice?.salesPrice}
                                </MoneyBadge>
                            </div>
                        }
                    />
                    <DataLine
                        size="sm"
                        label="Addon Price"
                        value={
                            <LineInput
                                className="w-28"
                                cls={ctx.hpt}
                                name="pricing.addon"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={valueChanged}
                            />
                        }
                    />
                    <DataLine
                        size="sm"
                        label="Custom Price"
                        value={
                            <LineInput
                                className="w-28"
                                cls={ctx.hpt}
                                name="pricing.customPrice"
                                lineUid={lineUid}
                                type="number"
                                valueChanged={valueChanged}
                            />
                        }
                    />
                </dl>
            </div>
        </Menu>
    );
}
