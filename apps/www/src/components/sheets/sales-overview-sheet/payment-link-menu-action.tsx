import { useZodForm } from "@/hooks/use-zod-form";

import { Menu, useMenuContext } from "@gnd/ui/custom/menu";
import z from "zod";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Button } from "@gnd/ui/button";
import { formatMoney, percentageValue } from "@gnd/utils";
import { Label } from "@gnd/ui/label";
import { InputGroup } from "@gnd/ui/namespace";
import { Send, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { useEffect } from "react";

interface Props {
    salesIds: number[];
}
export function PaymentLinkMenuAction(props: Props) {
    const form = useZodForm(
        z.object({
            amount: z.number(),
            opened: z.boolean(),
            percentage: z.number().optional().nullable(),
            totalAmount: z.number().optional().nullable(),
        }),
        {
            defaultValues: {
                opened: false,
                amount: 0,
                totalAmount: 0,
                percentage: 0,
            },
        },
    );
    const { opened, percentage, totalAmount } = form.watch();
    const { data } = useQuery(
        _trpc.sales.getOrders.queryOptions(
            {
                salesIds: props.salesIds,
            },
            {
                enabled: !!opened,
            },
        ),
    );
    useEffect(() => {}, [data]);
    const { setDisabled } = useMenuContext();
    const openForm = () => {
        form.setValue("opened", true);
        setDisabled(true);
    };
    const closeForm = () => {
        form.setValue("opened", false);
        setDisabled(false);
    };

    if (!opened)
        return (
            <>
                <Menu.Item
                    onClick={(e) => {
                        e.preventDefault();
                        openForm();
                        // mailer.send({
                        //     emailType: "with part payment",
                        //     salesIds: [salesId],
                        //     printType: type,
                        // });
                    }}
                >
                    Part Payment
                </Menu.Item>
            </>
        );
    return (
        <div className="p-2 w-[250px] border-t grid gap-4">
            <Label>Percentage</Label>
            <ButtonGroup>
                {[25, 50, 75].map((a, i) => (
                    <Button
                        onClick={(e) => {
                            form.setValue(
                                "amount",
                                percentageValue(totalAmount, a),
                            );
                            form.setValue("percentage", a);
                        }}
                        key={a}
                        variant={percentage === a ? "destructive" : "outline"}
                        size="sm"
                    >
                        {a} %
                    </Button>
                ))}
            </ButtonGroup>
            <Label>Amount</Label>
            <InputGroup>
                <InputGroup.Input placeholder="Amount" />
                <InputGroup.Addon align="inline-end">
                    /${formatMoney(totalAmount)}
                </InputGroup.Addon>
            </InputGroup>
            <div className="flex">
                <Button
                    onClick={(e) => {
                        closeForm();
                    }}
                    size="icon"
                    variant="destructive"
                >
                    <X className="size-4" />
                </Button>
                <div className="flex-1"></div>
                <Button size="icon" aria-label="Submit">
                    <Send className="size-4" />
                </Button>
            </div>
        </div>
    );
}

