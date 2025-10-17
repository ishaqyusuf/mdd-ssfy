"use client";

import { useEffect } from "react";
import { closeModal } from "@/lib/modal";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { ModalName } from "@/store/slicers";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@gnd/ui/sheet";

export interface BaseModalProps<T> {
    onOpen?(data: T);
    onClose?();
    modalName: ModalName;
    Title?({ data }: { data?: T });
    Description?({ data }: { data?: T });
    Content?({ data }: { data?: T });
    Footer?({ data }: { data?: T });
    className?;
    side?;
    noFooter?: Boolean;
}
export default function BaseSheet<T>({
    onOpen,
    onClose,
    modalName,
    Title,
    Content,
    Footer,
    Description,
    className,
    side = "right",
    noFooter,
}: BaseModalProps<T>) {
    const modal = useAppSelector((state) => state.slicers?.modal);
    //   const open =
    useEffect(() => {
        if (modal?.name == modalName) {
            onOpen && onOpen(modal?.data);
        }
    }, [modal, modalName]);
    return (
        <Sheet
            onOpenChange={(e) => {
                if (!e) {
                    onClose?.();
                    closeModal(modalName);
                }
            }}
            open={modal?.name == modalName}
        >
            <SheetContent side={side} className={cn(className)}>
                <SheetHeader>
                    <SheetTitle>
                        {Title && <Title data={modal?.data} />}
                    </SheetTitle>
                    <SheetDescription>
                        {Description && <Description data={modal?.data} />}
                    </SheetDescription>
                </SheetHeader>
                {Content && <Content data={modal?.data} />}
                {!noFooter && (
                    <SheetFooter>
                        {Footer && <Footer data={modal?.data} />}
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}
