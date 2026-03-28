"use client";

import { cn } from "@gnd/ui/cn";
import { addSpacesToCamelCase } from "@/lib/utils";
import { DesignInput } from "./design-input";
import { HomeTemplateDesign } from "@/types/community";

type CellSize = "2,10" | "2,4" | "2,1" | "2,6" | "2,2";

interface FieldConfig {
    ck: string;
    label: string;
    cells: number[];
}

interface FormSectionProps {
    section?: string;
    title?: string;
    node: keyof HomeTemplateDesign;
    rows: (
        f: (ck: string, cells?: CellSize, label?: string) => FieldConfig,
        f2: (ck: string, label?: string, cells?: CellSize) => FieldConfig,
    ) => (FieldConfig | FieldConfig[])[];
}

function field(ck: string, cells: CellSize = "2,10", label?: string): FieldConfig {
    return {
        ck,
        label: label || addSpacesToCamelCase(ck),
        cells: cells.split(",").map((c) => Number(c)),
    };
}

function field2(ck: string, label?: string, cells: CellSize = "2,1"): FieldConfig {
    return field(ck, cells, label);
}

function styler<T>(fn: typeof field) {
    return {
        fill: (c: string, label?: string) => fn(c, "2,10", label),
        half: (c: string, label?: string) => fn(c, "2,4", label),
        t3: (c: string, label?: string) => fn(c, "2,6", label),
        o3: (c: string, label?: string) => fn(c, "2,2", label),
    };
}

