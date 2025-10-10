import { AnimatedNumber } from "@/components/animated-number";
import { _modal } from "@/components/common/modal/provider";
import { cn } from "@/lib/utils";

import { Label } from "@gnd/ui/label";

import { useFormDataStore } from "../_common/_stores/form-data-store";
import { Sticky, useSticky } from "../_hooks/use-sticky";

export function FormFooter() {
    const zus = useFormDataStore();

    const sticky = useSticky((bv, pv, { top, bottom }) => {
        const isFixed = !pv;

        return isFixed;
    }, true);
    const { isFixed, fixedOffset, containerRef } = sticky;

    return (
        <>
            <div
                className="flex flex-col gap-4 pb-16"
                ref={sticky.containerRef}
            >
                <div
                    style={
                        isFixed
                            ? {
                                  left: `${
                                      containerRef?.current?.getBoundingClientRect()
                                          ?.left
                                  }px`,
                                  width: `${
                                      containerRef?.current?.getBoundingClientRect()
                                          ?.width
                                  }px`,
                                  //   right: `${
                                  //       containerRef?.current?.getBoundingClientRect()
                                  //           ?.right
                                  //   }px`,
                              }
                            : {}
                    }
                    className={cn(
                        "flex items-center border-b",
                        isFixed
                            ? "sborder-2 srounded-full bg-backgrounds fixed bottom-0  z-10 h-12  overflow-hidden border-t border-muted-foreground/50 px-4 shadow-xl"
                            : "justify-end border-t",
                    )}
                >
                    <div className="flex h-full flex-1 bg-background">
                        <div className=""></div>
                        <div className="flex-1" />
                        <div
                            className={cn(
                                isFixed
                                    ? "inline-flex gap-4 sm:gap-6"
                                    : "flex min-w-[250px] flex-col gap-4 p-4 sm:gap-6",
                            )}
                        >
                            <FixedDisplay
                                label={"Sub Total"}
                                value={zus.metaData?.pricing?.subTotal}
                            />
                            <FixedDisplay
                                label={"Discount"}
                                value={zus.metaData?.pricing?.discount}
                            />
                            <FixedDisplay
                                label={`${zus.metaData?.tax?.title} (${zus.metaData?.tax?.percentage}%)`}
                                value={zus.metaData?.pricing?.taxValue}
                            />
                            <FixedDisplay
                                label={`C.C.C ${
                                    !zus.metaData?.pricing?.ccc ? "" : "(3%)"
                                }`}
                                value={zus.metaData?.pricing?.ccc}
                            />

                            <FixedDisplay
                                label={"Total"}
                                value={zus.metaData?.pricing?.grandTotal}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
function FixedDisplay({ label, value }) {
    return (
        <div className="inline-flex items-center justify-between gap-1">
            <Label className="font-semibold uppercase text-muted-foreground">
                {label}:
            </Label>
            <div className="font-mono$ text-sm font-semibold">
                <AnimatedNumber value={value || 0} />
                {/* <Money value={value} /> */}
            </div>
        </div>
    );
}
