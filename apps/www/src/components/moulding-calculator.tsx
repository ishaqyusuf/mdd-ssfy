import { useZodForm } from "@/hooks/use-zod-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { AlertDialog, Field, InputGroup } from "@gnd/ui/composite";
import { Slider } from "@gnd/ui/slider";
import { Calculator, CheckCircle2, Trash2 } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import z from "zod";
import { AnimatedNumber } from "./animated-number";
import { ButtonGroup, ButtonGroupSeparator } from "@gnd/ui/button-group";
import { Icons } from "@gnd/ui/icons";

interface Props {
    title: string;
    unitLF?: number;
    unitPrice?: number;
    wastePercentage?: number;
    longFoot?: number;
    qty?: number;
    onCalculate?: (price, wastePercentage) => void;
}
export function MouldingCalculator(props: Props) {
    console.log(props);
    const form = useZodForm(
        z.object({
            unitPrice: z.number().min(0).optional(),
            wastePercentage: z.number().min(0).max(100).optional(),
            longFoot: z.number().min(0).optional(),
            unitLF: z.number().min(0),
            qty: z.number().min(0).optional(),
            totalPrice: z.number().min(0).optional(),
        }),
        {
            defaultValues: {
                unitPrice: props.unitPrice,
                wastePercentage: props.wastePercentage,
                longFoot: props.longFoot,
                unitLF: props.unitLF || Number(getMouldingLength(props.title)),
                qty: props.qty,
                totalPrice: props.unitPrice,
            },
        },
    );
    const [opened, setOpened] = useState(false);
    const data = form.watch();
    useEffect(() => {
        if (!opened) return;
        // qty = longFoot / unitLF * (1 + wastePercentage/100)
        const qty =
            data.longFoot && data.unitLF
                ? (data.longFoot / data.unitLF) *
                  (1 + (data.wastePercentage || 0) / 100)
                : 0;
        const roundQty = Math.ceil(qty);
        form.setValue("qty", roundQty);
        const totalPrice =
            data.unitPrice && roundQty ? data.unitPrice * roundQty : 0;
        // 2 decimal places toatl price
        const tPrice = Math.round(totalPrice * 100) / 100;
        form.setValue("totalPrice", tPrice);

        // const length = data.length || 1;
        // const wasteFactor = 1 + (data.wastePercentage || 0) / 100;
        // const qty =
        //     data.price && length ? (data.price / length) * wasteFactor : 0;
        // form.setValue("quantity", Math.round(qty * 100) / 100);
        // props.onCalculate?.(data.price, data.wastePercentage);
    }, [
        data.longFoot,
        data.wastePercentage,
        data.unitLF,
        data.unitPrice,
        opened,
    ]);
    //   const calculatedBaseLF = data.quantity// parseFloat(budget) / pricePerLF;
    const totalPieces = data.qty || 0;
    const totalFootage = data.longFoot;
    const pricePerLF =
        data.longFoot && data.unitPrice ? data.longFoot / data.unitPrice : 0;
    const calculatedBaseLF = pricePerLF
        ? (data.totalPrice || 0) / pricePerLF
        : 0;
    return (
        <AlertDialog open={opened} onOpenChange={setOpened}>
            <AlertDialog.Trigger asChild>
                <Button
                    onClick={() => {
                        // handleCalculatorOpen('5-1/4" Crown Moulding')
                    }}
                    className=""
                    size="icon-sm"
                    variant="secondary"
                    title="Open Calculator"
                >
                    <Calculator className="" />
                </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content size="default">
                <AlertDialog.Header className="relative">
                    <AlertDialog.Title>Moulding Calculator</AlertDialog.Title>
                    <AlertDialog.Description className="">
                        {props.title}
                    </AlertDialog.Description>
                    <AlertDialog.Cancel className="absolute right-0 top-0 ">
                        <Icons.Close className="" />
                    </AlertDialog.Cancel>
                </AlertDialog.Header>
                <form>
                    <div className="grid gap-4">
                        {/* Content */}
                        <div className="space-y-8 overflow-y-auto max-h-[70vh]s">
                            {/* Project Needs */}
                            <section className="space-y-4">
                                <Controller
                                    control={form.control}
                                    name="unitLF"
                                    render={({ field }) => (
                                        <Field>
                                            <Field.Label>
                                                Piece Length Selection
                                            </Field.Label>
                                            <ButtonGroup className="w-full">
                                                {["8", "12", "16", "17"].map(
                                                    (len, li) => (
                                                        <Fragment key={len}>
                                                            {li > 0 && (
                                                                <ButtonGroupSeparator />
                                                            )}
                                                            <Button
                                                                type="button"
                                                                className="flex-1"
                                                                key={len}
                                                                onClick={() =>
                                                                    field.onChange(
                                                                        parseFloat(
                                                                            len,
                                                                        ),
                                                                    )
                                                                }
                                                                variant={
                                                                    data.unitLF ===
                                                                    parseFloat(
                                                                        len,
                                                                    )
                                                                        ? "default"
                                                                        : "outline"
                                                                }
                                                            >
                                                                {len}'
                                                            </Button>
                                                        </Fragment>
                                                    ),
                                                )}
                                            </ButtonGroup>
                                        </Field>
                                    )}
                                />
                                <div className="grid gap-4 grid-cols-2">
                                    <Controller
                                        control={form.control}
                                        name="longFoot"
                                        render={({ field }) => (
                                            <Field>
                                                <Field.Label>
                                                    Total LF
                                                </Field.Label>
                                                <InputGroup>
                                                    <InputGroup.Input
                                                        type="number"
                                                        placeholder="0"
                                                        className=""
                                                        value={field.value}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </InputGroup>
                                            </Field>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="unitPrice"
                                        render={({ field }) => (
                                            <Field>
                                                <Field.Label>
                                                    Price per LF (Derived)
                                                </Field.Label>
                                                <InputGroup>
                                                    <InputGroup.Addon>
                                                        $
                                                    </InputGroup.Addon>
                                                    <InputGroup.Input
                                                        disabled
                                                        type="number"
                                                        placeholder="0.00"
                                                        className=""
                                                        defaultValue={String(
                                                            field.value,
                                                        )}
                                                    />
                                                    <InputGroup.Addon
                                                        className="text-xs"
                                                        align="inline-end"
                                                    >
                                                        PER LF
                                                    </InputGroup.Addon>
                                                </InputGroup>
                                            </Field>
                                        )}
                                    />
                                </div>
                                {/* <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm font-bold">
                                        $
                                    </span>
                                    <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">
                                        Project Needs
                                    </h3>
                                </div> */}
                            </section>

                            {/* <div className="flex items-center gap-2">
                                    <Calculator
                                        size={16}
                                        className="text-primary"
                                    />
                                    <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">
                                        Product Specs
                                    </h3>
                                </div> */}

                            {/* Waste Factor */}
                            <section className="">
                                <div className="space-y-4">
                                    <Controller
                                        control={form.control}
                                        name="wastePercentage"
                                        render={({ field }) => (
                                            <Field>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <Trash2
                                                            size={16}
                                                            className="text-primary"
                                                        />
                                                        <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">
                                                            Waste Factor
                                                        </h3>
                                                    </div>
                                                    <Badge className="text-sm font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                                                        {data.wastePercentage}%
                                                    </Badge>
                                                </div>
                                                <Slider
                                                    value={[field.value || 0]}
                                                    onValueChange={(val) =>
                                                        field.onChange(val?.[0])
                                                    }
                                                    min={0}
                                                    max={100}
                                                />
                                            </Field>
                                        )}
                                    />
                                    {/* <input
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                        type="range"
                                        min="0"
                                        max="30"
                                        value={waste}
                                        onChange={(e) =>
                                            setWaste(parseInt(e.target.value))
                                        }
                                    /> */}
                                    <p className="text-[11px] text-muted-foreground leading-normal italic">
                                        * Waste is added to the calculated
                                        footage before determining piece count.
                                    </p>
                                </div>
                            </section>

                            {/* Results */}
                            <section className="bg-muted/30 overflow-hidden rounded-xl p-5 border border-border">
                                <div className="flex items-center gap-2 mb-4">
                                    <CheckCircle2
                                        size={16}
                                        className="text-primary"
                                    />
                                    <h3 className="text-foreground text-sm font-bold uppercase tracking-wide">
                                        Results
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                            Total Pieces
                                        </span>
                                        <span className="text-3xl font-bold text-foreground">
                                            <AnimatedNumber
                                                currency="number"
                                                value={data.qty || 0}
                                            />
                                            {/* {data.quantity || 0}{" "} */}
                                        </span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                            Total Cost
                                        </span>
                                        <span className="text-3xl font-bold text-foreground">
                                            <AnimatedNumber
                                                value={data.totalPrice || 0}
                                            />
                                            {"  "}
                                            {/* <span className="text-sm font-normal text-muted-foreground">
                                                LF
                                            </span> */}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-border">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-muted-foreground">
                                            {/* Budget (${data.price?.toFixed(1)}) ÷
                                            {data.length}
                                            /LF */}
                                        </span>
                                        <span className="text-muted-foreground font-medium">
                                            {/* {calculatedBaseLF.toFixed(1)} LF
                                            Base + {data.wastePercentage}% Waste */}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </form>
                <AlertDialog.Footer className="">
                    {/* Footer */}
                    <div className="gap-1 w-full">
                        <Button
                            onClick={() => {
                                // props.onCalculate(
                                //     data.price,
                                //     data.wastePercentage,
                                // );
                            }}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={20} />
                            Apply to Invoice
                        </Button>
                        <p className="text-center text-[11px] text-muted-foreground mt-4">
                            Calculated pieces will be applied to your line item
                            quantity.
                        </p>
                    </div>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog>
    );
}

function getMouldingLength(title: string) {
    if (!title) return 0;
    //title examples: "FLAT BOARD (5-1/4 X 9/16 X 16) PRIMED FJ S4S 1 X 6", "baseboard wm713 3-1/4 x 9/16 x 16 fj pine primed", "CASING WM316 11/16 X 2-1/4 X 7'"
    const dims = title?.toLocaleLowerCase().match(/\(([^)]+)\)/);
    if (!dims) return null;

    const parts = dims[1].split(/\s*X\s*/i);
    const r = parts[2]?.replace(/['"]/g, "").trim() ?? null;
    // console.log("Moulding length from dims:", r);
    return r;
    // const regex = /x\s*([^)]+)/i;
    // const match = title?.toLocaleLowerCase().match(regex);
    // if (match && match[1]) {
    //     const r = parseFloat(match[1]);
    //     console.log("Moulding length parsed:", r);
    //     return r;
    // }
    // return 0;
}

