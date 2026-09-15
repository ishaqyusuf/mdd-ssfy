import { calculateMouldingQuantity, parseMouldingPieceLength } from "@gnd/sales/sales-form-core";
import { useZodForm } from "@/hooks/use-zod-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Dialog, Field, InputGroup } from "@gnd/ui/namespace";
import { Slider } from "@gnd/ui/slider";
import { Fragment, useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import z from "zod";
import { AnimatedNumber } from "./animated-number";
import { ButtonGroup, ButtonGroupSeparator } from "@gnd/ui/button-group";
import { Icons } from "@gnd/ui/icons";

const calculationSchema = z.object({
    linearFeet: z.number().finite().positive(),
    pieceLength: z.number().finite().positive(),
    wastePercentage: z.number().finite().min(0).max(100).optional(),
});

type SavedCalculation = z.infer<typeof calculationSchema>;

interface Props {
    title: string;
    unitLF?: number;
    unitPrice?: number;
    wastePercentage?: number;
    longFoot?: number;
    qty?: number;
    calculation?: SavedCalculation;
    onCalculate?: (qty: number, calculation?: SavedCalculation) => void;
}
export function MouldingCalculator(props: Props) {
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
                wastePercentage: props.calculation?.wastePercentage ?? props.wastePercentage ?? 0,
                longFoot: props.calculation?.linearFeet ?? props.longFoot,
                unitLF: props.calculation?.pieceLength ?? (props.unitLF || Number(parseMouldingPieceLength(props.title) ?? getMouldingLength(props.title))),
                qty: props.qty,
                totalPrice: props.unitPrice,
            },
        },
    );
    const [opened, setOpened] = useState(false);
    const data = form.watch();
    useEffect(() => {
        if (opened) return;
        form.reset({
            unitPrice: props.unitPrice,
            wastePercentage: props.calculation?.wastePercentage ?? props.wastePercentage ?? 0,
            longFoot: props.calculation?.linearFeet ?? props.longFoot,
            unitLF: props.calculation?.pieceLength ?? (props.unitLF || Number(parseMouldingPieceLength(props.title) ?? getMouldingLength(props.title))),
            qty: props.qty,
            totalPrice: props.unitPrice,
        });
    }, [
        opened,
        props.calculation?.linearFeet,
        props.calculation?.pieceLength,
        props.calculation?.wastePercentage,
        props.longFoot,
        props.qty,
        props.title,
        props.unitLF,
        props.unitPrice,
        props.wastePercentage,
    ]);
    useEffect(() => {
        if (!opened) return;
        const result = calculateMouldingQuantity({
            linearFeet: data.longFoot ?? 0,
            pieceLength: data.unitLF,
            wastePercentage: data.wastePercentage,
            unitPrice: data.unitPrice,
        });
        form.setValue("qty", result.pieces);
        form.setValue("totalPrice", result.totalCost);
    }, [
        data.longFoot,
        data.wastePercentage,
        data.unitLF,
        data.unitPrice,
        opened,
    ]);
    const pricePerLF =
        data.unitLF && data.unitPrice ? data.unitPrice / data.unitLF : 0;
    const currentCalculation = calculationSchema.safeParse({
        linearFeet: data.longFoot,
        pieceLength: data.unitLF,
        wastePercentage: data.wastePercentage,
    });
    const savedCalculation = calculationSchema.safeParse(props.calculation);
    const savedPieces = savedCalculation.success
        ? calculateMouldingQuantity(savedCalculation.data).pieces
        : undefined;
    const quantityOverridden = savedPieces !== undefined &&
        props.qty !== undefined && savedPieces !== props.qty;
    const calculatorTitle = savedCalculation.success
        ? `Saved calculation: ${savedCalculation.data.linearFeet} ft + ${savedCalculation.data.wastePercentage ?? 0}% waste → ${savedPieces} pieces${quantityOverridden ? "; quantity manually adjusted" : ""}`
        : "Open Calculator";
    return (
        <Dialog open={opened} onOpenChange={setOpened}>
            <Dialog.Trigger asChild>
                <Button
                    type="button"
                    className={savedCalculation.success ? "text-blue-600 dark:text-blue-400" : ""}
                    size="icon-sm"
                    variant="secondary"
                    title={calculatorTitle}
                    aria-label={calculatorTitle}
                >
                    <Icons.Calculator className="" />
                </Button>
            </Dialog.Trigger>
            <Dialog.Content
                className="max-h-[90vh] w-[min(94vw,560px)] overflow-y-auto"
                onPointerDownOutside={() => setOpened(false)}
            >
                <Dialog.Header className="relative pr-8">
                    <Dialog.Title>Moulding Calculator</Dialog.Title>
                    <Dialog.Description className="">
                        {props.title}
                    </Dialog.Description>
                    <Dialog.Close asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            aria-label="Close calculator"
                        >
                            <Icons.Close className="" />
                        </Button>
                    </Dialog.Close>
                </Dialog.Header>
                <form onSubmit={(event) => event.preventDefault()}>
                    <div className="grid gap-4">
                        {quantityOverridden && (
                            <div className="rounded-md border p-3 text-sm" role="status">
                                <p className="font-medium">Quantity manually adjusted</p>
                                <p>Saved calculated quantity: {savedPieces} pieces</p>
                                <p>Current order quantity: {props.qty} pieces</p>
                                <p className="text-muted-foreground">Apply will replace the current order quantity with the calculation below.</p>
                            </div>
                        )}
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
                                                        value={Number.isFinite(field.value) ? field.value : ""}
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
                                        render={() => (
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
                                                        value={pricePerLF.toFixed(
                                                            2,
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
                                                        <Icons.Trash2
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
                                    <Icons.CheckCircle2
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
                <Dialog.Footer className="">
                    {/* Footer */}
                    <div className="gap-1 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            className="mb-2 w-full"
                            onClick={() => setOpened(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={!currentCalculation.success}
                            onClick={() => {
                                if (!currentCalculation.success) return;
                                const calculation = currentCalculation.data;
                                props.onCalculate?.(
                                    calculateMouldingQuantity(calculation).pieces,
                                    calculation,
                                );
                                setOpened(false);
                            }}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Icons.CheckCircle2 size={20} />
                            Apply to Invoice
                        </Button>
                        <p className="text-center text-[11px] text-muted-foreground mt-4">
                            Calculated pieces will be applied to your line item
                            quantity.
                        </p>
                    </div>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}

function getMouldingLength(title: string) {
    if (!title) return 0;
    //title examples: "FLAT BOARD (5-1/4 X 9/16 X 16) PRIMED FJ S4S 1 X 6", "baseboard wm713 3-1/4 x 9/16 x 16 fj pine primed", "CASING WM316 11/16 X 2-1/4 X 7'"
    const dims = title?.toLocaleLowerCase().match(/\(([^)]+)\)/);
    if (!dims) return null;

    const parts = dims[1].split(/\s*X\s*/i);
    const r = parts[2]?.replace(/['"]/g, "").trim() ?? null;
    return r;
    // const regex = /x\s*([^)]+)/i;
    // const match = title?.toLocaleLowerCase().match(regex);
    // if (match && match[1]) {
    //     const r = parseFloat(match[1]);
    //     return r;
    // }
    // return 0;
}