export function FormSection({ section, title, node, rows }: FormSectionProps) {
    const _rows = rows(field, field2);

    return (
        <div className="space-y-1">
            {section && (
                <div className="bg-muted text-center py-1 font-medium text-sm border rounded-sm">
                    {section}
                </div>
            )}
            {title && _rows.length > 0 && (
                <div className="bg-muted/50 px-4 py-1 text-left font-medium text-sm border rounded-sm">
                    {title}
                </div>
            )}
            {_rows.length > 0 && (
                <div className="space-y-1.5">
                    {_rows.map((row, i) => {
                        if (Array.isArray(row)) {
                            const totalInputCols = row.reduce(
                                (sum, cell) => sum + cell.cells[1],
                                0,
                            );
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "grid gap-2",
                                        row.length === 2 && "grid-cols-2",
                                        row.length === 3 && "grid-cols-3",
                                        row.length === 4 && "grid-cols-4",
                                        "max-md:grid-cols-1",
                                    )}
                                >
                                    {row.map((cell) => (
                                        <DesignInput
                                            key={`${node}.${cell.ck}`}
                                            formKey={`${node}.${cell.ck}`}
                                            label={cell.label}
                                            labelCols={cell.cells[0]}
                                            inputCols={cell.cells[1]}
                                        />
                                    ))}
                                </div>
                            );
                        }
                        return (
                            <DesignInput
                                key={`${node}.${row.ck}`}
                                formKey={`${node}.${row.ck}`}
                                label={row.label}
                                labelCols={row.cells[0]}
                                inputCols={row.cells[1]}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Exported section form components preserving the exact template arrangement

export function ExteriorFrame() {
    return (
        <FormSection
            rows={(f) => [
                [f("material", "2,10")],
                [f("layer", "2,4"), f("bore", "2,4")],
                [f("sixEight", "2,4", "6/8"), f("eightZero", "2,4", "8/0")],
                [f("orientation", "2,4", "Handle"), f("others", "2,4", "Type")],
                [f("sideDoor", "2,10")],
            ]}
            node="entry"
            section="Exterior Door"
        />
    );
}

export function GarageDoorForm() {
    return (
        <FormSection
            rows={(f) => [
                f("type"),
                f("material"),
                f("ph", "2,10", "Garage PH"),
                f("single"),
                f("frame"),
                [f("bore", "2,4"), f("doorHeight", "2,4", "Height")],
                [f("doorSize", "2,4", "Size"), f("orientation", "2,4", "Handle")],
                [f("doorSize1", "2,4", "Size"), f("orientation1", "2,4", "Handle")],
            ]}
            node="garageDoor"
            section="Interior Trim"
            title="Garage Door"
        />
    );
}

export function InteriorDoorForm() {
    return (
        <FormSection
            rows={(f, c) => [
                [f("doorSize1", "2,4", "Size"), f("orientation1", "2,4", "Handle")],
                [f("style", "2,4", "Style"), f("jambSize", "2,4")],
                [f("casingStyle", "2,4"), f("doorType", "2,4")],
                [f("height1", "2,4", "Height"), f("height2", "2,4", "Height")],
                [c("oneSix1Lh", "1/6 LH"), c("oneSix1Rh", "1/6 RH"), c("oneSix2Lh", "1/6 LH"), c("oneSix2Rh", "1/6 RH")],
                [c("two1Lh", "2/0 LH"), c("two1Rh", "2/0 RH"), c("two2Lh", "2/0 LH"), c("two2Rh", "2/0 RH")],
                [c("twoFour1Lh", "2/4 LH"), c("twoFour1Rh", "2/4 RH"), c("twoFour2Lh", "2/4 LH"), c("twoFour2Rh", "2/4 RH")],
                [c("twoSix1Lh", "2/6 LH"), c("twoSix1Rh", "2/6 RH"), c("twoSix2Lh", "2/6 LH"), c("twoSix2Rh", "2/6 RH")],
                [c("twoEight1Lh", "2/8 LH"), c("twoEight1Rh", "2/8 RH"), c("twoEight2Lh", "2/8 LH"), c("twoEight2Rh", "2/8 RH")],
                [c("twoTen1Lh", "2/10 LH"), c("twoTen1Rh", "2/10 RH"), c("twoTen2Lh", "2/10 LH"), c("twoTen2Rh", "2/10 RH")],
                [c("three1Lh", "3/0 LH"), c("three1Rh", "3/0 RH"), c("three2Lh", "3/0 LH"), c("three2Rh", "3/0 RH")],
            ]}
            node="interiorDoor"
            title="Interior Door"
        />
    );
}

export function DoubleDoorForm() {
    return (
        <FormSection
            rows={(f) => [
                [f("sixLh", "2,4", "6/0 LH"), f("sixRh", "2,4", "6/0 RH")],
                [f("fiveEightLh", "2,4", "5/8 LH"), f("fiveEightRh", "2,4", "5/8 LH")],
                [f("fiveFourLh", "2,4", "5/4 LH"), f("fiveFourRh", "2,4", "5/4 RH")],
                [f("fiveLh", "2,4", "5/0 LH"), f("fiveRh", "2,4", "5/0 RH")],
                [f("fourLh", "2,4", "4/0 LH"), f("fourRh", "2,4", "4/0 RH")],
                [f("mirrored", "2,4", "Mirrored Bifold"), f("swingDoor", "2,4")],
                [f("specialDoor", "2,4"), f("others", "2,4", "Bypass")],
                [f("pocketDoor", "2,4"), f("specialDoor2", "2,4", "Others")],
                [f("specialDoor3", "2,4", "Others"), f("specialDoor4", "2,4", "Others")],
            ]}
            node="doubleDoor"
            title="Double Door"
        />
    );
}

export function BifoldDoorForm() {
    return (
        <FormSection
            rows={(f) => {
                const s = styler(f);
                return [
                    f("style"),
                    [s.half("four", "4/0"), s.half("one", "1/0")],
                    [s.half("fourEight", "4/8"), s.half("oneSix", "1/6")],
                    [s.half("five", "5/0"), s.half("oneEight", "1/8")],
                    [s.half("six", "6/0"), s.half("two", "2/0")],
                    [s.half("twoFourLl", "2/4 LL"), s.half("twoFour", "2/4")],
                    [s.half("twoSixLl", "2/6 LL"), s.half("twoSix", "2/6")],
                    [s.half("twoEightLl", "2/8 LL"), s.half("twoEight", "2/8")],
                    [s.half("threeLl", "3/0 LL"), s.half("three", "3/0")],
                    [s.half("palosQty", "Palos")],
                    [f("crown", "2,10")],
                    [s.t3("casing", "Baseboard"), s.o3("qty", "Quantity")],
                    [s.t3("scuttle", "Scuttle Cover"), s.o3("scuttleQty", "Quantity")],
                    [s.t3("casingStyle"), s.o3("casingQty", "Quantity")],
                    [s.t3("bifoldOther1", "Other"), s.o3("bifoldOther1Qty", "Quantity")],
                    [s.t3("bifoldOther2", "Other"), s.o3("bifoldOther2Qty", "Quantity")],
                ];
            }}
            node="bifoldDoor"
            title="Bifold Door"
        />
    );
}

export function LockHardwareForm() {
    return (
        <FormSection
            rows={(f) => {
                const s = styler(f);
                return [
                    s.fill("brand"),
                    [s.half("handleSet"), s.half("doorStop")],
                    [s.half("dummy"), s.half("doorViewer")],
                    [s.half("deadbolt"), s.half("wStripper", "W. Stripper")],
                    [s.half("passage"), s.half("hinges")],
                    [s.half("privacy"), s.half("hookAye", "Hook & Aye")],
                ];
            }}
            node="lockHardware"
            section="Lock & Hardware"
        />
    );
}

export function DecoForm() {
    return (
        <FormSection
            rows={(f) => {
                const s = styler(f);
                return [s.fill("model"), [s.half("size1")], [s.half("size2")]];
            }}
            node="decoShutters"
            section="Deco Shutters"
        />
    );
}

export { styler };
