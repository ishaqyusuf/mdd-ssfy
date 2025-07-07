"use client";

import { useEffect } from "react";
import { closeModal } from "@/lib/modal";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { ModalName } from "@/store/slicers";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

//@ts-ignore
type Comp<T, FormType> = { data?: T; form?: UseFormReturn<FormType> };

export interface BaseModalProps<T, FormType> {
    //@ts-ignore
    onOpen?(data: T, form?: UseFormReturn<FormType>);
    onClose?();
    modalName: ModalName | string;
    Title?(props: Comp<T, FormType>);
    Subtitle?(props: Comp<T, FormType>);
    Content?(props: Comp<T, FormType>);
    Footer?(props: Comp<T, FormType>);
    className?;
    defaultValues?;
    useForm?: boolean;
    noFooter?: boolean;
}
function BaseModal<T, FormType = undefined>({
    onOpen,
    onClose,
    modalName,
    Title,
    Subtitle,
    Content,
    Footer,
    useForm: _useForm,
    className,
    noFooter,
    defaultValues,
}: BaseModalProps<T, FormType>) {
    const modal = useAppSelector((state) => state.slicers?.modal);
    //   const open =
    useEffect(() => {
        if (modal?.name == modalName) {
            onOpen && onOpen(modal?.data, form);
        }
    }, [modal, modalName]);
    const form: any = null;
    let Container = ({ children, ...props }: any) =>
        _useForm ? (
            <FormProvider {...(props as any)}>{children}</FormProvider>
        ) : (
            <>{children}</>
        );
    return (
        <Dialog
            onOpenChange={(e) => {
                console.log(e);
                if (!e) {
                    onClose?.();
                    closeModal(modalName);
                }
            }}
            open={modal?.name == modalName}
        >
            <Container {...form}>
                <DialogContent className={cn(className)}>
                    <DialogHeader>
                        <DialogTitle>
                            {Title && <Title data={modal?.data} />}
                        </DialogTitle>
                        <DialogDescription>
                            {Subtitle && <Subtitle data={modal?.data} />}
                        </DialogDescription>
                    </DialogHeader>
                    {Content && <Content data={modal?.data} />}
                    {!noFooter && (
                        <DialogFooter>
                            {Footer && <Footer data={modal?.data} />}
                        </DialogFooter>
                    )}
                </DialogContent>
            </Container>
        </Dialog>
    );
}

// BaseModal.Btn = ({}) => {
//     return <></>
// }
export default BaseModal;
